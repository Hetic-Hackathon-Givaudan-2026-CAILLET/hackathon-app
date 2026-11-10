# 0006. Utiliser un dev container avec Docker Compose

- Statut : acceptée
- Date : 2026-11-10
- Décideurs : équipe projet

## Contexte

L'équipe travaille sur des machines différentes (systèmes et architectures
variés). Chacun doit obtenir le même environnement en suivant le README :
même version de Node.js, client et serveur PostgreSQL, mêmes extensions et
mêmes réglages. Ce choix structure tout le dépôt et est coûteux à changer.

## Options

1. Dev container VS Code et Docker Compose : environnement identique et versionné
   dans le dépôt, PostgreSQL démarré avec le poste de travail. Nécessite Docker
   et VS Code.
2. Installation manuelle (Node.js et PostgreSQL sur chaque machine) : aucune
   dépendance à Docker, mais des versions et des configurations qui divergent.
3. Docker Compose seul, sans dev container : reproductible en ligne de commande,
   mais sans extensions ni réglages partagés, et sans transfert des ports.

## Décision

Nous choisissons un dev container qui s'appuie sur `compose.yaml` : un service
`dev` (Node.js 24 et client PostgreSQL) et un service `db` (PostgreSQL 17), avec
`npm ci` et la création de `api/.env` à la première ouverture.

## Conséquences

- Positives : environnement identique pour tous, démarrage documenté dans le
  README, schéma et données initiales rejoués au premier démarrage de la base.
- Négatives, à accepter : Docker et VS Code sont obligatoires; Ollama reste
  installé sur la machine hôte; sous Linux il doit écouter sur `0.0.0.0`.
- À revoir si : un membre ne peut pas utiliser Docker, ou si l'équipe passe à un
  environnement cloud.
