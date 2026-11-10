# 0004. Fixer le budget à zéro euro

- Statut : acceptée
- Date : 2026-11-10
- Décideurs : équipe projet

## Contexte

Le hackathon dure deux semaines et aucun budget n'est alloué. Les questions
envoyées à l'IA ne doivent pas quitter la machine de l'équipe sans décision
explicite.

## Options

1. Budget zéro : modèle local via Ollama, outils gratuits (GitHub, Docker,
   VS Code). Qualité et vitesse du modèle limitées par la machine.
2. Budget d'API hébergée : meilleure qualité, mais coûts variables, clé à
   protéger et données envoyées à un tiers.

## Décision

Nous choisissons un budget de zéro euro : modèle `llama3.2:1b` exécuté
localement par Ollama et aucun service payant.

## Conséquences

- Positives : aucun coût, aucune clé à gérer, données gardées en local.
- Négatives, à accepter : réponses de qualité modeste, dépendance à la puissance
  de la machine de chacun.
- À revoir si : un budget est alloué, ou si la qualité des réponses devient un
  critère d'acceptation.
