# Livrable Data — Mardi 10 : Gate 1

| Capsule                                                                                                                    | Validation attendue                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 9h30–10h15 : prise en main d'Orange, explorer et nettoyer l'échantillon. 13h45–14h30 : premier résultat et Swagger factice | Faisabilité Data démontrée et contrat d'interface transmis à Tech. **Gate 1 à 16h00** |

---

## 1. Dataset exploitable

[`ai/data/processed/`](../../ai/data/processed/), régénéré par
`python -m reco.preparer` à partir de `ai/data/raw/` :

| Fichier                                                                | Contenu                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`ingredients.csv`](../../ai/data/processed/ingredients.csv)           | 410 ingrédients dédoublonnés : famille, notes sur 5 axes, présence au catalogue, prix €/kg |
| [`formules_lignes.csv`](../../ai/data/processed/formules_lignes.csv)   | 363 lignes de formules enrichies : famille, fabricant corrigé                              |
| [`formules_profils.csv`](../../ai/data/processed/formules_profils.csv) | 13 formules résumées sur 5 axes                                                            |
| [`rapport_qualite.json`](../../ai/data/processed/rapport_qualite.json) | Chaque correction comptée (doublons, conflits, devises…)                                   |

**Les 5 axes**, notés de 0 à 10 : chaleur, fraîcheur, floral, boisé, intensité.

- Un ingrédient reçoit les notes de sa famille olfactive (25 familles,
  [`referentiels.py`](../../ai/reco/referentiels.py)).
- Une formule est la moyenne de ses ingrédients, pondérée par leur pourcentage,
  solvants exclus, puis remise à l'échelle 0 à 10.

Exemple : _Blueberry muffin_ = chaleur 10 ; fraîcheur 1,4 ; floral 2,9 ;
boisé 0,3 ; intensité 7,8.

## 2. Premier résultat représentatif : baseline (V1)

La **V1** lit la description de la boutique par mots-clés, sans IA. Des règles
la traduisent en 5 notes, puis on retient les formules les plus proches
(distance, poids égaux).

| Mesure sur les 14 cas de test              |          V1 (mots-clés) |
| ------------------------------------------ | ----------------------: |
| Erreur moyenne sur les notes (/10)         |                    1,40 |
| Formule pertinente en 1ʳᵉ position (hit@1) |                    43 % |
| Formule pertinente dans le top 3 (hit@3)   | **57 %** (8 cas sur 14) |

C'est la référence que la V2 doit battre.

## 3. Preuve de faisabilité (script ou notebook)

- Scripts reproductibles, dans `ai/` :
  `python -m reco.preparer` → `python -m reco.entrainer` →
  `python -m reco.evaluer` (voir [`ai/README.md`](../../ai/README.md)).
- Tests automatisés sans modèle de langage :
  `python -m pytest tests -q` (17 tests).
- Benchmark des modèles Ollama du 10/11/2026, qui a conduit au choix de
  `qwen2.5:3b` en local : `ai/benchmark_llm.pdf`, sur la branche
  `docs/livrable-data`.

## 4. Premier Swagger / OpenAPI (entrées et sorties)

Service de l'équipe Data (FastAPI, [`ai/main.py`](../../ai/main.py)) : Swagger
interactif sur `http://localhost:8000/docs`. Le contrat exporté est dans
`docs/livrables/openapi-service-ia.json`, sur la branche `docs/livrable-data`.
Toutes les routes exigent l'en-tête `X-API-Key`.

| Route                        | Entrée                                                               | Sortie                                                         |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `POST /recommander`          | `description` libre (3 à 1000 caractères), `ajustements` facultatifs | 3 formules, 5 ingrédients, notes utilisées, méthode de lecture |
| `POST /recommander/curseurs` | 5 notes entières de 0 à 10                                           | Même résultat, sans modèle de langage                          |
| `POST /answer`               | `question`                                                           | Réponse libre d'Ollama                                         |

Exemple d'entrée et de sortie (abrégée) :

```json
{
  "description": "Salon de coiffure de quartier, une odeur fraîche et propre, un peu florale, pas trop forte"
}
```

```json
{
  "scores_utilises": {
    "chaleur": 2,
    "fraicheur": 9,
    "floral": 4,
    "boise": 1,
    "intensite": 4
  },
  "methode_lecture": "llm",
  "formules": [
    {
      "rang": 1,
      "nom": "Shampoo HR1009 /2 (Givaudan)",
      "correspondance_pct": 76.2,
      "pourquoi": "Proche sur intensité (4 pour 4 demandé) et boisé (0 pour 1 demandé). Plus éloigné sur floral : la formule est plus marquée (9 pour 4)."
    }
  ],
  "ingredients": [
    {
      "nom": "…",
      "famille": "…",
      "correspondance_pct": 0,
      "prix_indicatif_eur_kg": null
    }
  ]
}
```

## 5. Endpoint dummy accessible à Tech via ngrok

```sh
cd ai && uvicorn main:app --env-file .env --port 8000
ngrok http 8000   # l'URL https://….ngrok-free.app est transmise à l'équipe Tech
```

> **À compléter** : URL et capture de l'exposition ngrok utilisée lors de la
> Gate 1. Le dépôt n'en garde pas de trace.

---

## Validation

**Faisabilité Data démontrée** : dataset exploitable, baseline mesurée
(hit@3 = 57 %), pipeline rejouable par scripts.

**Contrat d'interface transmis à Tech** : routes, entrées et sorties décrites
ci-dessus et dans le Swagger. L'équipe Tech les a reprises à l'identique dans
l'API du site (voir le livrable de jeudi).

> **À compléter** : la capsule mentionne Orange. Le dépôt ne contient pas de
> fichier Orange (`.ows`) : si l'équipe l'a utilisé pour explorer
> l'échantillon, ajouter le fichier ou des captures.
