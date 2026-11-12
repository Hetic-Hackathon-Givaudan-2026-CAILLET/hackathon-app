// Recommandation de fragrances Givaudan (ADR 0007), portage en TypeScript du
// modèle de l'équipe Data (ai/reco/) :
//   1. lecture de la description : LLM (RECO_MODEL), secours par mots-clés ;
//   2. distance euclidienne pondérée entre ces 5 notes et chaque formule ou
//      ingrédient, avec les poids appris (table reco_modele).
// Le LLM ne choisit jamais la fragrance : il ne fait que noter la demande.
import { complete, type ChatMessage } from './ai.js';
import { RECO_MODEL } from './config.js';
import { db } from './db.js';
import { HttpError } from './http.js';

export const AXES = [
  'chaleur',
  'fraicheur',
  'floral',
  'boise',
  'intensite',
] as const;
export type Axe = (typeof AXES)[number];
export type Scores = Record<Axe, number>;

const NOMS_AXES: Record<Axe, string> = {
  chaleur: 'chaleur',
  fraicheur: 'fraîcheur',
  floral: 'floral',
  boise: 'boisé',
  intensite: 'intensité',
};

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// --- 1a. Lecture par mots-clés (référence sans IA, reco/extraction.py) -------

const LEXIQUE: Record<Exclude<Axe, 'intensite'>, string[]> = {
  chaleur: [
    'chaleur',
    'chaud',
    'chaleureu',
    'cosy',
    'cocon',
    'reconfort',
    'vanill',
    'caramel',
    'gourmand',
    'sucre',
    'gateau',
    'patisser',
    'ambre',
    'epice',
    'cannelle',
    'miel',
    'rhum',
    'chocolat',
    'accueillant',
    'muffin',
    'biscuit',
    'praline',
  ],
  fraicheur: [
    'frais',
    'fraich',
    'agrume',
    'citron',
    'orange',
    'pamplemousse',
    'menthe',
    'mentho',
    'marin',
    'ocean',
    'mer',
    'propre',
    'linge',
    'energ',
    'vert',
    'herbe',
    'basilic',
    'aquatique',
    'pur',
    'eucalyptus',
    'sport',
    'tonique',
  ],
  floral: [
    'fleur',
    'floral',
    'rose',
    'jasmin',
    'muguet',
    'pivoine',
    'iris',
    'violette',
    'lilas',
    'feminin',
    'bouquet',
    'fleuriste',
    'poudre',
  ],
  boise: [
    'bois',
    'cedre',
    'santal',
    'vetiver',
    'patchouli',
    'cuir',
    'mousse',
    'foret',
    'tabac',
    'masculin',
    'viril',
    'terre',
  ],
};
const FORT = [
  'fort',
  'intense',
  'puissant',
  'marquant',
  'present',
  'prononce',
  'impactant',
  'sillage',
  'energique',
];
const LEGER = [
  'leger',
  'discret',
  'doux',
  'subtil',
  'pas trop fort',
  'delicat',
  'neutre',
  'apaisant',
  'zen',
  'relax',
];

export function lireMotsCles(texte: string): Scores {
  const t = plain(texte);
  const scores = { chaleur: 2, fraicheur: 2, floral: 2, boise: 2 } as Scores;
  for (const [axe, mots] of Object.entries(LEXIQUE)) {
    const n = mots.filter((m) => t.includes(m)).length;
    if (n) scores[axe as Axe] = Math.min(10, 6 + 2 * n);
  }
  let intensite = 5;
  if (LEGER.some((m) => t.includes(m))) intensite = 3;
  if (FORT.some((m) => t.includes(m)) && !t.includes('pas trop fort')) {
    intensite = 8;
  }
  if (t.includes('tres leger') || t.includes('tres discret')) intensite = 2;
  scores.intensite = intensite;
  return scores;
}

// --- 1b. Lecture par le LLM (prompt few-shot entraîné par l'équipe Data) ----

const CONSIGNE = `Tu es un expert en parfum d'ambiance pour les commerces.
Une boutique décrit l'odeur qu'elle veut. Traduis sa description en 5 notes entières de 0 à 10 :
- chaleur : odeur chaude, gourmande, vanillée, ambrée, épicée, réconfortante
- fraicheur : odeur fraîche, agrumes, verte, marine, mentholée, propre
- floral : fleurs (rose, jasmin, muguet...)
- boise : bois, cèdre, santal, cuir, mousse
- intensite : force de l'odeur (0 = à peine perceptible, 10 = très puissante)
Un axe que la boutique ne mentionne pas reçoit une note basse (0 à 3).
L'intensité vaut 5 si la boutique ne dit rien sur la force de l'odeur.
Réponds uniquement avec le JSON demandé : {"chaleur": n, "fraicheur": n, "floral": n, "boise": n, "intensite": n}`;

