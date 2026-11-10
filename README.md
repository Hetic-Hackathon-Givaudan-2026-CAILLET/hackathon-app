# Hackathon app

Application de démonstration composée d'un front web, d'une API Node.js,
d'une base PostgreSQL et d'un modèle de langage local via Ollama.

Ce guide décrit les commandes à effectuer depuis un clone neuf. Les commandes
Docker se lancent sur votre machine hôte, sauf indication contraire. Les
commandes npm se lancent dans le dev container. Les exemples utilisent un
terminal Bash (Linux, macOS, WSL ou Git Bash). Sur Windows, vous pouvez utiliser
un terminal WSL/Git Bash dans VS Code; si vous utilisez PowerShell, adaptez les
continuations de ligne `\` à sa syntaxe.

## 1. Prérequis

Installez les outils suivants :

- **Git**
- **Docker Desktop** sur Windows/macOS, ou **Docker Engine et Docker Compose
  v2** sur Linux
- **Ollama** (le modèle `llama3.2:1b` se télécharge à l'étape 3)
- **Visual Studio Code**
- L'extension VS Code **Dev Containers**

Vérifiez que Docker fonctionne avant de continuer :

```sh
docker --version
docker compose version
docker info
git --version
code --version
```

`docker info` doit afficher les informations du moteur sans erreur. Si la
commande `code` n'existe pas, ouvrez VS Code manuellement et utilisez
**File > Open Folder...** après le clonage.

Le dev container fournit Node.js 24 et le client PostgreSQL. Compose démarre
PostgreSQL 17. Il n'est pas nécessaire d'installer Node.js ou PostgreSQL sur
votre machine hôte. Ollama, lui, doit tourner sur la machine hôte pour que
l'application puisse le joindre.

## 2. Cloner le dépôt

Ouvrez un terminal sur votre machine hôte, puis exécutez :

```sh
git clone https://github.com/Hetic-Hackathon-Givaudan-2026-CAILLET/hackathon-app.git
cd hackathon-app
git status
```

La dernière commande doit indiquer une arborescence propre sur la branche par
défaut. Les prochaines commandes supposent que le terminal se trouve à la
racine du dépôt (`hackathon-app/`).

## 3. Démarrage recommandé avec VS Code Dev Containers

Depuis le terminal hôte, à la racine du dépôt :

```sh
code .
```

Dans VS Code :

1. Ouvrez la palette de commandes avec `Ctrl+Shift+P` (Windows/Linux) ou
   `Cmd+Shift+P` (macOS).
2. Saisissez **Dev Containers: Reopen in Container**, puis sélectionnez cette
   commande.
3. À la première ouverture, attendez que l'image soit construite et que
   `postCreateCommand` termine `npm ci`. Cette étape crée également
   `api/.env` depuis `api/.env.example`.
4. Vérifiez que le coin inférieur gauche de VS Code indique que vous êtes
   connecté au conteneur **Hackathon**.

Si la palette ne propose pas cette commande, installez l'extension **Dev
Containers** (identifiant `ms-vscode-remote.remote-containers`), puis rouvrez
le dossier et recommencez.

### Démarrer Ollama

Dans un terminal sur la machine hôte (pas dans le conteneur), téléchargez le
modèle (sans ouvrir de session de chat) :

```sh
ollama pull llama3.2:1b
```

Vérifiez ensuite que le service Ollama répond (sur macOS et Windows,
l'application Ollama le lance automatiquement) :

```sh
curl http://localhost:11434/api/tags
```

Si la commande échoue, lancez `ollama serve` dans un terminal dédié et laissez-le
ouvert pendant l'utilisation de l'application. Dans le terminal
intégré de VS Code, vérifiez que le fichier de configuration existe :

```sh
test -f api/.env && echo "api/.env existe" || echo "api/.env est absent"
```

Si le fichier est absent, créez-le à partir du modèle :

```sh
cp api/.env.example api/.env
```

La configuration utilise `http://host.docker.internal:11434/v1` et le modèle
`llama3.2:1b`; aucune clé API n'est nécessaire. `api/.env` est ignoré par Git.

### Lancer l'application

Dans un terminal intégré de VS Code connecté au conteneur et à la racine du
dépôt, lancez :

```sh
npm run dev
```

Laissez cette commande tourner. Elle démarre simultanément l'API sur le port
`3000` et le front Vite sur le port `5173`. VS Code transfère ces ports vers
votre machine.

Ouvrez <http://localhost:5173> dans votre navigateur. L'indicateur doit
afficher `API OK` et la version de PostgreSQL. Les questions déjà présentes
sont des données d'exemple initialisées au premier démarrage de la base.

