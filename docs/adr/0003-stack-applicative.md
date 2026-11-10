# 0003. Utiliser Node.js et TypeScript pour l'API et le front

- Statut : acceptée
- Date : 2026-11-10
- Décideurs : équipe projet

## Contexte

Le projet doit fournir en deux semaines un front web et une API, dans un
environnement identique pour toute l'équipe. Les membres connaissent JavaScript.
Le choix du langage détermine l'outillage (lint, format, build), les
bibliothèques disponibles et les compétences nécessaires : il est coûteux à
changer une fois le code écrit.

## Options

1. Node.js 24 et TypeScript pour l'API et le front : un seul langage, une seule
   chaîne d'outils, démarrage rapide. Le typage n'existe qu'à la compilation.
2. Python (FastAPI) pour l'API et JavaScript pour le front : adapté à l'IA, mais
   deux langages et deux chaînes d'outils à maintenir.
3. Framework full-stack (Next.js) : plus complet, mais plus de concepts à
   apprendre que nécessaire pour la démonstration.

## Décision

Nous choisissons Node.js 24 et TypeScript pour l'API et le front, parce qu'un
langage unique réduit le coût d'entrée et que le typage détecte des erreurs
avant l'exécution. Express (API) et Vite (front) sont les outils retenus pour
ce langage; ils sont remplaçables sans changer cette décision.

## Conséquences

- Positives : onboarding rapide, outillage partagé (ESLint, Prettier, build)
  entre l'API et le front.
- Négatives, à accepter : Express impose peu de structure; la revue de code
  doit la garantir.
- À revoir si : le travail IA impose Python, ou si l'application grossit au point
  de nécessiter un framework structurant.
