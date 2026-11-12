# 0007. Intégrer la recommandation Givaudan dans l'API en TypeScript

- Statut : proposée
- Date : 2026-11-12
- Décideurs : équipe projet

## Contexte

L'équipe Data a entraîné un modèle de recommandation dans `ai/reco/` : un modèle
de langage note la description d'une boutique sur 5 axes (chaleur, fraîcheur,
floral, boisé, intensité), puis une distance pondérée classe 13 formules de
démonstration Givaudan et 118 ingrédients encore au catalogue. Le site doit
afficher ces recommandations. L'ADR 0005 exclut l'exécution du service Python
`ai/` dans l'application principale, et l'ADR 0003 fixe Node.js et TypeScript.

## Options

1. Appeler le service FastAPI depuis l'API Express : réutilise le code Python
   tel quel, mais ajoute un service, une clé et un environnement Python à la
   stack, contre l'ADR 0005.
2. Porter le moteur en TypeScript dans l'API et charger les données dans
   PostgreSQL : une seule stack, données versionnées dans `db/init/` (ADR 0001),
   mais deux implémentations à garder alignées.

## Décision

Nous choisissons l'option 2. L'équipe Data reste propriétaire du nettoyage, de
l'entraînement et de l'évaluation dans `ai/`. `python -m reco.exporter_sql`
écrit `db/init/006-givaudan-seed.sql` (formules, ingrédients, poids appris) ;
`api/src/reco.ts` reprend la lecture (prompt few-shot, secours par mots-clés)
et la distance. Le modèle de langage est choisi par `RECO_MODEL` (défaut :
`AI_MODEL`), appelé par la même route compatible OpenAI que le chat (ADR 0002).

Le site ne s'appuie que sur les données de `ai/data/raw/` : les produits
fictifs du prototype (`004-boutique-seed.sql`) sont retirés, les produits
vendus sont les 13 formules Givaudan (`formule-<id>`, écrites dans
`006-givaudan-seed.sql`), et les curseurs « Souhaitez-vous ajuster votre
requête ? » sont les 5 axes du modèle. La table `product_scores` (anciens axes)
reste vide.

Routes : `POST /api/recommandation` (description libre) et
`POST /api/recommandation/curseurs` (5 notes, sans modèle de langage).

## Conséquences

- Positives : aucun service ni langage de plus dans l'application ; les
  curseurs recalculent instantanément ; vérifié identique au moteur Python sur
  les 14 cas du jeu de test (`ai/reports/evaluation_test.json`).
- Négatives, à accepter : toute évolution de `ai/reco/moteur.py` ou
  `extraction.py` doit être reportée dans `api/src/reco.ts` ; la lecture passe
  par la route compatible OpenAI (mode JSON) et non par le schéma JSON natif
  d'Ollama, d'où de légers écarts possibles sur les notes ; prix indicatifs
  (revendeurs), à ne pas présenter comme des tarifs Givaudan.
- À revoir si : le modèle de l'équipe Data devient trop complexe à porter
  (embeddings, apprentissage en ligne) : un service dédié serait alors justifié.
