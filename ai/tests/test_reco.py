"""Tests unitaires du modèle de recommandation (sans LLM : rapides et reproductibles).

    python -m pytest tests -q
"""

import numpy as np
import pandas as pd
import pytest

from reco.config import AXES
from reco.extraction import extraire_mots_cles, valider
from reco.moteur import Modele, correspondance, distance, recommander
from reco.nettoyage import charger_brut, nettoyer_catalogue, nettoyer_formules, normaliser_nom
from reco.preparer import preparer
from reco.profils import profils_formules


@pytest.fixture(scope="module")
def donnees():
    preparer()
    brut = charger_brut()
    ingredients, conflits = nettoyer_catalogue(brut["catalogue"])
    formules, details = nettoyer_formules(brut["formules"], ingredients)
    return ingredients, conflits, formules, details


# ---------- A. Nettoyage ----------

@pytest.mark.parametrize("a, b", [
    ("Iso Raldeine 70", "Isoraldeine 70"),
    ("Musk R-1", "Musk R1"),
    ("METHYL LAITONE 10%/TEC", "Methyl Laitone 10%/DPG"),
    ("Di Hydro Beta Ionone", "Dihydro Ionone Beta"),
    ("OAKMOSS GIVCO 214/3", "Oakmoss Givco 214"),
    ("Pharaone 10% DPG", "PHARAONE 10%/DPG"),
])
def test_noms_ecrits_differemment_ont_la_meme_cle(a, b):
    assert normaliser_nom(a) == normaliser_nom(b)


def test_un_ingredient_une_ligne(donnees):
    ingredients, *_ = donnees
    assert ingredients["cle"].is_unique


def test_conflit_de_famille_resolu_par_le_catalogue_prioritaire(donnees):
    ingredients, conflits, *_ = donnees
    undecavertol = ingredients.set_index("cle").loc["UNDECAVERTOL"]
    assert undecavertol["famille"] == "Vert"  # catalogue ingrédients Givaudan > Givaudan-Roure
    assert any(c["ingredient"] == "Undecavertol" for c in conflits)


def test_chaque_ingredient_de_formule_a_une_famille_ou_est_un_solvant(donnees):
    *_, formules, details = donnees
    assert details["ingredients_sans_famille"] == []
    assert set(formules.loc[formules["source_famille"] == "solvant", "cle"]) <= {"DIPROPYLENEGLYCOL", "TRIETHYLCITRATE"}


def test_un_fabricant_par_ingredient(donnees):
    *_, formules, _ = donnees
    assert (formules.groupby("cle")["fabricant"].nunique() == 1).all()
    assert formules.loc[formules["cle"] == "GALAXOLIDE", "fabricant"].unique().tolist() == ["IFF"]


# ---------- B. Profils ----------

def test_profils_sur_echelle_0_10(donnees):
    *_, formules, _ = donnees
    p = profils_formules(formules)
    assert len(p) == 13
    assert ((p[AXES] >= 0) & (p[AXES] <= 10)).all().all()


def test_profils_coherents_avec_les_noms(donnees):
    *_, formules, _ = donnees
    p = profils_formules(formules).set_index("id_formule")
    assert p["fraicheur"].idxmax() == 4    # Key Lime cream : 50 % d'huile de citron
    assert p["boise"].idxmax() == 12       # Masculine : Iso E Super, cèdre, vétiver
    assert p["chaleur"].idxmax() == 1      # Blueberry muffin : vanilline, maltol


# ---------- C. Lecture du texte ----------

def test_validation_json_llm():
    assert valider('Voici : {"chaleur": 2, "fraicheur": 9, "floral": 3, "boise": 1, "intensite": 4}') == \
        {"chaleur": 2, "fraicheur": 9, "floral": 3, "boise": 1, "intensite": 4}
    with pytest.raises(ValueError):
        valider('{"chaleur": 12, "fraicheur": 9, "floral": 3, "boise": 1, "intensite": 4}')
    with pytest.raises(KeyError):
        valider('{"chaleur": 2}')


def test_mots_cles():
    s = extraire_mots_cles("Une odeur fraîche, citron et menthe, très légère")
    assert s["fraicheur"] >= 8 and s["intensite"] <= 3


# ---------- D. Moteur ----------

