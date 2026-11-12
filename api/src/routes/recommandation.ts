import { Router } from 'express';
import { MODEL_API_KEY, MODEL_API_URL } from '../config.js';
import { asObject, HttpError } from '../http.js';

export const recommandation = Router();

// Service IA de l'équipe Data/IA (ai/, voir docs/integration/modele-recommandation.md). Les réponses sont déjà au format
// du site : identifiants de produits, curseurs de 0 à 100.
async function forward(path: string, body: unknown, timeoutMs: number) {
  let response: Response;
  try {
    response = await fetch(`${MODEL_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MODEL_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.error('Modèle injoignable :', err);
    throw new HttpError(502, 'Le modèle de recommandation est indisponible');
  }
  if (!response.ok) {
    console.error(`Modèle : ${response.status} ${await response.text()}`);
    throw new HttpError(502, 'Le modèle de recommandation est indisponible');
  }
  return response.json();
}

const text = (value: unknown, field: string, required = true) => {
  const s = typeof value === 'string' ? value.trim() : '';
  if ((required && !s) || s.length > 1000) {
    throw new HttpError(400, `${field} : 1 à 1000 caractères attendus`);
  }
  return s || null;
};

const numbers = (value: unknown, field: string) => {
  if (
    !Array.isArray(value) ||
    !value.length ||
    !value.every((n) => Number.isInteger(n))
  ) {
    throw new HttpError(400, `${field} : liste d'entiers attendue`);
  }
  return value as number[];
};

// Chatbot : la demande du commerçant -> produits et position conseillée des curseurs
recommandation.post('/recommandation', async (req, res) => {
  const body = asObject(req.body);
  const description = text(body.description, 'description');
  // Premier appel lent : le LLM se charge en mémoire
  res.json(await forward('/site/recommander', { description }, 90_000));
});

// Curseurs : le client a réglé les curseurs -> nouveaux produits
recommandation.post('/recommandation/curseurs', async (req, res) => {
  const body = asObject(req.body);
  res.json(
    await forward(
      '/site/curseurs',
      {
        description: text(body.description, 'description'),
        complement: text(body.complement, 'complement', false),
        axes: numbers(body.axes, 'axes'),
        curseurs: numbers(body.curseurs, 'curseurs'),
      },
      30_000,
    ),
  );
});
