# 0001. Utiliser PostgreSQL 17 comme base de données

- Statut : acceptée
- Date : 2026-11-09
- Décideurs : équipe projet

## Contexte

L'API stocke les questions et les réponses générées dans une base relationnelle.
Le front lit ces données par l'API. La base doit être disponible pendant le
développement et la démonstration, sans installation PostgreSQL sur la machine
hôte.

## Options

1. PostgreSQL : déjà intégré à Compose, utilisé par l'API et initialisé avec les
   scripts SQL du dépôt. Nécessite un conteneur de base de données.
2. SQLite : évite le service de base de données, mais impose de remplacer
   PostgreSQL dans Compose, le pilote `pg` et les requêtes SQL existantes.
3. MariaDB : fournit une base relationnelle, mais nécessiterait aussi
   l'adaptation du pilote et des scripts sans bénéfice identifié pour ce projet.

## Décision

Nous choisissons PostgreSQL 17, lancé par Compose, car il fournit une base
relationnelle partagée par l'API, avec schéma et données initiales versionnés
dans le dépôt.

## Conséquences

- Positives : configuration reproductible, données persistantes et même moteur
  pour l'équipe.
- Négatives, à accepter : un conteneur est requis et doit être prêt avant
  l'utilisation de l'API.
- À revoir si : la plateforme de déploiement ne peut pas héberger PostgreSQL ou
  impose un autre moteur.
