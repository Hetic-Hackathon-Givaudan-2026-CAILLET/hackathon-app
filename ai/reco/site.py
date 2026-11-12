"""Recommandation dans le format du site de l'équipe (front Vite + API Express).

Le site vend ses propres produits (Vanille, Cèdre, Bergamote…), décrits sur 6 axes
de 0 à 1, avec des types de boutique et des curseurs de 0 à 100. Ce module :
    1. lit le catalogue du site par son API publique (GET /api/catalog) : il reste
       la seule source des produits, rien n'est recopié ici ;
    2. place chaque produit sur les 5 axes du modèle, à partir de ses familles
       olfactives (data/site/produits_familles.csv + reco/referentiels.FAMILLE_SCORES)
       et de son intensité notée par l'équipe du site ;
    3. lit la demande (reco/metiers.analyser) et classe les produits avec la même
       distance pondérée que les formules (poids appris, models/modele_reco.json) ;
    4. répond avec le vocabulaire du site : id produit, type de boutique, curseurs.
"""

from __future__ import annotations

import os
import re
import time

import httpx
import numpy as np
import pandas as pd

from . import config
from .config import AXES
from .metiers import analyser
from .moteur import NOMS_AXES, charger_modele, correspondance, distance
from .referentiels import FAMILLE_SCORES

SITE_API_URL = os.getenv("SITE_API_URL", "http://localhost:3000")
FAMILLES_CSV = config.BASE_DIR / "data" / "site" / "produits_familles.csv"
AXE_INTENSITE_SITE = 4  # axe « léger ↔ intense » du site

# Métier reconnu par le modèle -> type de boutique du site, quand les regex du site ne trouvent rien
METIER_VERS_TYPE_SITE = {
    "librairie": "librairie",
    "boutique de thés": "boutique de thés",
    "spa / institut de beauté": "spa",
    "cabinet de massage": "spa",
    "studio de yoga": "spa",
    "bijouterie": "bijouterie",
    "salle de sport": "salle de sport",
    "boutique de vélos": "boutique de sport",
    "magasin de surf": "boutique de sport",
    "hôtel": "hôtel",
    "café": "café",
    "bougies": "boutique de bougies",
    "concept store": "concept store",
}

# Adjectifs du lexique du site (accordés à « une ambiance ») et tag correspondant
ADJECTIFS = [  # (axe du modèle, test sur le score, adjectif, tag du site)
    ("chaleur", lambda v: v >= 7, "chaleureuse", "chaleureux"),
    ("fraicheur", lambda v: v >= 7, "fraîche", "frais"),
    ("floral", lambda v: v >= 7, "florale", "floral"),
    ("boise", lambda v: v >= 7, "boisée", "boisé"),
    ("intensite", lambda v: v >= 8, "intense", "intense"),
    ("intensite", lambda v: v <= 3, "légère", "léger"),
]

_cache: dict = {"t": 0.0, "catalogue": None}


class SiteIndisponible(RuntimeError):
    pass


def charger_catalogue(ttl: float = 60) -> dict:
    """Catalogue du site (mis en cache 60 s, comme le fait le site lui-même)."""
    if _cache["catalogue"] is None or time.time() - _cache["t"] > ttl:
        try:
            r = httpx.get(f"{SITE_API_URL}/api/catalog", timeout=5)
            r.raise_for_status()
        except httpx.HTTPError as exc:
            raise SiteIndisponible(f"Catalogue du site injoignable ({SITE_API_URL}/api/catalog) : {exc}") from exc
        _cache.update(t=time.time(), catalogue=r.json())
    return _cache["catalogue"]


def _vecteur_familles(texte: str) -> np.ndarray:
    total, poids_total = np.zeros(len(AXES)), 0.0
    for morceau in texte.split("|"):
        famille, poids = morceau.rsplit(":", 1)
        total += float(poids) * np.array(FAMILLE_SCORES[famille], dtype=float)
        poids_total += float(poids)
    return total / poids_total


