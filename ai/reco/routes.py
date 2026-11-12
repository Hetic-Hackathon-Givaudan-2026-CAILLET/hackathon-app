"""Routes FastAPI de la recommandation, branchées dans main.py (avec la clé X-API-Key)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .extraction import extraire
from .moteur import charger_modele, recommander

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
    methode_lecture: str | None = Field(None, description="« llm » ou « mots-clés » (secours si Ollama ne répond pas).")
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
    """Lit la description avec Ollama (secours : mots-clés), applique les ajustements, puis recommande."""
    scores, methode = extraire(req.description, variante=charger_modele().variante_prompt)
    if req.ajustements:
        scores.update({k: v for k, v in req.ajustements.model_dump().items() if v is not None})
    return {**_recommander(scores, req.top_formules, req.top_ingredients), "methode_lecture": methode}


@router.post("/recommander/curseurs", response_model=RecoResponse, responses=ERR,
             summary="Curseurs → 3 formules + ingrédients (sans LLM, instantané)")
def recommander_curseurs(req: CurseursRequest):
    """Recommandation directe à partir des 5 curseurs."""
    scores = req.model_dump(include={"chaleur", "fraicheur", "floral", "boise", "intensite"})
    return _recommander(scores, req.top_formules, req.top_ingredients)
