# 0003. Utiliser Node.js, TypeScript, Express et Vite

- Statut : acceptée
- Date : 2026-11-10
- Décideurs : équipe projet

## Contexte

Le projet doit fournir en peu de temps un front web, une API et un accès à la
base de données, dans un environnement identique pour toute l'équipe (dev
container). Les membres connaissent JavaScript.

## Options

1. Node.js, TypeScript, Express et Vite : un seul langage pour l'API et le
   front, démarrage rapide, grand écosystème. Express est minimaliste et ne
   fournit pas de structure imposée.
2. Python (FastAPI) pour l'API : adapté à l'IA, mais deux langages dans le
   projet et une chaîne d'outils supplémentaire à maintenir.
3. Framework full-stack (Next.js) : plus complet, mais plus lourd à prendre en
   main et plus de concepts que nécessaire pour la démonstration.

## Décision

Nous choisissons Node.js 24, TypeScript, Express pour l'API et Vite pour le
front, car un langage unique réduit le coût d'entrée et le typage détecte des
erreurs avant l'exécution. ESLint, Prettier et la CI garantissent un style
commun.

## Conséquences

- Positives : onboarding rapide, outillage partagé (lint, format, build) entre
  l'API et le front.
- Négatives, à accepter : peu de structure imposée par Express; la discipline
  d'équipe et la revue de code la remplacent.
- À revoir si : l'application grossit au point de nécessiter un framework
  structurant, ou si le travail IA impose Python.
