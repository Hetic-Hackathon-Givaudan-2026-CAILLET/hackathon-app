# Livrables Data/IA

Recommandation de fragrances Givaudan pour les boutiques : un commerçant décrit
l'odeur qu'il veut, le modèle propose les formules et ingrédients Givaudan les
plus proches. L'équipe Data nettoie les données, entraîne et évalue le modèle
dans [`ai/`](ai/) ; le site l'utilise via PostgreSQL et l'API
([ADR 0007](docs/adr/0007-recommandation-givaudan.md)).

| Jour                  | Section                                                 |
| --------------------- | ------------------------------------------------------- |
| Lundi 9 : Exploration | [Sources et qualité](#lundi-9--exploration)             |
| Mardi 10 : Gate 1     | [Faisabilité et contrat d'interface](#mardi-10--gate-1) |
| Jeudi 12 : Prototype  | [Modèle V2 et API](#jeudi-12--prototype)                |

---

## Lundi 9 : Exploration

### 1. Inventaire des sources de données

Givaudan ne fournit pas de données internes : toutes les données viennent de
sources publiques, citées ligne par ligne dans la colonne `source` (ou `url`) de
chaque fichier.

| Fichier ([`ai/data/raw/`](ai/data/raw/))                                         | Contenu                                                 | Lignes | Provenance et accès                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| [`givaudan_formules_demo.csv`](ai/data/raw/givaudan_formules_demo.csv)           | 13 formules de démonstration, ingrédient par ingrédient | 363    | The Good Scents Company (pages publiques des formules de démo), relevé manuel                                            |
| [`givaudan_anciens_catalogues.csv`](ai/data/raw/givaudan_anciens_catalogues.csv) | Ingrédients des catalogues et leur famille olfactive    | 493    | _The Major Catalog's of Fragrance_ (G. Brechbill) : catalogues Givaudan, Givaudan-Roure, Givco, Quest International      |
| [`givaudan_prix_revendeurs.csv`](ai/data/raw/givaudan_prix_revendeurs.csv)       | Prix publics des ingrédients chez des revendeurs        | 300    | Sites des revendeurs (Fraterworks pour 294 lignes, The Fragrance Foundry, Scentspiracy, Hekserij), relevés le 11/11/2026 |

Format : CSV, séparateur `;`, UTF-8. Aucun accès privé ni clé n'est nécessaire.

### 2. Premier échantillon

Les trois fichiers bruts sont versionnés tels quels dans
[`ai/data/raw/`](ai/data/raw/).

### 3. Analyse initiale de la qualité

Mesurée par le nettoyage (`python -m reco.preparer`) et enregistrée dans
[`ai/data/processed/rapport_qualite.json`](ai/data/processed/rapport_qualite.json).

| Fichier    | Constat                                                                                                                                                      | Traitement                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Catalogues | 493 lignes pour 411 ingrédients : **82 doublons** entre catalogues                                                                                           | Fusion sur un nom normalisé                                                                                                        |
| Catalogues | **11 ingrédients avec des familles contradictoires** selon le catalogue (ex. Aldehyde C 110 : « Aldéhydé » chez Givaudan, « Hespéridé » chez Givaudan-Roure) | Règle de priorité, le catalogue Givaudan l'emporte ; chaque conflit est détaillé dans le rapport                                   |
| Catalogues | 1 ingrédient sans odeur ; seuls 118 ingrédients sont encore au catalogue 2024                                                                                | Exclu du calcul ; seuls les 118 ingrédients encore vendus sont recommandés                                                         |
| Formules   | 363 lignes : 148 ingrédients trouvés dans les catalogues, 207 non trouvés, 8 solvants                                                                        | Table de familles complétée à la main ([`reco/referentiels.py`](ai/reco/referentiels.py)) ; aucun ingrédient ne reste sans famille |
| Formules   | 4 fabricants mal renseignés (ex. Berryflor noté « générique » alors qu'il est Givaudan)                                                                      | Corrigés                                                                                                                           |
| Formules   | `dilution_utilisee` vide sur 330 lignes sur 363                                                                                                              | Colonne non utilisée par le modèle                                                                                                 |
| Prix       | 3 devises (USD 294, GBP 4, EUR 2) ; 57 lignes sans taille exploitable                                                                                        | Conversion en €/kg à taux indicatifs ; 69 produits rapprochés du catalogue, 25 avec un prix de référence à 100 g                   |

### 4. Solution de repli si les données manquent

- **Pas de données internes Givaudan.** C'est notre cas : le jeu est reconstruit
  à partir de sources publiques (formules de démonstration, catalogues
  historiques, prix revendeurs).
- **Pas de jeu étiqueté.** L'équipe a rédigé et noté à la main 40 descriptions
  de boutiques ([`cas_boutiques.csv`](ai/data/eval/cas_boutiques.csv)).
- **Modèle de langage indisponible ou réponse invalide.** Après 2 essais, la
  lecture bascule automatiquement sur des mots-clés, sans IA
  ([`reco/extraction.py`](ai/reco/extraction.py), repris dans `api/src/reco.ts`).

---

## Mardi 10 : Gate 1

### 1. Dataset exploitable

[`ai/data/processed/`](ai/data/processed/), régénéré par
`python -m reco.preparer` :

| Fichier                                                          | Contenu                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`ingredients.csv`](ai/data/processed/ingredients.csv)           | 410 ingrédients dédoublonnés : famille, note sur 5 axes, prix €/kg             |
| [`formules_lignes.csv`](ai/data/processed/formules_lignes.csv)   | 363 lignes de formules enrichies (famille, fabricant corrigé)                  |
| [`formules_profils.csv`](ai/data/processed/formules_profils.csv) | 13 formules résumées sur 5 axes : chaleur, fraîcheur, floral, boisé, intensité |

### 2. Premier résultat : baseline (V1)

La **V1** lit la description par mots-clés, sans IA : des règles la traduisent en
5 notes, puis on retient les formules les plus proches. Sur les 14 cas de test,
**hit@3 = 57 %** : une formule pertinente est dans le top 3 pour 8 cas sur 14.
C'est la référence que la V2 doit battre.

### 3. Preuve de faisabilité

- Scripts reproductibles : `reco.preparer` → `reco.entrainer` → `reco.evaluer`
  (voir [`ai/README.md`](ai/README.md)).
- [`ai/benchmark_llm.pdf`](ai/benchmark_llm.pdf) : benchmark des modèles Ollama
  (10/11/2026), qui a conduit au choix de `qwen2.5:3b`, exécuté en local (budget
  zéro, aucune donnée envoyée à un tiers, ADR 0004).
- Tests automatisés sans modèle de langage : `python -m pytest tests -q`
  (17 tests, tous passent).

### 4. Swagger / OpenAPI

Service de l'équipe Data (FastAPI) : Swagger interactif sur
`http://localhost:8000/docs`, contrat exporté depuis le code dans
[`docs/livrables/openapi-service-ia.json`](docs/livrables/openapi-service-ia.json).
Les routes exigent l'en-tête `X-API-Key`.

| Route                        | Entrée                             | Sortie                                             |
| ---------------------------- | ---------------------------------- | -------------------------------------------------- |
| `POST /recommander`          | `description` libre de la boutique | 3 formules Givaudan, ingrédients, notes des 5 axes |
| `POST /recommander/curseurs` | 5 curseurs de 0 à 10               | Même résultat, sans modèle de langage, instantané  |
| `POST /answer`               | `question`                         | Réponse libre d'Ollama                             |

### 5. Endpoint accessible à l'équipe Tech via ngrok

```sh
cd ai && uvicorn main:app --env-file .env --port 8000
ngrok http 8000   # URL https://….ngrok-free.app transmise à l'équipe Tech
```

> À compléter : URL et capture de l'exposition ngrok utilisée lors de la Gate 1.

---

## Jeudi 12 : Prototype

### 1. Données nettoyées et préparées

Voir [Mardi, point 1](#1-dataset-exploitable) et le
[rapport qualité](#3-analyse-initiale-de-la-qualité).

### 2. Pipeline de traitement

| Étape           | Module                                       | Rôle                                                                                                                                    |
| --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A. Nettoyage    | [`nettoyage.py`](ai/reco/nettoyage.py)       | Doublons, conflits de familles, fabricants, devises                                                                                     |
| B. Profils      | [`profils.py`](ai/reco/profils.py)           | Chaque formule résumée sur 5 axes, pondérés par les quantités                                                                           |
| C. Lecture      | [`extraction.py`](ai/reco/extraction.py)     | La phrase du commerçant devient 5 notes ; le modèle de langage ne choisit jamais le parfum                                              |
| D. Distance     | [`moteur.py`](ai/reco/moteur.py)             | Classement des formules et ingrédients par distance pondérée                                                                            |
| E. Entraînement | [`entrainer.py`](ai/reco/entrainer.py)       | Choix du prompt et des poids des axes, sur le jeu d'entraînement seulement                                                              |
| F. Évaluation   | [`evaluer.py`](ai/reco/evaluer.py)           | Métriques sur le jeu de test                                                                                                            |
| G. Export       | [`exporter_sql.py`](ai/reco/exporter_sql.py) | Écrit [`db/init/006-givaudan-seed.sql`](db/init/006-givaudan-seed.sql) : formules, ingrédients et poids appris, chargés dans PostgreSQL |

```text
ai/data/raw/*.csv ─ preparer ─▶ ai/data/processed/ ─ entrainer ─▶ ai/models/modele_reco.json
                                        │                                  │
                                        └──────────── exporter_sql ────────┘
                                                          ▼
                                    db/init/006-givaudan-seed.sql (PostgreSQL)
                                                          ▼
                                    api/src/reco.ts ─▶ POST /api/recommandation
```

### 3. Modèle V2 publié

[`ai/models/modele_reco.json`](ai/models/modele_reco.json), version
`1.0.0-2026-11-12`, également chargé en base (table `reco_modele`) :

- lecture par `qwen2.5:3b`, prompt _few-shot_, température 0 ;
- poids appris des axes : boisé ×2, intensité ×2, chaleur ×1, fraîcheur ×1,
  floral ×0,5 ;
- découpage train/test enregistré dans le modèle (seed 42), donc rejouable.

### 4. Métriques et protocole de validation

**Jeu de référence : 40 descriptions de boutiques notées à la main**
([`cas_boutiques.csv`](ai/data/eval/cas_boutiques.csv)). Chaque cas indique les 5
notes attendues et les formules jugées pertinentes.

**Protocole**

1. Découpage au hasard (seed 42) : 26 cas d'entraînement, dont 3 servent
   d'exemples dans le prompt et ne sont pas mesurés, et **14 cas de test**.
2. Les 14 cas de test ne sont jamais lus pendant l'entraînement : le modèle est
   figé avant d'être évalué dessus.
3. Métriques : MAE des notes (sur 10) ; hit@1 et hit@3 (une formule pertinente
   en 1ʳᵉ position ou dans le top 3) ; MRR (inverse du rang de la première
   formule pertinente, en moyenne).

Au total, 37 cas sont mesurés : 23 en entraînement et 14 en test.

**Résultats sur les 14 cas de test**
([`evaluation_test.md`](ai/reports/evaluation_test.md))

| Configuration                          | MAE (/10) | hit@1 | hit@3    | MRR  |
| -------------------------------------- | --------- | ----- | -------- | ---- |
| V1 : mots-clés, poids égaux            | 1,40      | 43 %  | 57 %     | 0,57 |
| LLM, poids égaux                       | 1,31      | 50 %  | 57 %     | 0,61 |
| **V2 : LLM + poids appris (final)**    | 1,31      | 43 %  | **64 %** | 0,60 |
| Oracle (notes parfaites, poids appris) | —         | 36 %  | 64 %     | 0,55 |

Sur les 23 cas d'entraînement mesurés, les poids appris font passer le hit@3 de
78 % à 87 %. Latence du modèle de langage : médiane 4,4 s, maximum 9,7 s.

### 5. API qui renvoie les résultats réels du modèle

- `POST /api/recommandation` : description libre → 5 notes → formules et
  ingrédients Givaudan. Les curseurs corrigés par la boutique (`ajustements`)
  remplacent la lecture.
- `POST /api/recommandation/curseurs` : 5 notes de 0 à 10 → même résultat, sans
  modèle de langage.
- Les données et les poids viennent de la base, générés par
  `reco.exporter_sql` ; le moteur porté en TypeScript donne les mêmes résultats
  que le moteur Python sur les 14 cas de test
  ([ADR 0007](docs/adr/0007-recommandation-givaudan.md)).

### Limites connues

- 14 cas de test, c'est peu : un cas de plus ou de moins fait varier le hit@3 de
  7 points.
- Les notes des familles olfactives et les familles ajoutées à la main sont des
  choix de l'équipe, à faire valider par un parfumeur Givaudan.
- 13 formules seulement et des prix publics de détail, qui ne sont pas des
  tarifs Givaudan.
- Les demandes florales sont encore mal classées (cas 6, 12, 21 : lingerie,
  hôtel, bijouterie, au rang 6 ou 7).
- Deux implémentations du moteur (Python et TypeScript) à garder alignées.

### Reproduire

```sh
cd ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # renseigner API_KEY
ollama pull qwen2.5:3b
python -m reco.preparer         # données nettoyées + rapport qualité
python -m reco.entrainer        # modèle
python -m reco.evaluer          # métriques sur le jeu de test
python -m reco.exporter_sql     # données et poids pour PostgreSQL
python -m pytest tests -q
```