// Exemples du jeu d'entraînement (jamais du jeu de test)
const EXEMPLES: [string, Scores][] = [
  [
    'Salon de thé et pâtisserie, on veut une odeur gourmande de gâteau aux fruits rouges qui donne faim',
    { chaleur: 9, fraicheur: 1, floral: 2, boise: 1, intensite: 6 },
  ],
  [
    'Barbier pour hommes, odeur boisée, virile, cuir et bois de cèdre, assez intense',
    { chaleur: 6, fraicheur: 1, floral: 0, boise: 9, intensite: 8 },
  ],
  [
    'Spa et institut de beauté, ambiance fraîche et zen, agrumes et citron vert, très léger',
    { chaleur: 1, fraicheur: 9, floral: 3, boise: 1, intensite: 2 },
  ],
];

// JSON, 5 axes, notes entre 0 et 10 ; lève une erreur sinon
export function valider(brut: string): Scores {
  const match = /\{[\s\S]*\}/.exec(brut);
  if (!match) throw new Error('pas de JSON dans la réponse');
  const data = JSON.parse(match[0]);
  const scores = {} as Scores;
  for (const a of AXES) {
    const v = Number(data?.[a]);
    if (!Number.isFinite(v) || v < 0 || v > 10) {
      throw new Error(`${a} hors de 0-10 : ${data?.[a]}`);
    }
    scores[a] = Math.round(v);
  }
  return scores;
}

// Même demande, même réponse : un appel au LLM par texte distinct
const cache = new Map<string, Scores>();

async function lireLlm(texte: string, variante: string): Promise<Scores> {
  const cle = `${RECO_MODEL}|${variante}|${texte}`;
  const connu = cache.get(cle);
  if (connu) return connu;
  const messages: ChatMessage[] = [{ role: 'system', content: CONSIGNE }];
  if (variante === 'few_shot') {
    for (const [desc, rep] of EXEMPLES) {
      messages.push({ role: 'user', content: desc });
      messages.push({ role: 'assistant', content: JSON.stringify(rep) });
    }
  }
  messages.push({ role: 'user', content: texte });
  let erreur: unknown;
  for (let essai = 0; essai < 2; essai++) {
    try {
      const scores = valider(
        await complete(messages, {
          json: true,
          model: RECO_MODEL,
          timeoutMs: 60_000,
        }),
      );
      if (cache.size > 500) cache.clear();
      cache.set(cle, scores);
      return scores;
    } catch (err) {
      erreur = err;
    }
  }
  throw erreur;
}

export async function lire(
  texte: string,
  variante: string,
): Promise<{ scores: Scores; methode: 'llm' | 'mots-clés' }> {
  try {
    return { scores: await lireLlm(texte, variante), methode: 'llm' };
  } catch (err) {
    console.warn('Lecture LLM impossible, secours par mots-clés :', err);
    return { scores: lireMotsCles(texte), methode: 'mots-clés' };
  }
}

// --- 2. Distance et classement (reco/moteur.py) -----------------------------

type Modele = { version: string; variante: string; poids: Scores };

export async function modeleActif(): Promise<Modele> {
  const { rows } = await db.query(
    'SELECT version, variante_prompt, poids_axes FROM reco_modele WHERE actif',
  );
  if (!rows.length) {
    // Pas de modèle entraîné : tous les axes pèsent 1
    return {
      version: 'non entraîné',
      variante: 'few_shot',
      poids: Object.fromEntries(AXES.map((a) => [a, 1])) as Scores,
    };
  }
  return {
    version: rows[0].version,
    variante: rows[0].variante_prompt,
    poids: rows[0].poids_axes,
  };
}

const vecteur = (s: Scores) => AXES.map((a) => s[a]);

function distance(u: number[], v: number[], w: number[]) {
  return Math.sqrt(u.reduce((t, x, k) => t + (v[k] - x) ** 2 * w[k], 0));
}

// 100 % = identique ; 0 % = opposé sur tous les axes
function correspondance(d: number, w: number[]) {
  const dMax = Math.sqrt(w.reduce((t, x) => t + 100 * x, 0));
  return Math.min(100, Math.max(0, 100 * (1 - d / dMax)));
}

const arrondi = (x: number, n = 1) => Math.round(x * 10 ** n) / 10 ** n;

