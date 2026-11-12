# Livrables Data/IA

Recommandation de fragrances Givaudan pour les boutiques : un commerçant décrit
l'odeur qu'il veut, le modèle propose les formules et produits les plus proches.
Le code est dans [`ai/`](ai/), sa documentation technique dans
[`ai/README.md`](ai/README.md).

| Jour                  | Section                                                 |
| --------------------- | ------------------------------------------------------- |
| Lundi 9 : Exploration | [Sources et qualité](#lundi-9--exploration)             |
| Mardi 10 : Gate 1     | [Faisabilité et contrat d'interface](#mardi-10--gate-1) |
| Jeudi 12 : Prototype  | [Modèle V2 et API](#jeudi-12--prototype)                |

---

## Lundi 9 : Exploration

### 1. Inventaire des sources de données

Givaudan ne fournit pas de données internes. Toutes les données viennent de
sources publiques, citées ligne par ligne dans la colonne `source` (ou `url`) de
chaque fichier.

| Fichier ([`ai/data/raw/`](ai/data/raw/))                                         | Contenu                                                         | Lignes         | Provenance et accès                                                                                                      |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`givaudan_formules_demo.csv`](ai/data/raw/givaudan_formules_demo.csv)           | 13 formules de démonstration, ingrédient par ingrédient         | 363            | The Good Scents Company (pages publiques des formules de démo), relevé manuel                                            |
| [`givaudan_anciens_catalogues.csv`](ai/data/raw/givaudan_anciens_catalogues.csv) | Ingrédients des catalogues et leur famille olfactive            | 493            | _The Major Catalog's of Fragrance_ (G. Brechbill) : catalogues Givaudan, Givaudan-Roure, Givco, Quest International      |
| [`givaudan_prix_revendeurs.csv`](ai/data/raw/givaudan_prix_revendeurs.csv)       | Prix publics des ingrédients chez des revendeurs                | 300            | Sites des revendeurs (Fraterworks pour 294 lignes, The Fragrance Foundry, Scentspiracy, Hekserij), relevés le 11/11/2026 |
| [`givaudan_finances.csv`](ai/data/raw/givaudan_finances.csv)                     | Chiffres clés du groupe (CA, EBITDA, résultat, effectifs)       | 20 (2005–2026) | Rapports annuels et presse spécialisée                                                                                   |
| [`givaudan_historique.csv`](ai/data/raw/givaudan_historique.csv)                 | Dates clés de l'entreprise                                      | 32             | Site Givaudan et sources historiques                                                                                     |
| [`story.txt`](ai/data/raw/story.txt)                                             | Dossier d'entreprise rédigé (présentation, histoire, direction) | ~2 900 mots    | Synthèse de sources publiques                                                                                            |
| [`ai/data/site/produits_familles.csv`](ai/data/site/produits_familles.csv)       | Familles olfactives des 18 produits du site de l'équipe         | 18             | Saisie de l'équipe, à partir du catalogue du site (`GET /api/catalog`)                                                   |

Le modèle de recommandation utilise les trois premiers fichiers. Les données
financières et l'historique servent au contexte et au pitch.

### 2. Premier échantillon

Les fichiers bruts sont versionnés tels quels dans
[`ai/data/raw/`](ai/data/raw/) : séparateur `;`, encodage UTF-8, une source par
ligne.

### 3. Analyse initiale de la qualité

Mesurée par le nettoyage (`python -m reco.preparer`) et enregistrée dans
[`ai/data/processed/rapport_qualite.json`](ai/data/processed/rapport_qualite.json).

| Fichier    | Constat                                                                                                                                                      | Traitement                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Catalogues | 493 lignes pour 411 ingrédients : **82 doublons** entre catalogues                                                                                           | Fusion sur un nom normalisé                                                                                                 |
| Catalogues | **11 ingrédients avec des familles contradictoires** selon le catalogue (ex. Aldehyde C 110 : « Aldéhydé » chez Givaudan, « Hespéridé » chez Givaudan-Roure) | Règle de priorité : le catalogue Givaudan l'emporte ; détail de chaque conflit dans le rapport                              |
| Catalogues | 1 ingrédient sans odeur ; seulement 118 ingrédients encore au catalogue 2024                                                                                 | Exclu du calcul ; l'information « encore au catalogue » est conservée                                                       |
| Formules   | 363 lignes : 148 ingrédients trouvés dans les catalogues, 207 non trouvés, 8 solvants                                                                        | Table de familles complétée à la main ([`reco/referentiels.py`](ai/reco/referentiels.py)) ; 0 ingrédient reste sans famille |
| Formules   | 4 fabricants mal renseignés (ex. Berryflor noté « générique » alors qu'il est Givaudan)                                                                      | Corrigés                                                                                                                    |
| Formules   | `dilution_utilisee` vide sur 330 lignes sur 363                                                                                                              | Colonne non utilisée par le modèle                                                                                          |
| Prix       | 3 devises (USD 294, GBP 4, EUR 2) ; 57 lignes sans taille exploitable                                                                                        | Conversion en €/kg à taux indicatifs ; 69 produits rapprochés du catalogue, 25 avec un prix de référence à 100 g            |

### 4. Solution de repli si les données manquent

- **Pas de données internes Givaudan.** C'est le cas : nous avons reconstruit le
  jeu à partir de sources publiques (formules de démonstration, catalogues
  historiques, prix revendeurs).
- **Pas de jeu étiqueté.** L'équipe a rédigé et noté à la main 40 descriptions
  de boutiques ([`cas_boutiques.csv`](ai/data/eval/cas_boutiques.csv)) et 18
  demandes vagues ([`cas_vagues.csv`](ai/data/eval/cas_vagues.csv)).
- **Ollama indisponible ou réponse invalide.** Après 2 essais, le service bascule
  automatiquement sur la lecture par mots-clés, sans IA
  ([`reco/extraction.py`](ai/reco/extraction.py)).
- **Catalogue du site injoignable.** Les routes `/site/...` répondent une erreur
  503 explicite au lieu d'inventer des produits.

---

## Mardi 10 : Gate 1

### 1. Dataset exploitable

[`ai/data/processed/`](ai/data/processed/), régénéré par
`python -m reco.preparer` :

| Fichier                                                          | Contenu                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`ingredients.csv`](ai/data/processed/ingredients.csv)           | 410 ingrédients dédoublonnés, famille, note sur 5 axes, prix €/kg              |
| [`formules_lignes.csv`](ai/data/processed/formules_lignes.csv)   | 363 lignes de formules enrichies (famille, fabricant corrigé)                  |
| [`formules_profils.csv`](ai/data/processed/formules_profils.csv) | 13 formules résumées sur 5 axes : chaleur, fraîcheur, floral, boisé, intensité |

### 2. Premier résultat : baseline (V1)

La **V1** est une lecture par mots-clés, sans IA : des règles transforment la
description en 5 notes, puis on choisit les formules les plus proches. Sur les 14
cas de test, **hit@3 = 57 %** (une formule pertinente dans le top 3 pour 8 cas
sur 14). C'est la référence que la V2 doit battre.

### 3. Preuve de faisabilité

- Scripts reproductibles, sans notebook : `reco.preparer` → `reco.entrainer` →
  `reco.evaluer` (voir [`ai/README.md`](ai/README.md)).
- Choix du LLM : [`ai/benchmark_llm.pdf`](ai/benchmark_llm.pdf), qui a retenu
  `qwen2.5:3b`, exécuté en local via Ollama (budget zéro, aucune donnée envoyée à
  un tiers, ADR 0004).
- 36 tests automatisés, sans LLM : `python -m pytest tests -q` (36 passent).

### 4. Swagger / OpenAPI

- Swagger interactif : `http://localhost:8000/docs` une fois le service lancé.
- Contrat exporté depuis le code : [`docs/livrables/openapi.json`](docs/livrables/openapi.json).
- Toutes les routes exigent l'en-tête `X-API-Key`.

| Route                        | Entrée                                  | Sortie                                                |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `POST /recommander`          | `description` libre de la boutique      | 3 formules Givaudan, ingrédients, scores des 5 axes   |
| `POST /recommander/curseurs` | 5 curseurs de 0 à 10                    | Même résultat, sans LLM                               |
| `POST /site/recommander`     | Demande du commerçant (chatbot du site) | 4 produits du site + position conseillée des curseurs |
| `POST /site/curseurs`        | Curseurs du site réglés par le client   | 4 nouveaux produits (~20 ms)                          |
| `POST /answer`               | `question`                              | Réponse libre d'Ollama                                |

### 5. Endpoint accessible à l'équipe Tech via ngrok

```sh
cd ai && uvicorn main:app --env-file .env --port 8000
ngrok http 8000      # l'URL https://….ngrok-free.app est transmise à l'équipe Tech
```

> À compléter : URL et capture de l'exposition ngrok utilisée lors de la Gate 1.

---

## Jeudi 12 : Prototype

### 1. Données nettoyées et préparées

Voir [Mardi, point 1](#1-dataset-exploitable) et le
[rapport qualité](#3-analyse-initiale-de-la-qualité).

### 2. Pipeline de traitement

| Étape            | Module                                                                               | Rôle                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| A. Nettoyage     | [`nettoyage.py`](ai/reco/nettoyage.py)                                               | Doublons, conflits de familles, fabricants, devises                                      |
| B. Profils       | [`profils.py`](ai/reco/profils.py)                                                   | Chaque formule résumée sur 5 axes, pondérés par les quantités                            |
| C. Lecture LLM   | [`extraction.py`](ai/reco/extraction.py)                                             | La phrase du commerçant devient 5 notes (le LLM ne choisit jamais le parfum)             |
| D. Distance      | [`moteur.py`](ai/reco/moteur.py)                                                     | Classement des formules par distance pondérée                                            |
| E. Entraînement  | [`entrainer.py`](ai/reco/entrainer.py)                                               | Choix du prompt et apprentissage des poids des axes, sur le jeu d'entraînement seulement |
| F. Évaluation    | [`evaluer.py`](ai/reco/evaluer.py), [`evaluer_vagues.py`](ai/reco/evaluer_vagues.py) | Métriques sur le jeu de test                                                             |
| G. Métiers       | [`metiers.py`](ai/reco/metiers.py)                                                   | Demande vague (« je suis coiffeur ») : profil type d'environ 40 métiers                  |
| H. Produits site | [`site.py`](ai/reco/site.py)                                                         | Projection sur les produits et curseurs du site                                          |

### 3. Modèle V2 publié

[`ai/models/modele_reco.json`](ai/models/modele_reco.json), version
`1.0.0-2026-11-12` :

- lecture par LLM `qwen2.5:3b`, prompt _few-shot_, température 0 ;
- poids appris des axes : boisé ×2, intensité ×2, chaleur ×1, fraîcheur ×1,
  floral ×0,5 ;
- découpage train/test enregistré dans le modèle (seed 42), donc rejouable.

### 4. Métriques et protocole de validation

**Jeu de référence : 58 cas étiquetés à la main**, soit 40 descriptions de
boutiques et 18 demandes vagues.

**Protocole**

1. Chaque cas indique les 5 notes attendues et les formules jugées pertinentes.
2. Les 40 cas sont découpés au hasard (seed 42) : 26 pour l'entraînement (dont 3
   servent d'exemples dans le prompt et ne sont pas mesurés), **14 pour le test**.
3. Les 14 cas de test ne sont jamais lus pendant l'entraînement. Le modèle est
   figé avant d'être évalué dessus.
4. Métriques : MAE des notes (sur 10) ; hit@1 et hit@3 (une formule pertinente
   en 1ʳᵉ position ou dans le top 3) ; MRR (rang moyen inverse de la première
   formule pertinente).

**Résultats sur les 14 cas de test**
([`evaluation_test.md`](ai/reports/evaluation_test.md))

| Configuration                          | MAE (/10) | hit@1 | hit@3    | MRR  |
| -------------------------------------- | --------- | ----- | -------- | ---- |
| V1 : mots-clés, poids égaux            | 1,40      | 43 %  | 57 %     | 0,57 |
| LLM, poids égaux                       | 1,31      | 50 %  | 57 %     | 0,61 |
| **V2 : LLM + poids appris (final)**    | 1,31      | 43 %  | **64 %** | 0,60 |
| Oracle (notes parfaites, poids appris) | —         | 36 %  | 64 %     | 0,55 |

Sur l'entraînement (23 cas mesurés), les poids appris font passer le hit@3 de
78 % à 87 %. Latence du LLM : médiane 4,4 s, maximum 9,7 s.

**Demandes vagues (18 cas)** ([`evaluation_vagues.md`](ai/reports/evaluation_vagues.md))

| Lecture                  | hit@1 | hit@3 | MRR  |
| ------------------------ | ----- | ----- | ---- |
| LLM seul                 | 22 %  | 39 %  | 0,39 |
| Avec le profil du métier | 50 %  | 89 %  | 0,68 |

### 5. API qui renvoie les résultats réels du modèle

- Service IA (FastAPI, `ai/`) : routes `/site/recommander` et `/site/curseurs`.
- L'API Express de l'application les relaie
  ([`api/src/routes/recommandation.ts`](api/src/routes/recommandation.ts)) :
  `POST /recommandation` (chatbot, délai de 90 s pour le premier chargement du
  LLM) et `POST /recommandation/curseurs` (30 s).
- Le front appelle ces routes (`web/src/api.ts`, `web/src/actions.ts`).
- Configuration sans valeur codée en dur (ADR 0002) : `MODEL_API_URL` et
  `MODEL_API_KEY` dans `api/.env`.
- Intégration côté site : [`docs/integration/modele-recommandation.md`](docs/integration/modele-recommandation.md).

### Limites connues

- 14 cas de test, c'est peu : un cas de plus ou de moins fait bouger hit@3 de
  7 points.
- Les notes des familles olfactives et les profils « métier » sont des choix de
  l'équipe, à faire valider par un parfumeur Givaudan. Le score de 89 % sur les
  demandes vagues est optimiste : certains profils ont été fixés après lecture
  des cas étiquetés.
- Le catalogue ne contient que 13 formules et des prix publics de détail, pas les
  prix professionnels de Givaudan.
- Les familles florales sont encore mal distinguées (cas 6, 12, 21 : bijouterie,
  hôtel, lingerie classés au rang 6 ou 7).

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
python -m pytest tests -q
uvicorn main:app --env-file .env --port 8000
```
