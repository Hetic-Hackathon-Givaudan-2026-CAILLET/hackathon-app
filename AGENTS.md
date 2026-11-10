# AGENTS.md

Application de démonstration : front web (Vite), API Node.js (Express), base PostgreSQL 17 et modèle de langage local via Ollama (`llama3.2:1b`). Le guide d'installation complet est dans [README.md](README.md).

## Décisions déjà prises (ADR)

Les décisions d'architecture sont dans `docs/adr/`. Les citer (par numéro) quand on répond à « quelles décisions ce dépôt a-t-il déjà prises ? ». Ne pas les contredire sans proposer un nouvel ADR (modèle : `docs/adr/0000-modele.md`).

- [ADR 0001](docs/adr/0001-postgresql.md) : PostgreSQL 17 lancé par Compose, schéma et données initiales versionnés dans `db/init/`.
- [ADR 0002](docs/adr/0002-fournisseur-ia.md) : API de chat compatible OpenAI, avec Ollama en local. URL, modèle et clé éventuelle viennent des variables d'environnement, jamais codés en dur.
- [ADR 0003](docs/adr/0003-stack-applicative.md) : Node.js 24, TypeScript, Express (API) et Vite (front). ESLint, Prettier et la CI garantissent un style commun.
- [ADR 0004](docs/adr/0004-budget-et-perimetre.md) : budget à zéro, aucun service payant ni envoi de données à un tiers. Hors périmètre : authentification, limitation de débit, RAG, déploiement de production, tests fonctionnels automatisés, service Python `ai/` dans l'application principale.

## Structure

- `api/` : API Express en TypeScript (`api/src/index.ts`).
- `web/` : front Vite en TypeScript.
- `db/init/` : scripts SQL joués au premier démarrage de la base (`001-schema.sql`, `002-seed.sql`). `db/data/` contient les données locales et est ignoré par git.
- `ai/` : service Python, hors de l'application principale (ADR 0004).
- `compose.yaml` : stack de développement (`dev` et `db`).

## Commandes

Elles se lancent dans le dev container, à la racine, et une à la fois.

- `npm run dev` : API et front.
- `npm run build` : compilation des workspaces.
- `npm run lint` : ESLint.
- `npm run format:check` / `npm run format` : Prettier.

## Conventions

- Code en TypeScript, fins de ligne LF.
- Lint et format sont appliqués par le hook `pre-commit` (husky, lint-staged). Lancer `npm run lint` et `npm run format:check` avant de proposer un changement.
- Ne pas ajouter de dépendance payante ni d'appel à un service externe.
- Modifier le schéma ou les données de test dans `db/init/`. Ces scripts ne rejouent que si `db/data` est vide.

## Git

- Branche d'intégration : `develop`. Travailler sur des branches `feature/...`.
- Jalon livré avec un tag (`m1`).