def test_distance_et_correspondance():
    w = np.ones(5)
    u = np.array([5, 5, 5, 5, 5.0])
    d = distance(u, np.array([[5, 5, 5, 5, 5.0], [0, 0, 0, 0, 0.0]]), w)
    assert d[0] == 0 and d[1] > 0
    assert correspondance(np.array([0.0]), w)[0] == 100


def test_recommandation_boisee():
    rep = recommander({"chaleur": 6, "fraicheur": 1, "floral": 0, "boise": 10, "intensite": 8}, modele=Modele())
    assert rep["formules"][0]["id_formule"] == 12
    assert [f["rang"] for f in rep["formules"]] == [1, 2, 3]
    assert all(i["famille"] for i in rep["ingredients"])


def test_api_curseurs(monkeypatch):
    monkeypatch.setenv("API_KEY", "cle-de-test")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    corps = {"chaleur": 1, "fraicheur": 10, "floral": 1, "boise": 0, "intensite": 3}
    assert client.post("/recommander/curseurs", json=corps).status_code == 401  # sans clé
    entete = {"X-API-Key": "cle-de-test"}
    r = client.post("/recommander/curseurs", json=corps, headers=entete)
    assert r.status_code == 200
    assert r.json()["formules"][0]["nom"].startswith("Key Lime")
    assert client.post("/recommander/curseurs", json={"chaleur": 11}, headers=entete).status_code == 422


# --- Demandes vagues : seul le métier est donné (reco/metiers.py) -------------

@pytest.mark.parametrize("texte, metier", [
    ("je suis un coiffeur je veux un parfum", "salon de coiffure"),
    ("Je suis barbier", "barbier"),
    ("J'ai une boulangerie", "boulangerie-pâtisserie"),
    ("une boutique en velours, j'adore", None),  # « velours » n'est pas « vélo », « adore » n'est pas « ado »
])
def test_detection_du_metier(texte, metier):
    from reco.metiers import detecter_metier

    trouve, _ = detecter_metier(texte)
    assert (trouve.nom if trouve else None) == metier


def test_le_mot_du_metier_ne_compte_pas_comme_ambiance():
    from reco.metiers import detecter_metier, mots_ambiance

    assert mots_ambiance(detecter_metier("salle de sport")[1]) == []  # « sport » est aussi un mot de fraîcheur
    assert mots_ambiance(detecter_metier("Bonjour, merci")[1]) == []  # « merci » n'est pas « mer »
    assert mots_ambiance(detecter_metier("salle de sport fraîche")[1]) == ["fraich"]


def test_tous_les_cas_complets_restent_lus_par_le_llm():
    from reco.evaluation import charger_cas
    from reco.metiers import detecter_metier, mots_ambiance

    assert all(mots_ambiance(detecter_metier(d)[1]) for d in charger_cas()["description"])


def _client(monkeypatch):
    monkeypatch.setenv("API_KEY", "cle-de-test")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    client.headers["X-API-Key"] = "cle-de-test"
    return client


def test_api_coiffeur_sans_ambiance_propose_des_formules_capillaires(monkeypatch):
    r = _client(monkeypatch).post("/recommander", json={"description": "je suis un coiffeur je veux un parfum"})
    assert r.status_code == 200
    d = r.json()
    assert d["methode_lecture"] == "profil-metier" and d["metier_detecte"] == "salon de coiffure"
    assert d["demande_complete"] and d["question_relance"]
    assert {f["id_formule"] for f in d["formules"]} & {7, 8}  # Shampoo, Shower gel


def test_api_demande_vide_propose_quand_meme_un_choix(monkeypatch):
    d = _client(monkeypatch).post("/recommander", json={"description": "Bonjour"}).json()
    assert d["demande_complete"] is False and d["question_relance"]
    assert len(d["formules"]) == 3


# --- Recommandation au format du site (reco/site.py) -------------------------
# Copie figée de GET /api/catalog du site : les tests n'ont pas besoin du site lancé.

@pytest.fixture(scope="module")
def catalogue_site():
    import json
    from pathlib import Path

    return json.loads((Path(__file__).parent / "donnees" / "catalogue_site.json").read_text(encoding="utf-8"))


def test_chaque_produit_du_site_a_des_familles_connues(catalogue_site):
    from reco.referentiels import FAMILLE_SCORES
    from reco.site import FAMILLES_CSV, produits_sans_famille

    assert produits_sans_famille(catalogue_site) == []
    familles = pd.read_csv(FAMILLES_CSV, sep=";")["familles"]
    assert all(m.rsplit(":", 1)[0] in FAMILLE_SCORES for f in familles for m in f.split("|"))


