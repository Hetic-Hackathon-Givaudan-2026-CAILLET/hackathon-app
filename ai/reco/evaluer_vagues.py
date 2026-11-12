"""Mesure sur les demandes vagues : la boutique ne donne que son métier.

    python -m reco.evaluer_vagues

Compare, sur data/eval/cas_vagues.csv :
    avant : le LLM lit seul la demande (comportement de la version 1.0.0)
    après : analyser() — profil du métier quand l'ambiance n'est pas décrite
Les étiquettes reprennent les formules pertinentes des cas complets du même métier.
Sortie : reports/evaluation_vagues.md
"""

from __future__ import annotations

import pandas as pd

from . import config
from .evaluation import classement, metriques_classement
from .extraction import extraire
from .metiers import analyser
from .moteur import charger_donnees, charger_modele


def _rang(cl: list[int], pert: list[int]) -> int:
    return next(k + 1 for k, f in enumerate(cl) if f in pert)


def evaluer_vagues() -> dict:
    modele = charger_modele()
    cas = pd.read_csv(config.EVAL_DIR / "cas_vagues.csv", sep=";", encoding="utf-8")
    pert = [[int(x) for x in str(s).split("|")] for s in cas["formules_pertinentes"]]
    avant = [extraire(t, modele.variante_prompt)[0] for t in cas["description"]]
    analyses = [analyser(t, modele.variante_prompt) for t in cas["description"]]
    apres = [a["scores"] for a in analyses]
    cl_avant = [classement(s, modele) for s in avant]
    cl_apres = [classement(s, modele) for s in apres]
    res = {"avant_llm_seul": metriques_classement(cl_avant, pert),
           "apres_profil_metier": metriques_classement(cl_apres, pert)}

    formules, _, _ = charger_donnees()
    noms = dict(zip(formules["id_formule"], formules["nom"].str.replace(r" /2 \(Givaudan\)", "", regex=True)))
    lignes = [f"# Demandes vagues : seul le métier est donné ({len(cas)} cas)", "",
              f"Modèle {modele.version}", "",
              "| Lecture | hit@1 | hit@3 | MRR |", "|---|---|---|---|"]
    for nom, m in res.items():
        lignes.append(f"| {nom} | {m['hit@1']:.0%} | {m['hit@3']:.0%} | {m['mrr']:.2f} |")
    lignes += ["", "| # | Demande | Métier reconnu | Rang avant | Rang après | Top 3 après |", "|---|---|---|---|---|---|"]
    for i, r in enumerate(cas.itertuples()):
        lignes.append(f"| {r.id} | {r.description} | {analyses[i]['metier'] or '—'} | {_rang(cl_avant[i], pert[i])} | "
                      f"{_rang(cl_apres[i], pert[i])} | {', '.join(noms[f] for f in cl_apres[i][:3])} |")
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / "evaluation_vagues.md").write_text("\n".join(lignes) + "\n", encoding="utf-8")
    return res


if __name__ == "__main__":
    for nom, m in evaluer_vagues().items():
        print(nom, m)