def profils_produits(catalogue: dict) -> pd.DataFrame:
    """Un produit du site = ses familles sur 4 axes + l'intensité notée par le site (0-1 -> 0-10)."""
    familles = pd.read_csv(FAMILLES_CSV, sep=";").set_index("id_produit")["familles"]
    lignes = []
    for p in catalogue["products"]:
        if p["id"] not in familles.index:
            continue  # produit ajouté au site sans famille : à compléter dans produits_familles.csv
        v = _vecteur_familles(familles[p["id"]])
        v[AXES.index("intensite")] = 10 * float(p["v"][AXE_INTENSITE_SITE])
        lignes.append({"id": p["id"], "nom": p["name"], "v_site": p["v"], **dict(zip(AXES, v.round(2)))})
    return pd.DataFrame(lignes)


def produits_sans_famille(catalogue: dict) -> list[str]:
    connus = set(pd.read_csv(FAMILLES_CSV, sep=";")["id_produit"])
    return [p["id"] for p in catalogue["products"] if p["id"] not in connus]


def _type_site(texte: str, metier: str | None, catalogue: dict) -> str | None:
    # 1. Les regex du site (mêmes règles que son front) ; 2. le métier reconnu par le modèle
    for t in catalogue["shopTypes"]:
        if t["pattern"] and re.search(t["pattern"], texte, re.IGNORECASE if "i" in t["flags"] else 0):
            return t["label"]
    return METIER_VERS_TYPE_SITE.get(metier)


# ---------------------------------------------------------------------------
# Correspondance entre les axes du site et ceux du modèle, apprise sur les produits
# ---------------------------------------------------------------------------
# Pour chaque produit, on connaît sa position sur les 6 axes du site (notée par l'équipe
# du site) et son profil sur les 5 axes du modèle (familles olfactives). Deux régressions
# linéaires (ridge) apprennent à passer de l'un à l'autre :
#     vers_site   : 5 scores du modèle -> position (0-1) sur chaque axe du site
#     vers_modele : déplacement sur les axes du site -> déplacement des 5 scores du modèle
RIDGE = 0.2  # choisi en leave-one-out sur les 18 produits (meilleur R² moyen dans les deux sens)


