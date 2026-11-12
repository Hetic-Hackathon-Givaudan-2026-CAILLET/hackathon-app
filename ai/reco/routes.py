"""Routes FastAPI de la recommandation, branchées dans main.py (avec la clé X-API-Key).

    /recommander, /recommander/curseurs    formules Givaudan (modèle d'origine)
    /site/recommander                      chatbot du site : demande -> produits du site + curseurs
    /site/curseurs                         curseurs du site réglés par le client -> produits du site
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .metiers import analyser
from .moteur import charger_modele, recommander
from .site import SiteIndisponible, recommander_site
from .site import recommander_curseurs as recommander_curseurs_site

router = APIRouter(tags=["recommandation"])


def _axe(description: str):
    return Field(..., ge=0, le=10, description=description, examples=[5])


class Curseurs(BaseModel):
    chaleur: int = _axe("Odeur chaude, gourmande, vanillée, ambrée, épicée (0 à 10).")
    fraicheur: int = _axe("Odeur fraîche : agrumes, vert, marin, menthe, propre (0 à 10).")
    floral: int = _axe("Odeur de fleurs (0 à 10).")
    boise: int = _axe("Bois, cèdre, santal, cuir, mousse (0 à 10).")
    intensite: int = _axe("Force de l'odeur : 0 = à peine perceptible, 10 = très puissante.")


class AjustementCurseurs(BaseModel):
    chaleur: int | None = Field(None, ge=0, le=10)
    fraicheur: int | None = Field(None, ge=0, le=10)
    floral: int | None = Field(None, ge=0, le=10)
    boise: int | None = Field(None, ge=0, le=10)
    intensite: int | None = Field(None, ge=0, le=10)


class RecoRequest(BaseModel):
    description: str = Field(
        ..., min_length=3, max_length=1000,
        description="Description libre de l'ambiance voulue, écrite par la boutique.",
        examples=["Salon de coiffure de quartier, une odeur fraîche et propre, un peu florale, pas trop forte"],
    )
    ajustements: AjustementCurseurs | None = Field(
        None, description="Curseurs corrigés par la boutique après une première proposition : "
                          "ils remplacent les scores lus par le LLM sur les axes donnés.")
    top_formules: int = Field(3, ge=1, le=13, description="Nombre de formules renvoyées.")
    top_ingredients: int = Field(5, ge=0, le=20, description="Nombre d'ingrédients Givaudan renvoyés.")


class CurseursRequest(Curseurs):
    top_formules: int = Field(3, ge=1, le=13, description="Nombre de formules renvoyées.")
    top_ingredients: int = Field(5, ge=0, le=20, description="Nombre d'ingrédients Givaudan renvoyés.")


class ProfilFormule(BaseModel):
    chaleur: float
    fraicheur: float
    floral: float
    boise: float
    intensite: float


class FormuleReco(BaseModel):
    rang: int = Field(description="1 = la plus proche.")
    id_formule: int
    nom: str
    application: str = Field(description="Usage d'origine de la formule de démonstration.")
    correspondance_pct: float = Field(description="100 = identique aux scores demandés, 0 = opposé sur tous les axes.")
    profil: ProfilFormule = Field(description="Les 5 scores de la formule (0 à 10, une décimale).")
    famille_dominante: str
    familles_principales: str = Field(description="Part des 3 premières familles dans la formule.")
    part_givaudan_pct: float = Field(description="Part de la formule (hors solvants) faite d'ingrédients Givaudan.")
    ingredients_givaudan_principaux: str
    alerte_catalogue: str | None = Field(description="Ingrédients Givaudan de la formule absents du catalogue 2024.")
    pourquoi: str = Field(description="Explication générée par le code (pas par le LLM).")


class IngredientReco(BaseModel):
    nom: str
    famille: str
    correspondance_pct: float
    utilise_dans_une_formule_recommandee: bool
    prix_indicatif_eur_kg: int | None = Field(description="Prix revendeur au détail, 100 g pur, en EUR/kg. Indicatif.")


class RecoResponse(BaseModel):
    scores_utilises: Curseurs = Field(description="Scores après lecture du texte et ajustements.")
    methode_lecture: str | None = Field(
        None, description="D'où viennent les scores : « llm », « mots-clés » (secours si Ollama ne répond pas), "
                          "« profil-metier » (seul le métier est donné) ou « profil-par-defaut » (ni métier ni ambiance).")
    metier_detecte: str | None = Field(None, description="Type de boutique reconnu, ex. « salon de coiffure ».")
    demande_complete: bool = Field(True, description="False si la description ne donne ni métier ni ambiance.")
    question_relance: str | None = Field(None, description="Question à poser pour affiner ; null si la demande suffit.")
    formules: list[FormuleReco]
    ingredients: list[IngredientReco]
    modele: dict = Field(description="Version du modèle et poids des axes appris.")
    note_prix: str


ERR = {
    401: {"description": "Clé d'API invalide."},
    503: {"description": "Données absentes : lancer `python -m reco.preparer` dans ai/."},
}


def _recommander(scores: dict, top_f: int, top_i: int) -> dict:
    try:
        return recommander(scores, top_formules=top_f, top_ingredients=top_i)
    except FileNotFoundError as exc:
        raise HTTPException(503, "Données absentes : lancer `python -m reco.preparer` dans ai/.") from exc


@router.post("/recommander", response_model=RecoResponse, responses=ERR,
             summary="Description libre → 3 formules + ingrédients")
def recommander_description(req: RecoRequest):
    """Lit la description (LLM, ou profil du métier si l'ambiance n'est pas décrite), applique les ajustements,
    puis recommande. Renvoie toujours des formules ; `question_relance` dit quoi demander pour affiner."""
    analyse = analyser(req.description, variante=charger_modele().variante_prompt)
    scores = dict(analyse["scores"])
    if req.ajustements:
        scores.update({k: v for k, v in req.ajustements.model_dump().items() if v is not None})
    return {
        **_recommander(scores, req.top_formules, req.top_ingredients),
        "methode_lecture": analyse["methode"],
        "metier_detecte": analyse["metier"],
        "demande_complete": analyse["demande_complete"],
        "question_relance": analyse["question_relance"],
    }


@router.post("/recommander/curseurs", response_model=RecoResponse, responses=ERR,
             summary="Curseurs → 3 formules + ingrédients (sans LLM, instantané)")
def recommander_curseurs(req: CurseursRequest):
    """Recommandation directe à partir des 5 curseurs."""
    scores = req.model_dump(include={"chaleur", "fraicheur", "floral", "boise", "intensite"})
    return _recommander(scores, req.top_formules, req.top_ingredients)


# ---------- Site de l'équipe : chatbot et curseurs ----------

ERR_SITE = {
    401: {"description": "Clé d'API invalide."},
    422: {"description": "Requête invalide."},
    503: {"description": "Catalogue du site injoignable (SITE_API_URL)."},
}


class SiteRecoRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=1000,
                             description="Ce que le commerçant a écrit dans « Décrivez votre boutique ».",
                             examples=["je suis un coiffeur je veux un parfum"])
    top: int = Field(4, ge=1, le=18, description="Nombre de produits renvoyés (le site en affiche 4).")


class ProduitSite(BaseModel):
    id: str = Field(description="Identifiant du produit dans le catalogue du site (products.id), ex. « bergamote ».")
    nom: str
    correspondance_pct: float = Field(description="100 = profil identique à la demande.")
    pourquoi: str


class SiteRecoResponse(BaseModel):
    type: str | None = Field(description="Type de boutique du site (shop_types.label), ou null.")
    reponse: str = Field(description="Phrase à afficher, construite par le code à partir des scores.")
    ambiance: list[str] = Field(description="Tags d'ambiance du site retenus (lexicon_entries.tag).")
    curseurs: list[int] = Field(description="Position conseillée (0 à 100) sur CHAQUE axe du site, dans l'ordre des "
                                            "identifiants : curseurs[2] = axe 2. Le site affiche ceux qu'il veut.",
                                examples=[[25, 66, 15, 18, 40, 27]])
    produits: list[ProduitSite] = Field(description="Produits recommandés, du plus proche au moins proche.")
    scores_modele: Curseurs = Field(description="Les 5 scores lus par le modèle (0 à 10).")
    methode_lecture: str
    metier_detecte: str | None
    demande_complete: bool
    question_relance: str | None
    modele: str


class SiteCurseursRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=1000, description="La demande de départ du commerçant.",
                             examples=["je suis un coiffeur je veux un parfum"])
    complement: str | None = Field(None, max_length=1000, description="« Complétez votre demande », s'il y en a un.")
    axes: list[int] = Field(..., min_length=1, max_length=6,
                            description="Identifiants des curseurs affichés par le site (state.axes).",
                            examples=[[0, 1, 2]])
    curseurs: list[int] = Field(..., min_length=1, max_length=6,
                                description="Leur position réglée par le client, 0 à 100 (state.sliders).",
                                examples=[[25, 66, 90]])
    top: int = Field(4, ge=1, le=18)


class SiteCurseursResponse(BaseModel):
    reponse: str = Field(description="Phrase sur l'ambiance obtenue avec ces réglages.")
    ambiance: list[str]
    produits: list[ProduitSite]
    scores_modele: Curseurs = Field(description="Scores du modèle après prise en compte des curseurs.")
    scores_demande: Curseurs = Field(description="Scores lus dans la demande seule.")
    poids_curseurs: float = Field(description="Part des curseurs dans le classement : 0 = position conseillée "
                                              "(même résultat que le chatbot), jusqu'à 0,7 s'ils ont beaucoup bougé.")
    modele: str


@router.post("/site/recommander", response_model=SiteRecoResponse, responses=ERR_SITE, tags=["site"],
             summary="Chatbot du site : demande → produits du site et position des curseurs")
def site_recommander(req: SiteRecoRequest):
    """Recommande les produits du catalogue du site (lu sur son API, `SITE_API_URL`).
    Toujours une sélection, même pour « Bonjour » : voir `demande_complete` et `question_relance`."""
    try:
        return recommander_site(req.description, top=req.top)
    except SiteIndisponible as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post("/site/curseurs", response_model=SiteCurseursResponse, responses=ERR_SITE, tags=["site"],
             summary="Curseurs du site réglés par le client → nouveaux produits")
def site_curseurs(req: SiteCurseursRequest):
    """À appeler quand le client bouge un curseur (après ~250 ms sans mouvement). Le modèle traduit le réglage
    dans sa lecture de l'ambiance, garde le contexte de la boutique et reclasse les produits (~20 ms)."""
    if any(not 0 <= c <= 100 for c in req.curseurs):
        raise HTTPException(422, "curseurs : valeurs de 0 à 100")
    try:
        return recommander_curseurs_site(req.description, req.axes, req.curseurs, complement=req.complement,
                                         top=req.top)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except SiteIndisponible as exc:
        raise HTTPException(503, str(exc)) from exc
