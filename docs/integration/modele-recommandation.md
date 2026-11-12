# Brancher le modèle de recommandation sur le site

Pour l'équipe front/back. Le modèle de l'équipe Data/IA, dans le service `ai/`,
recommande **les produits du site** (Vanille, Cèdre, Bergamote…) à deux endroits :

1. **Chatbot** : le commerçant décrit sa boutique, le modèle choisit 4 produits et
   conseille une position pour chacun des 6 axes du site.
2. **Curseurs** : le client règle les curseurs, le modèle reclasse les produits.

C'est le site qui garde la main sur ses curseurs : il affiche ceux de son profil
de boutique (`shop_types.axes`), le modèle ne fait que conseiller leur position et
réagir à leur réglage.

## Ce que ça change pour l'utilisateur

| Situation                                  | Aujourd'hui                      | Avec le modèle                                                    |
| ------------------------------------------ | -------------------------------- | ----------------------------------------------------------------- |
| « je suis un coiffeur je veux un parfum »  | aucun produit, le site redemande | Bergamote, Mandarine, Fleur d'oranger, Thé vert + une question    |
| « J'ai une boulangerie »                   | aucun produit                    | Benjoin, Fève tonka, Caramel, Cannelle                            |
| Coiffeur, curseur poussé vers « gourmand » | calcul de distance local         | Thé vert, Mandarine, Gingembre, Cannelle (reste frais : coiffeur) |
| Coiffeur, curseur poussé vers « apaisant » | calcul de distance local         | Musc blanc, Santal, Figue, Fleur d'oranger                        |

Si le modèle ne répond pas, le site garde son fonctionnement actuel.

## 1. Lancer le service IA

Comme indiqué dans `ai/README.md`, avec le site lancé (`npm run dev`) car le
modèle lit `GET /api/catalog` :

```bash
cd ai
pip install -r requirements.txt
cp .env.example .env    # renseigner API_KEY ; OLLAMA_URL=http://host.docker.internal:11434 dans le dev container
uvicorn main:app --env-file .env --host 0.0.0.0 --port 8000
```

Swagger : http://localhost:8000/docs (section « site »). Toutes les routes exigent
l'en-tête `X-API-Key`.

## 2. Appliquer le branchement

```bash
git apply docs/integration/site.patch
```

Puis, dans `api/.env` :

```bash
MODEL_API_URL=http://localhost:8000
MODEL_API_KEY=<la valeur de API_KEY dans ai/.env>
```

| Fichier                                                     | Changement                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `api/src/routes/recommandation.ts`                          | `POST /api/recommandation` et `POST /api/recommandation/curseurs`, relaient vers le modèle |
| `api/src/index.ts`, `api/src/config.ts`, `api/.env.example` | branchement des routes, variables `MODEL_API_URL` et `MODEL_API_KEY`                       |
| `web/src/api.ts`, `web/src/types.ts`, `web/src/state.ts`    | appels, types, `state.modelProducts` (produits choisis par le modèle)                      |
| `web/src/actions.ts`                                        | `find()` appelle le modèle ; un curseur bougé ou « Complétez votre demande » le rappelle   |
| `web/src/recommend.ts`                                      | `ranked()` affiche les produits du modèle quand il y en a, sinon le calcul local           |

Comportement des curseurs : la grille se met à jour tout de suite avec le calcul
local, puis, 250 ms après le dernier mouvement, avec la réponse du modèle (environ
20 ms). Seule la dernière réponse est prise en compte.

Testé sur une copie de `develop` : `npm run build`, `npm run lint` et Prettier
passent ; les deux routes renvoient les produits du modèle, et 400 / 502 en cas
d'erreur ou de mauvaise clé (le front garde alors le calcul local).

## 3. Contrat

Appels serveur à serveur (l'API Express), avec l'en-tête `X-API-Key`.

### Chatbot : `POST /site/recommander`

```json
{ "description": "je suis un coiffeur je veux un parfum" }
```

| Champ de la réponse           | Usage dans le site                                                              |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `produits[]` (`id`, `nom`…)   | les 4 produits à afficher ; `id` = `products.id`, le panier fonctionne tel quel |
| `curseurs`                    | position conseillée (0-100) sur **chaque** axe : `curseurs[idAxe]`              |
| `type`                        | un `label` de `shop_types`, ou `null` (coiffeur, boulangerie… n'y sont pas)     |
| `reponse`, `question_relance` | texte à afficher ; la question est `null` si la demande est assez précise       |
| `ambiance`                    | tags de `lexicon_entries`                                                       |
| `demande_complete`            | `false` si ni métier ni ambiance (« Bonjour ») : sélection générique            |

### Curseurs : `POST /site/curseurs`

```json
{
  "description": "je suis un coiffeur je veux un parfum",
  "complement": "",
  "axes": [0, 1, 2],
  "curseurs": [25, 66, 90]
}
```

`axes` et `curseurs` : exactement `state.axes` et `state.sliders`. La réponse donne
`produits`, `reponse` et `poids_curseurs` (0 si les curseurs sont à la position
conseillée : même résultat que le chatbot).

## Comment le modèle traite les curseurs

1. Il relit la demande (cache : instantané) : le contexte de la boutique est gardé.
2. Il traduit le réglage dans ses propres axes (chaleur, fraîcheur, floral, boisé,
   intensité), grâce à une correspondance apprise sur les 18 produits entre les axes
   du site et les siens.
3. Il classe les produits en combinant deux notes : proximité à cette nouvelle
   lecture (poids appris du modèle) et proximité aux curseurs tels que le site les
   définit. Plus le client a bougé les curseurs, plus la seconde compte.

## Limites connues

- Un produit ajouté au catalogue doit recevoir ses familles olfactives dans
  `ai/data/site/produits_familles.csv`, sinon le modèle l'ignore.
- L'axe « floral ↔ gourmand » du site place Vétiver (0,05) et Cèdre (0,15) côté
  floral, comme Rose : pousser ce curseur vers « floral » fait donc remonter des bois.
  À corriger dans `product_scores` si ce n'est pas voulu.
- Les axes « chaleureux ↔ raffiné » et « doux ↔ épicé » sont mal reliés au modèle
  (R² ≈ 0,3 en validation croisée) : leur effet passe surtout par la seconde note.
- Premier appel du chatbot lent (jusqu'à une minute, chargement du LLM) ; ensuite
  quelques secondes, et instantané quand seul le métier est donné.
- Aucune donnée étiquetée sur les produits du site : la qualité est vérifiée sur des
  exemples, pas mesurée.
- Brancher un service Python sur le site sort de l'ADR 0005 : à valider en équipe.
