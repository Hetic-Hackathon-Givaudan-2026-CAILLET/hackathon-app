# Service IA de l'équipe Data

API FastAPI hors de l'application principale (ADR 0005). Swagger :
http://localhost:8000/docs. Toutes les routes exigent l'en-tête `X-API-Key`.

| Route                        | Rôle                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `POST /answer`               | Réponse libre d'Ollama à une question                                  |
| `POST /recommander`          | Description libre d'une boutique → 3 formules Givaudan + ingrédients   |
| `POST /recommander/curseurs` | 5 curseurs (0 à 10) → même résultat, sans LLM, instantané              |
| `POST /site/recommander`     | Chatbot du site : demande → 4 produits du site + position des curseurs |
| `POST /site/curseurs`        | Curseurs du site réglés par le client → 4 nouveaux produits (~20 ms)   |

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

## Demandes incomplètes (`reco/metiers.py`)

« Je suis coiffeur, je veux un parfum » ne décrit aucune ambiance : le LLM
inventait des scores. Le modèle repère maintenant le métier (~40 métiers) et
utilise son profil type ; s'il n'y a ni métier ni ambiance (« Bonjour »), il
propose une sélection par défaut avec `demande_complete: false` et une
`question_relance`. Sur 18 demandes vagues (`reports/evaluation_vagues.md`,
`python -m reco.evaluer_vagues`) : hit@3 de 39 % à 89 %. Ce chiffre est
optimiste : les profils notés « expert » ont été fixés après lecture des cas
étiquetés. Les demandes complètes passent toujours par le LLM (résultat inchangé).

## Produits du site (`reco/site.py`)

Les routes `/site/...` recommandent les produits du site de l'équipe (Vanille,
Cèdre…), lus sur son API (`SITE_API_URL`, `GET /api/catalog`). Chaque produit
est placé sur les 5 axes à partir de ses familles olfactives
(`data/site/produits_familles.csv`, à compléter pour tout nouveau produit).
Une correspondance apprise sur les produits relie les 6 axes du site aux 5 axes
du modèle : le chatbot conseille une position pour chaque curseur du site, et un
curseur réglé par le client est traduit dans la lecture du modèle avant de
reclasser les produits. Intégration côté site : `docs/integration/` à la racine.

Les notes des familles olfactives et les familles ajoutées à la main
(`reco/referentiels.py`) sont des choix de l'équipe, à faire valider par un
parfumeur Givaudan.
