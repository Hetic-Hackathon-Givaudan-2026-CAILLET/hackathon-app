# Livrable Data — Jeudi 12 : Prototype

| Capsule                                                                                                                     | Validation attendue                                                             |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 10h00–10h45 : critères de validation du modèle et jeu de référence. 13h45–14h30 : publier la V2 du modèle pour le prototype | Modèle exploitable et intégré au prototype Tech. **Revue du prototype à 16h30** |

---

## 1. Données nettoyées et préparées

[`ai/data/processed/`](../../ai/data/processed/), produit par
`python -m reco.preparer` à partir des 3 fichiers bruts :

| Donnée            | Volume                                                     |
| ----------------- | ---------------------------------------------------------- |
| Formules Givaudan | 13 formules, 363 lignes d'ingrédients                      |
| Ingrédients       | 410 dédoublonnés, dont 118 encore au catalogue 2024        |
| Prix              | 300 relevés, 25 ingrédients avec prix de référence à 100 g |
| Profils           | 5 notes de 0 à 10 par formule et par ingrédient            |

Détail des corrections : voir le livrable de lundi (point 3) et
[`rapport_qualite.json`](../../ai/data/processed/rapport_qualite.json).

## 2. Pipeline de traitement fonctionnel

| Étape           | Module                                             | Commande                      | Rôle                                                         |
| --------------- | -------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| A. Nettoyage    | [`nettoyage.py`](../../ai/reco/nettoyage.py)       | `python -m reco.preparer`     | Doublons, conflits de familles, fabricants, devises          |
| B. Profils      | [`profils.py`](../../ai/reco/profils.py)           | (incluse ci-dessus)           | Chaque formule et ingrédient résumé sur 5 axes               |
| C. Lecture      | [`extraction.py`](../../ai/reco/extraction.py)     | —                             | La phrase de la boutique devient 5 notes                     |
| D. Distance     | [`moteur.py`](../../ai/reco/moteur.py)             | —                             | Classement des formules et ingrédients par distance pondérée |
| E. Entraînement | [`entrainer.py`](../../ai/reco/entrainer.py)       | `python -m reco.entrainer`    | Choix du prompt et des poids, sur l'entraînement seulement   |
| F. Évaluation   | [`evaluer.py`](../../ai/reco/evaluer.py)           | `python -m reco.evaluer`      | Métriques sur le jeu de test                                 |
| G. Export       | [`exporter_sql.py`](../../ai/reco/exporter_sql.py) | `python -m reco.exporter_sql` | Données, produits et poids vers PostgreSQL                   |

```text
ai/data/raw/*.csv ─ preparer ─▶ ai/data/processed/ ─ entrainer ─▶ ai/models/modele_reco.json
                                        │                                  │
                                        └──────────── exporter_sql ────────┘
                                                          ▼
                                    db/init/006-givaudan-seed.sql (PostgreSQL)
                                                          ▼
                                    api/src/reco.ts ─▶ POST /api/recommandation ─▶ site
```

## 3. Modèle V2 publié

[`ai/models/modele_reco.json`](../../ai/models/modele_reco.json), version
`1.0.0-2026-11-12`, aussi chargé en base (table `reco_modele`).

| Élément               | V1 (baseline)      | V2 (publiée)                                                                 |
| --------------------- | ------------------ | ---------------------------------------------------------------------------- |
| Lecture de la demande | Mots-clés, sans IA | Modèle de langage `qwen2.5:3b`, local, prompt avec 3 exemples, température 0 |
| Poids des axes        | Tous à 1           | Appris : boisé ×2, intensité ×2, chaleur ×1, fraîcheur ×1, floral ×0,5       |
| Secours               | —                  | Mots-clés si le modèle de langage ne répond pas                              |

Comment la V2 a été choisie, sur l'entraînement seulement :

- **Lecture** : 3 options comparées sur l'erreur moyenne des notes (/10) :
  mots-clés 1,33 ; modèle de langage sans exemple 1,62 ; **avec 3 exemples
  1,30** (retenue).
- **Poids** : 243 combinaisons testées (0,5, 1 ou 2 par axe). Le top 3 passe de
  78 % à 87 % sur l'entraînement.

Le modèle de langage est pré-entraîné : l'équipe l'a choisi et guidé, pas
entraîné. Il ne choisit jamais la formule : il donne 5 notes, le calcul de
distance classe.

## 4. Métriques de performance et protocole de validation

**Jeu de référence : 40 descriptions de boutiques** rédigées et notées à la main
([`cas_boutiques.csv`](../../ai/data/eval/cas_boutiques.csv)), soit plus que les
30 cas demandés. Chaque cas indique les 5 notes attendues et les formules jugées
pertinentes.

