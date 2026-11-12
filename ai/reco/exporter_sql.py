"""Export des données nettoyées (issues de data/raw/) et du modèle entraîné vers la base de l'application.

Écrit db/init/006-givaudan-seed.sql à partir de data/processed/ et de
models/modele_reco.json (schéma : db/init/005-givaudan-schema.sql, ADR 0007).

    python -m reco.exporter_sql

À relancer après `python -m reco.preparer` ou `python -m reco.entrainer`.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from . import config
from .config import AXES

SORTIE = config.BASE_DIR.parent / "db" / "init" / "006-givaudan-seed.sql"


def _txt(v: str | None) -> str:
    if v is None or v == "":
        return "NULL"
    return "'" + v.replace("'", "''") + "'"


def _num(v: str, decimales: int = 2) -> str:
    return "NULL" if v == "" else str(round(float(v), decimales))


def _lire(nom: str) -> list[dict]:
    with open(config.PROCESSED_DIR / nom, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _insert(table: str, colonnes: list[str], lignes: list[list[str]]) -> str:
    valeurs = ",\n".join(f"  ({', '.join(l)})" for l in lignes)
    return f"INSERT INTO {table} ({', '.join(colonnes)}) VALUES\n{valeurs};\n"


def nom_court(nom: str) -> str:
    """« Blueberry muffin /2 (Givaudan) » -> « Blueberry muffin »"""
    return re.sub(r"\s*/\d+\s*\(Givaudan\)$", "", nom).strip()


def familles(texte: str) -> list[str]:
    """« Fruité 48 % · Gourmand 32 % » -> ["fruité", "gourmand"]"""
    return [re.sub(r"\s*\d+\s*%$", "", p.strip()).lower() for p in texte.split("·") if p.strip()]


def produit_id(id_formule: str | int) -> str:
    """Identifiant de la formule dans la boutique (même règle dans api/src/reco.ts)."""
    return f"formule-{id_formule}"


def generer() -> str:
    formules = _lire("formules_profils.csv")
    ingredients = _lire("ingredients.csv")
    lignes = _lire("formules_lignes.csv")
    modele = json.loads(config.MODEL_PATH.read_text(encoding="utf-8"))

    sql = ["-- Généré par `python -m reco.exporter_sql` (ai/) : ne pas modifier à la main.\n"
           "-- Formules de démonstration publiques Givaudan, ingrédients et modèle entraîné.\n"]

    sql.append(_insert(
        "givaudan_formules",
        ["id", "nom", "application", *AXES, "famille_dominante", "familles_principales",
         "part_givaudan_pct", "ingredients_givaudan_principaux", "hors_catalogue_2024"],
        [[f["id_formule"], _txt(f["nom"]), _txt(f["application"]), *(_num(f[a]) for a in AXES),
          _txt(f["famille_dominante"]), _txt(f["familles_principales"]), _num(f["part_givaudan_pct"], 1),
          _txt(f["ingredients_givaudan_principaux"]), _txt(f["givaudan_hors_catalogue_2024"])]
         for f in formules],
    ))

    sql.append(_insert(
        "givaudan_ingredients",
        ["cle", "nom", "famille", "encore_au_catalogue", *AXES, "prix_eur_kg"],
        [[_txt(i["cle"]), _txt(i["nom"]), _txt(i["famille"]),
          "true" if i["encore_au_catalogue"] == "True" else "false",
          *(_num(i[a]) for a in AXES), _num(i["prix_eur_kg_100g"])]
         for i in ingredients],
    ))

    # Ce que vend la boutique : les formules Givaudan, rien d'autre
    sql.append(_insert(
        "products",
        ["id", "name", "ref", "description", "tags", "image", "position"],
        [[_txt(produit_id(f["id_formule"])), _txt(nom_court(f["nom"])), _txt(f"GIV-{int(f['id_formule']):02d}"),
          _txt(f"{f['application']}. Familles : {f['familles_principales']}."),
          "ARRAY[" + ", ".join(_txt(x) for x in familles(f["familles_principales"])) + "]::text[]",
          "NULL", str(int(f["id_formule"]) - 1)]
         for f in formules],
    ))

    paires = sorted({(int(l["id_formule"]), l["cle"]) for l in lignes if l["cle"]})
    sql.append(_insert("givaudan_formule_ingredients", ["formule_id", "cle"],
                       [[str(fid), _txt(cle)] for fid, cle in paires]))

    sql.append(_insert(
        "reco_modele", ["version", "variante_prompt", "poids_axes"],
        [[_txt(modele["version"]), _txt(modele["extracteur"]["variante_prompt"]),
          _txt(json.dumps(modele["poids_axes"]))]],
    ))
    return "\n".join(sql)


if __name__ == "__main__":
    Path(SORTIE).write_text(generer(), encoding="utf-8", newline="\n")
    print(f"Écrit : {SORTIE}")