def _ridge(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Coefficients (avec constante en dernière ligne) de y ≈ [x, 1] @ coef."""
    xb = np.hstack([x, np.ones((len(x), 1))])
    penal = RIDGE * np.eye(xb.shape[1])
    penal[-1, -1] = 0  # pas de pénalité sur la constante
    return np.linalg.solve(xb.T @ xb + penal, xb.T @ y)


def _r2(y: np.ndarray, p: np.ndarray) -> np.ndarray:
    return 1 - ((y - p) ** 2).sum(0) / ((y - y.mean(0)) ** 2).sum(0)


def correspondance_axes(catalogue: dict) -> dict:
    produits = profils_produits(catalogue)
    site = np.vstack(produits["v_site"].to_numpy()).astype(float)  # (n, 6), 0-1
    modele = produits[AXES].to_numpy(dtype=float)  # (n, 5), 0-10
    vers_site = _ridge(modele / 10, site)
    vers_modele = _ridge(site, modele / 10)
    prevu_site = np.hstack([modele / 10, np.ones((len(site), 1))]) @ vers_site
    prevu_modele = np.hstack([site, np.ones((len(site), 1))]) @ vers_modele
    return {
        "vers_site": vers_site,
        "vers_modele": vers_modele,
        "r2_site": dict(zip([a["name"] for a in sorted(catalogue["axes"], key=lambda a: a["id"])],
                            _r2(site, prevu_site).round(2))),
        "r2_modele": dict(zip(AXES, _r2(modele / 10, prevu_modele).round(2))),
    }


def positions_site(scores: dict, catalogue: dict) -> list[int]:
    """Position (0-100) de la demande sur chaque axe du site, dans l'ordre des identifiants d'axes."""
    u = np.array([scores[a] for a in AXES], dtype=float) / 10
    pos = np.append(u, 1) @ correspondance_axes(catalogue)["vers_site"]
    return [int(v) for v in np.clip(np.round(100 * pos), 0, 100)]


def classement_site(axes: list[int], curseurs: list[int], catalogue: dict, top: int = 4) -> list[str]:
    """Reproduit le calcul du front du site (web/src/recommend.ts, ranked) sans le bonus du texte libre."""
    s = [c / 100 for c in curseurs]
    notes = [(1 - sum(abs(p["v"][a] - s[k]) for k, a in enumerate(axes)) / len(axes), -i, p["id"])
             for i, p in enumerate(catalogue["products"])]
    return [pid for *_, pid in sorted(notes, reverse=True)[:top]]


def _pourquoi(scores: dict, produit) -> str:
    ecarts = sorted(AXES, key=lambda a: abs(scores[a] - getattr(produit, a)))
    return f"Proche de votre demande sur {NOMS_AXES[ecarts[0]]} et {NOMS_AXES[ecarts[1]]}."


def _phrase(type_site: str | None, metier: str | None, adjectifs: list[str]) -> str:
    lieu = type_site or metier or "boutique"
    if not adjectifs:
        return f"Voici une sélection pour votre {lieu}."
    texte = adjectifs[0] if len(adjectifs) == 1 else ", ".join(adjectifs[:-1]) + " et " + adjectifs[-1]
    return f"Pour votre {lieu}, je vous propose une ambiance {texte}."


def _classer(scores: dict, produits: pd.DataFrame, modele) -> pd.DataFrame:
    """Les produits classés par distance pondérée aux scores (poids appris)."""
    w = np.array([modele.poids[a] for a in AXES])
    u = np.array([scores[a] for a in AXES], dtype=float)
    d = distance(u, produits[AXES].to_numpy(), w)
    return produits.assign(distance=d, correspondance=correspondance(d, w))


def _produits_json(choisis: pd.DataFrame, scores: dict) -> list[dict]:
    return [{
        "id": r.id,
        "nom": r.nom,
        "correspondance_pct": round(float(r.correspondance), 1),
        "pourquoi": _pourquoi(scores, r),
    } for r in choisis.itertuples()]


def _adjectifs(scores: dict) -> list[tuple[str, str]]:
    return [(adj, tag) for axe, test, adj, tag in ADJECTIFS if test(scores[axe])]


def recommander_site(description: str, top: int = 4, catalogue: dict | None = None) -> dict:
    """Chatbot : la demande du commerçant -> produits du site + position conseillée sur chaque axe du site."""
    catalogue = catalogue or charger_catalogue()
    modele = charger_modele()
    analyse = analyser(description, variante=modele.variante_prompt)
    scores = analyse["scores"]

    produits = _classer(scores, profils_produits(catalogue), modele).sort_values(["distance", "id"])
    choisis = produits.head(top)
    type_site = _type_site(description, analyse["metier"], catalogue)
    retenus = _adjectifs(scores)
    return {
        "type": type_site,
        "reponse": _phrase(type_site, analyse["metier"], [a for a, _ in retenus]),
        "ambiance": [tag for _, tag in retenus],
        "curseurs": positions_site(scores, catalogue),
        "produits": _produits_json(choisis, scores),
        "scores_modele": scores,
        "methode_lecture": analyse["methode"],
        "metier_detecte": analyse["metier"],
        "demande_complete": analyse["demande_complete"],
        "question_relance": analyse["question_relance"],
        "modele": modele.version,
    }


# Déplacement des curseurs (en points sur 100) à partir duquel la position des curseurs
# pèse autant que possible dans le classement (POIDS_CURSEURS_MAX)
DEPLACEMENT_PLEIN = 25
POIDS_CURSEURS_MAX = 0.7


def _normaliser(x: np.ndarray) -> np.ndarray:
    etendue = x.max() - x.min()
    return (x - x.min()) / etendue if etendue > 0 else np.zeros_like(x)


# Attachement à la demande quand on traduit les curseurs (plus grand = la demande résiste davantage)
ATTACHEMENT_DEMANDE = 0.2


def traduire_curseurs(depart: dict, axes: list[int], cible: np.ndarray, catalogue: dict) -> dict:
    """Scores du modèle qui placeraient la demande sur `cible` (0-1) pour les curseurs `axes`,
    tout en restant le plus proche possible des scores de départ (moindres carrés régularisés).

    On inverse la correspondance « modèle -> site », mieux apprise que l'inverse
    (voir correspondance_axes : r2_site vs r2_modele).
    """
    coef = correspondance_axes(catalogue)["vers_site"]
    a_mat, b = coef[:-1][:, axes].T, coef[-1][axes]  # position_site[axes] ≈ a_mat @ x + b
    x0 = np.array([depart[a] for a in AXES], dtype=float) / 10
    lam = ATTACHEMENT_DEMANDE
    x = np.linalg.solve(a_mat.T @ a_mat + lam * np.eye(len(AXES)), a_mat.T @ (cible - b) + lam * x0)
    return {a: int(v) for a, v in zip(AXES, np.clip(np.round(10 * x), 0, 10))}


def recommander_curseurs(description: str, axes: list[int], curseurs: list[int], complement: str | None = None,
                         top: int = 4, catalogue: dict | None = None) -> dict:
    """Curseurs : le client a réglé les curseurs affichés par le site -> nouveaux produits.

    1. La demande (et son complément éventuel) est relue : contexte de la boutique.
    2. L'écart entre les curseurs du client et la position conseillée pour sa demande est
       traduit dans les 5 axes du modèle (traduire_curseurs) : les scores bougent.
    3. Chaque produit reçoit deux notes : proximité aux nouveaux scores (modèle, poids appris)
       et proximité aux curseurs tels que le site les définit. Plus le client a bougé les
       curseurs, plus la seconde compte (de 0 sans mouvement à POIDS_CURSEURS_MAX).
    """
    if len(axes) != len(curseurs) or not axes:
        raise ValueError("axes et curseurs : même longueur, au moins un curseur")
    catalogue = catalogue or charger_catalogue()
    if any(not 0 <= a < len(catalogue["axes"]) for a in axes):
        raise ValueError(f"axes : identifiants de 0 à {len(catalogue['axes']) - 1}")
    modele = charger_modele()
    texte = f"{description}. {complement}" if complement else description
    analyse = analyser(texte, variante=modele.variante_prompt)
    depart = analyse["scores"]

    conseille = np.array(positions_site(depart, catalogue), dtype=float) / 100
    cible = np.array(curseurs, dtype=float) / 100
    scores = traduire_curseurs(depart, axes, cible, catalogue)

    produits = _classer(scores, profils_produits(catalogue), modele)
    v = np.vstack(produits["v_site"].to_numpy()).astype(float)
    proximite_site = 1 - np.abs(v[:, axes] - cible).mean(axis=1)
    mouvement = float(np.abs(cible - conseille[axes]).mean() * 100)
    poids_curseurs = POIDS_CURSEURS_MAX * min(1.0, mouvement / DEPLACEMENT_PLEIN)
    note = ((1 - poids_curseurs) * _normaliser(produits["correspondance"].to_numpy())
            + poids_curseurs * _normaliser(proximite_site))
    choisis = produits.assign(note=note).sort_values(["note", "id"], ascending=[False, True]).head(top)

    retenus = _adjectifs(scores)
    adjs = [a for a, _ in retenus]
    if not adjs:
        reponse = "Avec vos réglages, voici une nouvelle sélection."
    else:
        texte_adj = adjs[0] if len(adjs) == 1 else ", ".join(adjs[:-1]) + " et " + adjs[-1]
        reponse = f"Avec vos réglages, je vous propose une ambiance {texte_adj}."
    return {
        "reponse": reponse,
        "ambiance": [tag for _, tag in retenus],
        "produits": _produits_json(choisis, scores),
        "scores_modele": scores,
        "scores_demande": depart,
        "poids_curseurs": round(poids_curseurs, 2),
        "modele": modele.version,
    }
