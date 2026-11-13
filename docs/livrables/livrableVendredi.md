# Livrable Data — Vendredi 13 : Finalisation

| Capsule                                                                           | Validation attendue                                                                    |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 9h30–10h15 : raconter la valeur de la donnée (visualisations, limites et sources) | Solution reproductible et résultats présentables au jury. **Dossier de pitch à 13h30** |

---

## 1. Code et documentation finalisés

| Élément                  | Où                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline Data (Python)   | [`ai/reco/`](../../ai/reco/) : nettoyage, profils, lecture, moteur, entraînement, évaluation, export                                                                                |
| Service de démonstration | [`ai/main.py`](../../ai/main.py) (FastAPI, Swagger sur `http://localhost:8000/docs`)                                                                                                |
| Modèle publié            | [`ai/models/modele_reco.json`](../../ai/models/modele_reco.json), version `1.0.0-2026-11-12`                                                                                        |
| Intégration dans le site | [`api/src/reco.ts`](../../api/src/reco.ts) et [`api/src/routes/recommandation.ts`](../../api/src/routes/recommandation.ts), données dans `db/init/005-006`                          |
| Tests automatisés        | [`ai/tests/test_reco.py`](../../ai/tests/test_reco.py) : 17 tests, sans modèle de langage                                                                                           |
| Documentation            | [`ai/README.md`](../../ai/README.md), [ADR 0007](../adr/0007-recommandation-givaudan.md), livrables [lundi](livrableLundi.md), [mardi](livrableMardi.md), [jeudi](livrableJeudi.md) |

## 2. Procédure de reproduction des résultats

Depuis le dossier `ai/`, avec Ollama lancé :

```sh
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # renseigner API_KEY
ollama pull qwen2.5:3b
python -m reco.preparer           # 1. données nettoyées + rapport qualité
python -m reco.entrainer          # 2. choix du prompt et des poids (entraînement seul)
python -m reco.evaluer            # 3. métriques sur les 14 cas de test
python -m reco.exporter_sql       # 4. données et poids vers PostgreSQL (site)
python -m pytest tests -q         # 5. tests
```

- **Rejouable à l'identique** : découpage entraînement / test fixé (graine 42, enregistré dans le modèle), température 0.
- **Résultats attendus** : [`ai/reports/evaluation_test.md`](../../ai/reports/evaluation_test.md). Les chiffres de la section 3 doivent être retrouvés.
- **Contrôle d'intégration** : sur les 14 cas de test, l'API du site donne le même top 3 que le moteur Python.

## 3. Comparaison V1 / V2 avec métriques

Mesures sur les **14 cas de test**, jamais vus pendant l'entraînement :

| Configuration                             | Erreur sur les notes (/10) | hit@1 |    hit@3 |  MRR |
| ----------------------------------------- | -------------------------: | ----: | -------: | ---: |
| **V1** : mots-clés, poids égaux           |                       1,40 |  43 % |     57 % | 0,57 |
| Modèle de langage, poids égaux            |                       1,31 |  50 % |     57 % | 0,61 |
| **V2** : modèle de langage + poids appris |                       1,31 |  43 % | **64 %** | 0,60 |
| Plafond : notes parfaites, poids appris   |                          — |  36 % |     64 % | 0,55 |

```text
Bonne formule dans le top 3 (hit@3)
V1  (mots-clés)          ███████████▍         57 %
V2  (IA + poids appris)  ████████████▊        64 %
Plafond (notes parfaites)████████████▊        64 %
```

**Ce que ça montre**

- L'IA lit mieux la demande que les mots-clés : l'erreur moyenne passe de 1,40 à 1,31.
- Les poids appris (boisé ×2, intensité ×2, floral ×0,5) font monter le hit@3 de 57 % à 64 %.
- La V2 atteint le plafond : avec ces 13 formules, même des notes parfaites ne feraient pas mieux.
- Temps de réponse de l'IA : 4,4 s en médiane, 9,7 s au plus. Les curseurs, sans IA, sont instantanés.

## 4. Analyse des limites et des biais

