import { Router } from 'express';
import { complete, type ChatMessage } from '../ai.js';
import { db } from '../db.js';
import { asObject, HttpError, type Json } from '../http.js';

export const chat = Router();

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Un petit modèle se trompe sur le sens d'une échelle numérique, mais choisit
// bien des mots dans une liste : il renvoie des adjectifs d'ambiance, que le
// front convertit en curseurs grâce au vocabulaire de la base (lexicon_entries).
// Les adjectifs sont au féminin, accordés à « une ambiance », comme le modèle
// les écrit naturellement.
function systemPrompt(adjectives: string[], types: string[]) {
  return `Tu es l'assistant de Givaudan, spécialiste du parfum d'ambiance. Un commerçant décrit sa boutique et l'ambiance olfactive qu'il souhaite. Tu réponds uniquement par un objet JSON, sans autre texte :
{"type": <type>, "ambiance": [<adjectifs>], "reponse": "<texte>"}

- Le message de l'utilisateur contient la demande et une « analyse automatique » (type et ambiance déjà repérés). Appuie-toi dessus : garde-la si elle est cohérente avec la demande, complète-la seulement si elle est vide ou incomplète.
- "type" : le type de boutique, choisi parmi : ${types.join(', ')}. Mets null si aucun ne convient.
- "ambiance" : de 0 à 4 adjectifs qui décrivent l'ambiance voulue, choisis uniquement parmi : ${adjectives.join(', ')}.
- "reponse" : une seule phrase courte, en français, qui reformule la demande en reprenant uniquement les adjectifs choisis. N'invente aucune odeur, aucun ingrédient, aucun produit, ne fais aucune recommandation.
- Si la demande ne parle ni d'une boutique ni d'une ambiance, mets null et [], et demande poliment dans "reponse" de décrire la boutique et l'ambiance souhaitée.`;
}

// Exemples sous forme d'échanges : un petit modèle les imite mieux qu'un texte
// d'instructions. Un « Bonjour » et un complément de demande évitent qu'il
// invente une ambiance quand il n'y en a pas.
const EXAMPLES: [string, Hint, object][] = [
  [
    'Je tiens une librairie et je veux quelque chose de chaleureux et de calme.',
    { type: 'librairie', ambiance: ['chaleureuse', 'apaisante'] },
    {
      type: 'librairie',
      ambiance: ['chaleureuse', 'apaisante'],
      reponse:
        'Pour votre librairie, je retiens une ambiance chaleureuse et apaisante.',
    },
  ],
  [
    'Bonjour',
    { type: null, ambiance: [] },
    {
      type: null,
      ambiance: [],
      reponse:
        "Bonjour ! Décrivez-moi votre boutique et l'ambiance que vous souhaitez.",
    },
  ],
  [
    'Ma salle de sport doit donner la pêche, avec un côté propre et vif.',
    { type: 'salle de sport', ambiance: ['pétillante'] },
    {
      type: 'salle de sport',
      ambiance: ['pétillante', 'fraîche'],
      reponse:
        'Pour votre salle de sport, je retiens une ambiance pétillante et fraîche.',
    },
  ],
  [
    'plus de bois',
    { type: null, ambiance: ['boisée'] },
    {
      type: null,
      ambiance: ['boisée'],
      reponse: "C'est noté, j'ajoute une touche boisée.",
    },
  ],
  [
    'Mon concept store doit sentir bon, comme à la maison.',
    { type: 'concept store', ambiance: [] },
    {
      type: 'concept store',
      ambiance: ['chaleureuse', 'douce'],
      reponse:
        'Pour votre concept store, je retiens une ambiance chaleureuse et douce.',
    },
  ],
];

type Hint = { type: string | null; ambiance: string[] };

const hintLine = (hint: Hint) =>
  `Analyse automatique : type = ${hint.type ?? 'inconnu'} ; ambiance = ${hint.ambiance.join(', ') || 'aucune'}.`;
const userTurn = (message: string, hint: Hint) =>
  `Demande : ${message}\n${hintLine(hint)}`;

// Extrait l'objet JSON de la réponse, même entouré de texte
function parseJson(raw: string): Json | null {
  for (const candidate of [raw, /\{[\s\S]*\}/.exec(raw)?.[0]]) {
    if (!candidate) continue;
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
      }
    } catch {
      // On essaie le candidat suivant
    }
  }
  return null;
}

// Répond à une demande en langage naturel : type de boutique et réponse.
// Le front envoie en indice son analyse par mots-clés, qui règle les curseurs
// et sert de secours quand l'assistant est indisponible.
chat.post('/chat', async (req, res) => {
  const body = asObject(req.body);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1000) {
    throw new HttpError(400, 'message : 1 à 1000 caractères attendus');
  }

  const [vocabulary, typesResult] = await Promise.all([
    db.query<{ tag: string; adjective: string }>(
      'SELECT tag, adjective FROM lexicon_entries ORDER BY position',
    ),
    db.query<{ label: string }>(
      'SELECT label FROM shop_types WHERE NOT is_default ORDER BY position',
    ),
  ]);
  const knownWords = vocabulary.rows;
  const types = typesResult.rows.map((r) => r.label);

  // Indice envoyé par le front : seuls les mots connus sont repris dans le
  // prompt, jamais du texte libre
  const given = body.hint === undefined ? {} : asObject(body.hint);
  const hint: Hint = {
    type:
      typeof given.type === 'string'
        ? (types.find((t) => plain(t) === plain(given.type as string)) ?? null)
        : null,
    ambiance: (Array.isArray(given.ambiance) ? given.ambiance : [])
      .map((a) => knownWords.find((w) => w.tag === a)?.adjective)
      .filter((a): a is string => a !== undefined),
  };

  const raw = await complete(
    [
      {
        role: 'system',
        content: systemPrompt(
          knownWords.map((w) => w.adjective),
          types,
        ),
      },
      ...EXAMPLES.flatMap(([question, exampleHint, answer]): ChatMessage[] => [
        { role: 'user', content: userTurn(question, exampleHint) },
        { role: 'assistant', content: JSON.stringify(answer) },
      ]),
      { role: 'user', content: userTurn(message, hint) },
    ],
    { json: true, timeoutMs: 30_000 },
  );
  const parsed = parseJson(raw);
  if (!parsed) {
    throw new HttpError(502, "Réponse de l'assistant inexploitable");
  }

  // Le modèle est petit : on ne retient que ce qui figure dans les listes.
  // Ses mots d'ambiance ne sont pas renvoyés : sans mot-clé dans la demande,
  // ils se sont révélés trop souvent faux (voir EXAMPLES et le front).
  const type =
    typeof parsed.type === 'string'
      ? (types.find((t) => plain(t) === plain(parsed.type as string)) ?? null)
      : null;
  const reply =
    typeof parsed.reponse === 'string'
      ? parsed.reponse.trim().slice(0, 500) || null
      : null;

  res.json({ reply, type });
});
