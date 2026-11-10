# 0005. Exclure l'authentification, le RAG et le déploiement du périmètre

- Statut : acceptée
- Date : 2026-11-10
- Décideurs : équipe projet

## Contexte

Le délai est de deux semaines. L'objectif est de démontrer la chaîne complète :
front, API, base de données et appel à l'IA, dans un environnement reproductible.

## Options

1. Livrer la chaîne minimale et exclure le reste : le temps est consacré à la
   fiabilité de l'environnement. L'application n'est pas exposable à de vrais
   utilisateurs.
2. Ajouter authentification, limitation de débit, RAG et déploiement : produit
   plus complet, mais risque de ne pas finir la chaîne de base.

## Décision

Nous excluons du périmètre : l'authentification des utilisateurs, la limitation
de débit, le déploiement de production, les tests fonctionnels
automatisés et l'exécution du service Python `ai/` dans l'application
principale.

## Conséquences

- Positives : périmètre tenable, effort concentré sur l'environnement et la
  chaîne complète.
- Négatives, à accepter : aucune protection contre les abus, pas de mise en
  ligne, pas de filet de tests fonctionnels.
- À revoir si : l'application doit être exposée à des utilisateurs réels.