**Protocole**

1. Découpage au hasard (graine 42) : 26 cas d'entraînement, dont 3 servent
   d'exemples dans le prompt et ne sont pas mesurés, et **14 cas de test**.
2. Le test n'est jamais lu pendant l'entraînement : le modèle est figé avant
   d'être évalué.
3. Le découpage est enregistré dans le modèle : l'évaluation est rejouable.

Au total, 37 cas sont mesurés : 23 en entraînement, 14 en test.

**Critères de validation**

| Métrique | Ce qu'elle mesure                                                   |
| -------- | ------------------------------------------------------------------- |
| MAE      | Erreur moyenne entre les notes lues et les notes attendues (sur 10) |
| hit@1    | Part des cas où une formule pertinente est classée 1ʳᵉ              |
| hit@3    | Part des cas où une formule pertinente est dans le top 3            |
| MRR      | Moyenne de l'inverse du rang de la première formule pertinente      |

**Résultats sur les 14 cas de test**
([`evaluation_test.md`](../../ai/reports/evaluation_test.md))

| Configuration                             | MAE (/10) | hit@1 |    hit@3 |  MRR |
| ----------------------------------------- | --------: | ----: | -------: | ---: |
| V1 : mots-clés, poids égaux               |      1,40 |  43 % |     57 % | 0,57 |
| Modèle de langage, poids égaux            |      1,31 |  50 % |     57 % | 0,61 |
| **V2 : modèle de langage + poids appris** |      1,31 |  43 % | **64 %** | 0,60 |
| Plafond : notes parfaites, poids appris   |         — |  36 % |     64 % | 0,55 |

- La V2 atteint le plafond : même avec des notes parfaites, on ne ferait pas
  mieux avec ces 13 formules et ces profils.
- Temps de lecture par le modèle de langage : 4,4 s en médiane, 9,7 s au plus.

## 5. API fonctionnelle renvoyant les résultats réels du modèle

Le modèle est intégré au site, dans l'API Express
([ADR 0007](../adr/0007-recommandation-givaudan.md)) :

| Route                               | Entrée            | Sortie                                                           |
| ----------------------------------- | ----------------- | ---------------------------------------------------------------- |
| `POST /api/recommandation`          | Description libre | 5 notes lues par le modèle de langage, 3 formules, 5 ingrédients |
| `POST /api/recommandation/curseurs` | 5 notes de 0 à 10 | Même résultat, sans modèle de langage, instantané                |

- Les formules, ingrédients et poids viennent de PostgreSQL, générés par
  `reco.exporter_sql` à partir de `ai/data/raw`.
- **Contrôle** : sur les 14 cas de test, l'API du site donne exactement le même
  top 3 que le moteur Python.
- **Sur le site** : la section « Souhaitez-vous ajuster votre requête ? »
  affiche les 5 curseurs réglés par le modèle et les 3 formules recommandées.
  Les produits vendus sont les 13 formules Givaudan : on peut les ajouter au
  panier et les commander.

Exemple de réponse réelle, pour « Barbier pour hommes, une odeur boisée et cuir,
assez présente » :

| Rang | Formule           | Correspondance |
| ---: | ----------------- | -------------: |
|    1 | Masculine MM1006  |           82 % |
|    2 | AP Roll-on UR1007 |           66 % |
|    3 | Feminine FM1006   |           65 % |

Notes lues par le modèle : chaleur 6, fraîcheur 1, floral 0, boisé 9,
intensité 7.

---

## Validation

**Modèle exploitable** : V2 publiée et versionnée, mesurée selon un protocole
écrit (hit@3 = 64 % contre 57 % pour la V1).

**Intégré au prototype Tech** : appelé par l'API du site à chaque demande,
affiché dans la page de sélection, relié au panier et aux commandes.

**Limites à présenter**

- 14 cas de test, c'est peu : un cas de plus ou de moins fait varier le hit@3 de
  7 points.
- Les 40 boutiques de référence ont été écrites par l'équipe, pas par de vrais
  clients.
- Les notes des familles olfactives sont un choix de l'équipe, à faire valider
  par un parfumeur Givaudan.
- Les demandes florales sont encore mal classées (lingerie, hôtel, bijouterie :
  première formule pertinente au rang 6 ou 7).
- 13 formules seulement, conçues pour d'autres usages que le parfum d'ambiance ;
  prix publics de détail, pas des tarifs Givaudan.
- Deux versions du moteur (Python et TypeScript) à garder alignées.

## Reproduire

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
