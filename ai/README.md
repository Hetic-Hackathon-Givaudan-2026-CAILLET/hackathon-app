# Service IA de l'équipe Data

API FastAPI hors de l'application principale (ADR 0005). Swagger :
http://localhost:8000/docs. Toutes les routes exigent l'en-tête `X-API-Key`.

| Route                        | Rôle                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `POST /answer`               | Réponse libre d'Ollama à une question                                |
| `POST /recommander`          | Description libre d'une boutique → 3 formules Givaudan + ingrédients |
| `POST /recommander/curseurs` | 5 curseurs (0 à 10) → même résultat, sans LLM, instantané            |

## Démarrer

```sh
cd ai
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # puis renseigner API_KEY
ollama pull qwen2.5:3b
uvicorn main:app --env-file .env --port 8000
```

## Modèle de recommandation (`reco/`)

Une boutique décrit l'odeur qu'elle veut. Ollama (`RECO_MODEL`, par défaut
`qwen2.5:3b`) traduit la phrase en 5 notes : chaleur, fraîcheur, floral, boisé,
intensité. Le code calcule ensuite la distance avec le profil de chaque formule
et renvoie les plus proches. Le LLM ne choisit jamais la fragrance.

| Étape           | Module          | Commande                   |
| --------------- | --------------- | -------------------------- |
| A. Nettoyage    | `nettoyage.py`  | `python -m reco.preparer`  |
| B. Profils      | `profils.py`    | (incluse ci-dessus)        |
| C. Lecture LLM  | `extraction.py` | —                          |
| D. Distance     | `moteur.py`     | —                          |
| E. Entraînement | `entrainer.py`  | `python -m reco.entrainer` |
| E. Test         | `evaluer.py`    | `python -m reco.evaluer`   |

Les données nettoyées (`data/processed/`) et le modèle entraîné
(`models/modele_reco.json`) sont versionnés : l'API fonctionne sans relancer ces
commandes. Les relancer seulement si les CSV de `data/raw/` changent.

Résultat sur 14 boutiques jamais vues (`reports/evaluation_test.md`) : une
formule pertinente dans le top 3 pour 9 cas sur 14 (64 %), contre 57 % pour une
référence par mots-clés sans IA.

Tests (sans LLM) : `python -m pytest tests -q`.

Les notes des familles olfactives et les familles ajoutées à la main
(`reco/referentiels.py`) sont des choix de l'équipe, à faire valider par un
parfumeur Givaudan.
