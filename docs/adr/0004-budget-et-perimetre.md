# 0004. Limiter le budget à zéro et exclure certaines fonctionnalités

- Statut : acceptée
- Date : 2026-11-10
- Décideurs : équipe projet

## Contexte

Le hackathon dure deux semaines, sans budget alloué. Les questions envoyées à
l'IA ne doivent pas quitter la machine de l'équipe sans décision explicite.

## Options

1. Budget zéro : Ollama local, outils gratuits (GitHub, Docker, VS Code).
   Qualité du modèle et vitesse limitées par la machine.
2. Budget d'API hébergée : meilleure qualité, mais coûts variables, clé à
   protéger et données envoyées à un tiers.

## Décision

Nous choisissons un budget à zéro euro : modèle local `llama3.2:1b` via Ollama,
aucun service payant.

Sont exclus du périmètre : authentification des utilisateurs, limitation de
débit, RAG, déploiement de production, tests fonctionnels automatisés et
exécution du service Python `ai/` dans l'application principale. Ces éléments
ne sont pas nécessaires pour démontrer la chaîne front, API, base de données et
IA.

## Conséquences

- Positives : aucun coût, aucune clé à gérer, données gardées en local.
- Négatives, à accepter : réponses de qualité modeste, aucune protection contre
  les abus, pas de mise en ligne.
- À revoir si : un budget est alloué, ou si l'application doit être exposée à
  des utilisateurs réels.