Pour arrêter les deux serveurs, retournez au terminal où `npm run dev` tourne
et faites `Ctrl+C`.

## 4. Démarrage en ligne de commande (sans Dev Containers dans VS Code)

Cette méthode utilise quand même Docker et Compose; elle permet de démarrer
l'application depuis un terminal si vous n'utilisez pas VS Code.

À la racine du dépôt, sur la machine hôte, validez d'abord la configuration et
construisez/démarrez les conteneurs :

```sh
docker compose config
docker compose up -d --build
docker compose ps
```

Attendez que le service `db` soit `healthy` :

```sh
docker compose ps
docker compose logs --tail=50 db
```

Installez les dépendances dans le conteneur de développement et créez le
fichier de configuration s'il n'existe pas :

```sh
docker compose exec -w /workspace dev npm ci
docker compose exec -w /workspace dev sh -c 'test -f api/.env || cp api/.env.example api/.env'
```

Ollama doit être installé et lancé sur la machine hôte, avec le modèle
`llama3.2:1b` téléchargé (`ollama pull llama3.2:1b`).
Le répertoire du projet est partagé avec le conteneur, donc `api/.env` est
visible des deux côtés.

Démarrez les serveurs au premier plan :

```sh
docker compose exec -w /workspace dev npm run dev
```

Laissez cette commande tourner, puis ouvrez <http://localhost:5173>. Pour
arrêter les serveurs, faites `Ctrl+C`. Pour arrêter les conteneurs sans
supprimer la base :

```sh
docker compose down
```

## 5. Vérifier front, API, IA et PostgreSQL

Avec `npm run dev` toujours actif, exécutez les commandes suivantes depuis un
autre terminal. Elles peuvent être lancées sur la machine hôte ou dans le
terminal du conteneur; VS Code transfère le port `3000`.

### Santé de l'API et de la base

```sh
curl -i http://localhost:3000/api/health
```

Résultat attendu : statut HTTP `200` et un JSON contenant `"status":"ok"` ainsi
que la version PostgreSQL. Si cet appel échoue, vérifiez d'abord que les
conteneurs tournent et que la base est prête :

```sh
docker compose ps
docker compose logs --tail=100 db
```

### Lire les questions existantes

```sh
curl -i http://localhost:3000/api/questions
```

Résultat attendu : statut HTTP `200` et une liste JSON (les données initiales
sont insérées au premier démarrage de la base).

### Envoyer une question à l'IA et enregistrer la réponse

```sh
curl -i -X POST http://localhost:3000/api/questions \
  -H 'Content-Type: application/json' \
  -d '{"question":"Réponds en un mot : quelle est la capitale de la France ?"}'
```

Résultat attendu : statut HTTP `201` et un objet JSON avec `question`, une
`answer` non vide, et un identifiant. Cet appel utilise le modèle local
Ollama. Si la réponse est une erreur IA, vérifiez qu'Ollama tourne et que le
modèle est installé, puis arrêtez et relancez `npm run dev` pour recharger la
configuration.

### Confirmer l'enregistrement dans PostgreSQL

Sur la machine hôte, PostgreSQL est exposé sur le port `5433` (la configuration
évite ainsi le port hôte `5432`). Depuis le conteneur, PostgreSQL est joignable
à `db:5432`. Pour vérifier l'enregistrement avec `psql` dans le conteneur :

```sh
docker compose exec db psql -U app -d app \
  -c 'SELECT id, question, answer, created_at FROM questions ORDER BY id DESC LIMIT 5;'
```

La question envoyée doit apparaître en première ligne avec la réponse générée.
Les identifiants locaux de démonstration sont `app` / `app`; ne réutilisez pas
ces valeurs pour un déploiement exposé.

## 6. Contrôles de qualité et build

Dans un terminal à la racine du dépôt, connecté au dev container :

```sh
npm run lint
npm run format:check
npm run build
```

Chaque commande doit se terminer avec le code de sortie `0`. `npm run build`
compile l'API TypeScript puis construit les fichiers statiques du front dans
`web/dist/`.

Pour appliquer automatiquement Prettier au dépôt :

```sh
npm run format
```

Avant un commit, le hook `pre-commit` lance `lint-staged` sur les fichiers
préparés. Pour le vérifier avec vos propres changements :

```sh
git status
git add <fichier-modifie>
git commit -m "Décrire le changement"
```

Si ESLint ou Prettier échoue, le hook refuse le commit. Corrigez le problème,
puis répétez `git add` et `git commit`.

## 7. Cycle de contribution GitHub