@pytest.mark.parametrize("texte, attendus", [
    ("je suis un coiffeur je veux un parfum", {"bergamote", "theVert", "oranger", "mandarine"}),
    ("J'ai une boulangerie", {"vanille", "caramel", "tonka", "benjoin"}),
    ("Je suis barbier", {"cedre", "vetiver", "santal"}),
])
def test_produits_du_site_pour_un_metier(catalogue_site, texte, attendus):
    from reco.site import recommander_site

    r = recommander_site(texte, catalogue=catalogue_site)
    ids = {p["id"] for p in r["produits"]}
    assert len(r["produits"]) == 4 and ids <= {p["id"] for p in catalogue_site["products"]}
    assert len(ids & attendus) >= 2


def test_chatbot_donne_une_position_sur_chaque_axe_du_site(catalogue_site):
    from reco.site import recommander_site

    r = recommander_site("je suis un coiffeur je veux un parfum", catalogue=catalogue_site)
    assert len(r["curseurs"]) == len(catalogue_site["axes"]) and all(0 <= c <= 100 for c in r["curseurs"])
    frais_boise = next(a["id"] for a in catalogue_site["axes"] if a["left"] == "frais")
    assert r["curseurs"][frais_boise] < 50  # coiffeur : côté frais


def _curseurs_du_site(r, catalogue, type_site):
    """Les curseurs que le site afficherait : ceux du profil de son type de boutique."""
    profils = {t["label"]: t for t in catalogue["shopTypes"]}
    axes = (profils.get(type_site) or next(t for t in catalogue["shopTypes"] if t["isDefault"]))["axes"]
    return axes, [r["curseurs"][a] for a in axes]


@pytest.mark.parametrize("texte", ["je suis un coiffeur je veux un parfum", "J'ai une boulangerie", "Je dirige un spa"])
def test_curseurs_non_bouges_redonnent_le_resultat_du_chatbot(catalogue_site, texte):
    from reco.site import recommander_curseurs, recommander_site

    r = recommander_site(texte, catalogue=catalogue_site)
    axes, valeurs = _curseurs_du_site(r, catalogue_site, r["type"])
    c = recommander_curseurs(texte, axes, valeurs, catalogue=catalogue_site)
    assert [p["id"] for p in c["produits"]] == [p["id"] for p in r["produits"]]
    assert c["poids_curseurs"] == 0


def test_bouger_un_curseur_change_les_produits_dans_le_bon_sens(catalogue_site):
    from reco.site import recommander_curseurs, recommander_site

    texte = "Je dirige un spa"  # le site affiche pétillant/apaisant, floral/gourmand, léger/intense
    r = recommander_site(texte, catalogue=catalogue_site)
    axes, valeurs = _curseurs_du_site(r, catalogue_site, r["type"])
    intensite = axes.index(4)
    par_id = {p["id"]: p for p in catalogue_site["products"]}
    moyenne = lambda rep: np.mean([par_id[p["id"]]["v"][4] for p in rep["produits"]])  # noqa: E731
    fort = recommander_curseurs(texte, axes, [100 if i == intensite else v for i, v in enumerate(valeurs)],
                                catalogue=catalogue_site)
    leger = recommander_curseurs(texte, axes, [0 if i == intensite else v for i, v in enumerate(valeurs)],
                                 catalogue=catalogue_site)
    assert moyenne(fort) > moyenne(r) >= moyenne(leger) - 0.05
    assert fort["scores_modele"]["intensite"] > r["scores_modele"]["intensite"]
    assert fort["scores_modele"]["fraicheur"] >= 5  # le contexte « spa » est gardé


def test_api_curseurs_site_refuse_des_curseurs_incoherents(monkeypatch):
    client = _client(monkeypatch)
    assert client.post("/site/curseurs", json={"description": "spa", "axes": [0, 1], "curseurs": [50]}).status_code == 422
    assert client.post("/site/curseurs", json={"description": "spa", "axes": [0], "curseurs": [150]}).status_code == 422


def test_type_de_boutique_du_site(catalogue_site):
    from reco.site import recommander_site

    assert recommander_site("Je dirige un spa", catalogue=catalogue_site)["type"] == "spa"
    r = recommander_site("Bonjour", catalogue=catalogue_site)
    assert r["type"] is None and r["demande_complete"] is False and len(r["produits"]) == 4