function explication(u: Scores, f: Scores) {
  const ecarts = [...AXES].sort(
    (a, b) => Math.abs(u[a] - f[a]) - Math.abs(u[b] - f[b]),
  );
  const proche = (a: Axe) =>
    `${NOMS_AXES[a]} (${f[a].toFixed(0)} pour ${u[a]} demandé)`;
  let texte = `Proche sur ${proche(ecarts[0])} et ${proche(ecarts[1])}.`;
  const loin = ecarts[ecarts.length - 1];
  if (Math.abs(u[loin] - f[loin]) >= 3) {
    const sens = f[loin] > u[loin] ? 'plus' : 'moins';
    texte += ` Plus éloigné sur ${NOMS_AXES[loin]} : la formule est ${sens} marquée (${f[loin].toFixed(0)} pour ${u[loin]}).`;
  }
  return texte;
}

// Identifiant de la formule dans la boutique (même règle dans ai/reco/exporter_sql.py)
export const produitId = (idFormule: number) => `formule-${idFormule}`;

const COLONNES_AXES = AXES.map((a) => `${a}::float8 AS ${a}`).join(', ');

export async function recommander(
  scores: Scores,
  modele: Modele,
  topFormules = 3,
  topIngredients = 5,
) {
  const [formulesRes, ingredientsRes] = await Promise.all([
    db.query(
      `SELECT id, nom, application, ${COLONNES_AXES}, famille_dominante,
              familles_principales, part_givaudan_pct::float8 AS part_givaudan_pct,
              ingredients_givaudan_principaux, hors_catalogue_2024
       FROM givaudan_formules ORDER BY id`,
    ),
    db.query(
      `SELECT cle, nom, famille, ${COLONNES_AXES}, prix_eur_kg::float8 AS prix
       FROM givaudan_ingredients WHERE encore_au_catalogue`,
    ),
  ]);
  if (!formulesRes.rowCount) {
    throw new HttpError(503, 'Données Givaudan absentes de la base');
  }
  const w = vecteur(modele.poids);
  const u = vecteur(scores);

  const top = formulesRes.rows
    .map((f) => ({ f, d: distance(u, vecteur(f), w) }))
    .sort((a, b) => a.d - b.d || a.f.id - b.f.id)
    .slice(0, topFormules);

  const formules = top.map(({ f, d }, i) => ({
    rang: i + 1,
    id_formule: f.id,
    produit_id: produitId(f.id),
    nom: f.nom,
    application: f.application,
    correspondance_pct: arrondi(correspondance(d, w)),
    profil: Object.fromEntries(AXES.map((a) => [a, arrondi(f[a])])),
    famille_dominante: f.famille_dominante,
    familles_principales: f.familles_principales,
    part_givaudan_pct: f.part_givaudan_pct,
    ingredients_givaudan_principaux: f.ingredients_givaudan_principaux,
    alerte_catalogue: f.hors_catalogue_2024
      ? `Contient des ingrédients Givaudan absents du catalogue 2024 : ${f.hors_catalogue_2024}`
      : null,
    pourquoi: explication(scores, f),
  }));

  // À distance égale : d'abord les ingrédients des formules recommandées, puis
  // ceux dont on connaît le prix
  let ingredients: object[] = [];
  if (topIngredients > 0) {
    const { rows } = await db.query<{ cle: string }>(
      'SELECT DISTINCT cle FROM givaudan_formule_ingredients WHERE formule_id = ANY($1)',
      [top.map((t) => t.f.id)],
    );
    const clesTop = new Set(rows.map((r) => r.cle));
    ingredients = ingredientsRes.rows
      .map((r) => ({
        r,
        d: arrondi(distance(u, vecteur(r), w), 6),
        dansTop: clesTop.has(r.cle),
      }))
      .sort(
        (a, b) =>
          a.d - b.d ||
          Number(b.dansTop) - Number(a.dansTop) ||
          Number(b.r.prix !== null) - Number(a.r.prix !== null) ||
          (a.r.nom < b.r.nom ? -1 : a.r.nom > b.r.nom ? 1 : 0),
      )
      .slice(0, topIngredients)
      .map(({ r, d, dansTop }) => ({
        nom: r.nom,
        famille: r.famille,
        correspondance_pct: arrondi(correspondance(d, w)),
        utilise_dans_une_formule_recommandee: dansTop,
        prix_indicatif_eur_kg: r.prix === null ? null : Math.round(r.prix),
      }));
  }

  return {
    scores_utilises: scores,
    formules,
    ingredients,
    modele: { version: modele.version, poids_axes: modele.poids },
    note_prix:
      'Prix de détail revendeur pour 100 g pur, convertis en EUR : indicatifs, ce ne sont pas les tarifs Givaudan.',
  };
}