Créez une branche de travail depuis `develop` :

```sh
git switch develop
git pull --ff-only
git switch -c feature/nom-du-changement
```

Après vos modifications, vérifiez et commitez :

```sh
npm run lint
npm run format:check
npm run build
git status
git add <fichiers-a-commiter>
git commit -m "Décrire le changement"
```

Poussez la branche et ouvrez une pull request vers `develop` :

```sh
git push -u origin feature/nom-du-changement
```

Sur GitHub, créez une pull request avec `develop` comme branche de destination.
Vérifiez que le check **CI / qualite** est terminé avec succès et demandez les
revues prévues par l'équipe. Ne fusionnez pas si un check requis est rouge.

## 8. Base de données : accès et dépannage

État des services :

```sh
docker compose ps
```

Journaux des services :

```sh
docker compose logs --tail=100 db dev
```

Suivi en continu des journaux PostgreSQL :

```sh
docker compose logs -f db
```

Pour arrêter le suivi, faites `Ctrl+C`. Pour arrêter les conteneurs tout en
gardant les données locales :

```sh
docker compose down
```

La base utilise `db/data/` comme stockage local. Les scripts SQL de
`db/init/` sont joués uniquement lors de l'initialisation d'une base vide. Ne
supprimez pas `db/data/` pour un dépannage ordinaire : cela effacerait les
données locales.

Si le port hôte `5433` est déjà occupé, arrêtez l'autre service qui l'utilise
ou modifiez le port hôte dans `compose.yaml`. Conservez le port conteneur
`5432`; après modification, utilisez le nouveau port hôte pour les connexions
depuis votre machine.

## 9. Choix techniques, budget et périmètre

Les décisions sont justifiées dans des ADR (_Architecture Decision Records_),
dans [docs/adr/](docs/adr/) :

- [0001 : PostgreSQL 17](docs/adr/0001-postgresql.md)
- [0002 : fournisseur d'IA (API compatible OpenAI, Ollama local)](docs/adr/0002-fournisseur-ia.md)
- [0003 : stack applicative (Node.js, TypeScript, Express, Vite)](docs/adr/0003-stack-applicative.md)
- [0004 : budget et périmètre exclu](docs/adr/0004-budget-et-perimetre.md)

En résumé : Node.js 24 et TypeScript pour l'API et le front, Express, Vite,
PostgreSQL 17 via Compose, et Ollama (`llama3.2:1b`) en local, sans frais d'API.
Sont exclus : authentification, limitation de débit, RAG, déploiement de
production et tests fonctionnels automatisés.

Le service Python FastAPI/Ollama dans `ai/` est une expérimentation distincte :
il n'est pas lancé par Compose et n'est pas appelé par l'application web/API
principale, qui appelle directement l'API locale d'Ollama.

## 10. GitHub : équipes, rôles et protection des branches

### Équipes et rôles

| Équipe         | Rôle GitHub | Justification                                                                                                                          |
| -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tech-leads`   | Maintain    | Propriétaires de l'infrastructure (voir `.github/CODEOWNERS`); gèrent les réglages du dépôt sans être propriétaires de l'organisation. |
| `developpeurs` | Write       | Créent des branches et des pull requests, mais ne peuvent pas pousser sur `main`/`develop`.                                            |
| `data-ia`      | Write       | Travaillent sur la partie IA; même niveau que les développeurs, sans droits d'administration.                                          |

Principe : droits minimaux nécessaires. Seuls les membres de `tech-leads`
approuvent les changements touchant `.devcontainer/`, `.github/`, `compose.yaml`,
`eslint.config.mjs` et `package.json` (revue obligatoire via `CODEOWNERS`).

### Protection de `main` et `develop`

Réglages à appliquer dans **Settings > Branches** (règle pour chaque branche) :

- Pull request obligatoire avant fusion; push direct refusé, y compris pour les
  administrateurs.
- Au moins une approbation; revue des propriétaires de code requise.
- Check de statut requis : **CI / qualite**, branche à jour avant fusion.

Démonstration : `git push origin develop` depuis un commit local doit être
refusé (`protected branch hook declined`).

### Exécution multi-machine

Pour le test multi-machine, répétez les étapes 1 à 5 sur deux machines ou
architectures distinctes, puis consignez le résultat dans le tableau suivant :

| Machine / OS | Architecture | `docker version` | API + PostgreSQL | Front | Appel IA |
| ------------ | ------------ | ---------------- | ---------------- | ----- | -------- |
|              |              |                  |                  |       |          |
|              |              |                  |                  |       |          |

Le dépôt ne contient pas de test automatisé multi-architecture.