| Limite ou biais                    | Constat                                                                                                                            | Conséquence                                                       | Piste                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Peu de cas de test**             | 14 cas : un cas de plus ou de moins fait varier le hit@3 de 7 points                                                               | Les écarts V1 / V2 restent fragiles                               | Plus de cas, idéalement venus de vraies boutiques                  |
| **Cas écrits par l'équipe**        | Les 40 boutiques de référence et leurs réponses attendues ont été rédigées par l'équipe                                            | Biais d'annotation : le modèle est jugé avec notre propre regard  | Faire noter les cas par un parfumeur Givaudan                      |
| **Demandes florales mal classées** | Lingerie, hôtel, bijouterie, salon esthétique : 1ʳᵉ formule pertinente au rang 5 à 7                                               | Les boutiques « florales » reçoivent de moins bonnes propositions | Revoir les notes des familles florales ; plus de formules florales |
| **Poids floral appris à ×0,5**     | L'entraînement a réduit l'importance du floral pour gagner sur les autres cas                                                      | Aggrave le point précédent                                        | Réapprendre les poids avec plus de cas floraux                     |
| **Notes des familles olfactives**  | Les notes sur 5 axes des 25 familles sont un choix de l'équipe                                                                     | Tout le classement en dépend                                      | Validation par un parfumeur                                        |
| **13 formules seulement**          | Formules de démonstration conçues pour d'autres usages (shampooing, adoucissant…) que la fragrance d'ambiance                      | Le choix proposé à la boutique est limité                         | Données internes Givaudan                                          |
| **Notes extrêmes de l'IA**         | Le modèle de langage donne souvent 1 ou 9, rarement des valeurs moyennes                                                           | Profils lus parfois trop tranchés                                 | Curseurs pour corriger ; plus d'exemples dans le prompt            |
| **Prix**                           | Prix publics de revendeurs (USD surtout), convertis à taux indicatifs : 25 ingrédients seulement avec un prix de référence à 100 g | Prix indicatifs, pas des tarifs Givaudan                          | Tarifs internes                                                    |
| **Sources et licences**            | Données publiques mais pas forcément libres de droits                                                                              | Usage pédagogique uniquement                                      | Vérifier les droits ou passer aux données Givaudan                 |

## 5. Résultats Data intégrés à la démonstration finale

Dans le site, page de sélection, section **« Souhaitez-vous ajuster votre requête ? »** :

| Ce que voit le jury                                    | Résultat Data derrière                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Les 5 curseurs réglés automatiquement                  | Lecture de la demande par le modèle V2 (`qwen2.5:3b`, local) |
| 3 formules Givaudan avec un % de correspondance        | Profils des 13 formules + poids appris                       |
| Le profil de chaque formule (barres sur 5 axes)        | Profils calculés par `reco.preparer`                         |
| Ingrédients encore au catalogue 2024 et prix indicatif | Nettoyage des catalogues (118 encore vendus) et des 300 prix |
| Curseur déplacé : formules recalculées aussitôt        | Même moteur, sans modèle de langage                          |
| Ajout au panier et commande                            | Les 13 formules exportées comme produits du site             |

**Scénario de démonstration conseillé** : « Barbier pour hommes, une odeur boisée et cuir, assez présente ».
Résultat attendu : Masculine MM1006 en 1ʳᵉ position (82 %), puis un curseur déplacé en direct.

---

## Raconter la valeur de la donnée (capsule 9h30)

- **Sources** : 3 sources publiques (formules, anciens catalogues, prix de revendeurs), sans données internes Givaudan.
- **Visualisations** : chaîne des données (sources → nettoyage → profils → modèle → site), profil d'une formule sur 5 axes, comparaison V1 / V2 ci-dessus.
- **Valeur** : une boutique décrit une ambiance avec ses mots ; la donnée nettoyée permet de lui proposer en quelques secondes les fragrances Givaudan les plus proches.
- **Limites** : section 4, à dire franchement au jury.

## Validation

**Solution reproductible** : 5 commandes, découpage et température fixés, résultats de référence versionnés, 17 tests.

**Résultats présentables au jury** : V2 mesurée (hit@3 64 % contre 57 %), limites et biais identifiés, résultats visibles dans le site.

> **À compléter** : dépôt du dossier de pitch à 13h30 (lien OneDrive).
