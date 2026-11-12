# Livrable Data — Lundi 9 : Exploration

| Capsule                                                            | Validation attendue                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| 14h45–15h30 : accès réel aux données, sources, premier échantillon | Données accessibles et faisabilité initiale documentée |

**Projet** : recommandation de fragrances Givaudan pour les boutiques. Un
commerçant décrit l'odeur qu'il veut ; le modèle propose les formules et les
ingrédients Givaudan les plus proches.

---

## 1. Inventaire des sources de données et modalités d'accès

Givaudan ne fournit pas de données internes. Toutes les données viennent de
sources publiques, citées ligne par ligne dans la colonne `source` (ou `url`) de
chaque fichier.

| Fichier ([`ai/data/raw/`](../../ai/data/raw/))                                         | Contenu                                                    | Lignes | Provenance                                                                                                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`givaudan_formules_demo.csv`](../../ai/data/raw/givaudan_formules_demo.csv)           | 13 formules de démonstration, ingrédient par ingrédient    |    363 | The Good Scents Company, pages publiques des formules de démo Givaudan                                                                  |
| [`givaudan_anciens_catalogues.csv`](../../ai/data/raw/givaudan_anciens_catalogues.csv) | Ingrédients, famille olfactive, présence au catalogue 2024 |    493 | _The Major Catalog's of Fragrance_ (G. Brechbill) : Quest International (223), Givaudan (156), Givaudan-Roure (78), Givaudan Givco (36) |
| [`givaudan_prix_revendeurs.csv`](../../ai/data/raw/givaudan_prix_revendeurs.csv)       | Prix publics des ingrédients chez des revendeurs           |    300 | Fraterworks (294), The Fragrance Foundry (4), Scentspiracy (1), Hekserij (1), relevés le 11/11/2026                                     |

**Modalités d'accès**

- Format : CSV, séparateur `;`, UTF-8 avec BOM.
- Aucun compte, aucune clé, aucun accès privé.
- Fichiers versionnés dans le dépôt : toute l'équipe travaille sur les mêmes
  données.

## 2. Premier échantillon récupéré

Les trois fichiers sont versionnés tels quels dans
[`ai/data/raw/`](../../ai/data/raw/). Extraits :

**Formules** (`givaudan_formules_demo.csv`)

| id_formule | nom_formule                    | rang | ingredient                  | fabricant_ingredient | pourcentage |
| ---------: | ------------------------------ | ---: | --------------------------- | -------------------- | ----------: |
|          1 | Blueberry muffin /2 (Givaudan) |    1 | BUCHU LEAF OIL SOUTH AFRICA | Générique / naturel  |         0,1 |
|          1 | Blueberry muffin /2 (Givaudan) |    2 | MALTYL ISOBUTYRATE          | Générique / naturel  |         0,2 |
|          1 | Blueberry muffin /2 (Givaudan) |    3 | ETHYL METHYL-2-BUTYRATE     | Givaudan             |         0,2 |

**Catalogues** (`givaudan_anciens_catalogues.csv`)

| catalogue                        | nom_produit           | famille_olfactive | encore_au_catalogue_2024 |
| -------------------------------- | --------------------- | ----------------- | ------------------------ |
| Givaudan - catalogue ingrédients | Acetal CD             | Vert              | oui                      |
| Givaudan - catalogue ingrédients | Adoxal                | Aldéhydé          | oui                      |
| Givaudan - catalogue ingrédients | Aldehyde C 10 Decylic | Aldéhydé          | non                      |

**Prix** (`givaudan_prix_revendeurs.csv`)

| produit  | revendeur   | qualite   | taille_g |  prix | devise | prix_au_kg |
| -------- | ----------- | --------- | -------: | ----: | ------ | ---------: |
| Ambrofix | Fraterworks | 100 % pur |        1 |  8,00 | USD    |      8 000 |
| Ambrofix | Fraterworks | 100 % pur |        5 | 12,00 | USD    |      2 400 |
| Ambrofix | Fraterworks | 100 % pur |       15 | 28,00 | USD    |   1 866,67 |

## 3. Analyse initiale de la qualité des données

Mesurée par le nettoyage (`python -m reco.preparer`) et enregistrée dans
[`ai/data/processed/rapport_qualite.json`](../../ai/data/processed/rapport_qualite.json).

| Fichier    | Constat                                                                                                              | Traitement                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Catalogues | 493 lignes pour 411 ingrédients : **82 doublons** entre catalogues                                                   | Fusion sur un nom normalisé (majuscules, dilution retirée, alias)                                     |
| Catalogues | **11 familles contradictoires** (ex. Aldehyde C 110 : « Aldéhydé » chez Givaudan, « Hespéridé » chez Givaudan-Roure) | Le catalogue Givaudan l'emporte ; chaque conflit est détaillé dans le rapport                         |
| Catalogues | 1 ingrédient sans odeur ; 118 ingrédients seulement encore au catalogue 2024                                         | Exclu des profils ; seuls les 118 ingrédients encore vendus sont recommandés                          |
| Formules   | 363 lignes : 148 ingrédients trouvés dans les catalogues, 207 non trouvés, 8 solvants                                | Familles complétées à la main ([`referentiels.py`](../../ai/reco/referentiels.py)) ; solvants retirés |
| Formules   | 4 fabricants mal renseignés (ex. Berryflor noté « générique » alors qu'il est Givaudan)                              | Corrigés                                                                                              |
| Formules   | `dilution_utilisee` vide sur 330 lignes sur 363                                                                      | Colonne non utilisée                                                                                  |
| Prix       | 3 devises (USD 294, GBP 4, EUR 2) ; 57 lignes sans taille exploitable                                                | Conversion en €/kg à taux indicatifs ; 69 produits rapprochés, 25 avec un prix de référence à 100 g   |

## 4. Solution alternative si les données sont indisponibles

| Risque                           | Solution retenue                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Pas de données internes Givaudan | C'est notre cas : le jeu est reconstruit à partir de sources publiques (formules de démonstration, catalogues historiques, prix revendeurs).   |
| Pas de jeu étiqueté pour évaluer | L'équipe a rédigé et noté à la main 40 descriptions de boutiques ([`cas_boutiques.csv`](../../ai/data/eval/cas_boutiques.csv)).                |
| Modèle de langage indisponible   | Après 2 essais, la lecture bascule sur des mots-clés, sans IA ([`extraction.py`](../../ai/reco/extraction.py), repris dans `api/src/reco.ts`). |
| Données brutes déplacées         | Le dossier source se règle par la variable `RECO_RAW_DIR` ([`config.py`](../../ai/reco/config.py)).                                            |

---

## Validation

**Données accessibles** : oui, trois sources publiques, sans accès privé,
versionnées dans le dépôt.

**Faisabilité initiale** : les données couvrent ce qu'il faut pour recommander
(composition des formules, familles olfactives, présence au catalogue 2024,
prix). Principale limite : 13 formules seulement, conçues pour d'autres usages
(shampooing, adoucissant…) que le parfum d'ambiance.
