# 0007. Appeler le modèle de recommandation Python depuis l'API

- Statut : proposée
- Date : 2026-11-12
- Décideurs : équipe projet

## Contexte

L'équipe Data/IA a livré un modèle de recommandation (`reco/`, servi par
`api.py`, FastAPI). Il lit la description d'une boutique avec Ollama
(`qwen2.5:3b`), la traduit en 5 scores, puis classe les formules Givaudan par
distance pondérée. Mesuré sur le jeu de test (14 cas) : hit@3 = 64 %,
MRR = 0,60, latence médiane du LLM 4,4 s.

L'[ADR 0005](0005-perimetre-exclu.md) exclut l'exécution d'un service Python
dans l'application principale. Le site doit pourtant montrer ce modèle.

## Options

1. L'API Express transmet la demande au service Python (`RECO_API_URL`) : rapide
   à livrer, le modèle reste tel que l'équipe Data/IA l'a évalué. Un deuxième
   processus à lancer, et deux modèles Ollama (`llama3.2:1b` et `qwen2.5:3b`).
2. Réécrire le moteur en TypeScript, profils et poids en base : un seul
   service, mais réécriture et nouvelle évaluation à faire, et l'extraction
   par LLM est à porter aussi.

## Décision

Nous choisissons l'option 1 pour la démonstration : la route
`POST /api/recommandation` appelle `POST /recommander` du service Python.
L'URL vient de l'environnement, conformément à
l'[ADR 0002](0002-fournisseur-ia.md). Si le service ne répond pas, le site
garde sa sélection actuelle et affiche un message.

Cette décision remplace, pour ce seul service, l'exclusion du service Python de
l'[ADR 0005](0005-perimetre-exclu.md). Le RAG (`/ask`) reste hors périmètre.

## Conséquences

- Positives : le modèle évalué est montré tel quel ; aucun coût
  ([ADR 0004](0004-budget-zero.md)) : tout tourne en local.
- Négatives, à accepter : un processus de plus à lancer en dev ; premier
  appel lent (chargement de `qwen2.5:3b`) ; les formules recommandées ne sont
  pas les produits vendus dans la boutique.
- À revoir si : le modèle doit être déployé, ou si les formules doivent
  devenir des produits du catalogue (option 2).
