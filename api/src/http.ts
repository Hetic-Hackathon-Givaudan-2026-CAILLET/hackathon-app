import type { NextFunction, Request, Response } from 'express';

// Erreur à renvoyer telle quelle au client (message en français, sans détail technique)
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Express 5 transmet les erreurs des gestionnaires async à ce middleware.
// Les quatre paramètres sont obligatoires : c'est ce qui l'identifie comme tel.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Corps de requête illisible' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne' });
}

// --- Validation des entrées -------------------------------------------------

export type Json = Record<string, unknown>;

export function asObject(value: unknown): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'Un objet JSON est attendu');
  }
  return value as Json;
}

// Texte facultatif : espaces retirés, null si vide
export function optText(body: Json, key: string, max = 500): string | null {
  const value = body[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${key} : texte attendu`);
  }
  const text = value.trim();
  if (text.length > max) {
    throw new HttpError(400, `${key} : ${max} caractères au plus`);
  }
  return text || null;
}

// Entier facultatif dans [min, max], null si absent
export function optInt(
  body: Json,
  key: string,
  min: number,
  max: number,
): number | null {
  const value = body[key];
  if (value === undefined || value === null || value === '') return null;
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  ) {
    throw new HttpError(400, `${key} : entier entre ${min} et ${max} attendu`);
  }
  return value as number;
}
