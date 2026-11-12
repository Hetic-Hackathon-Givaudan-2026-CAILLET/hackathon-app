import type { NextFunction, Request, Response } from 'express';
import { db } from './db.js';
import { HttpError } from './http.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Le visiteur est identifié par l'UUID que son navigateur envoie dans
// X-Customer-Id. Sans authentification (ADR 0004), cet identifiant est un
// secret de session : quiconque le connaît accède aux données du visiteur.
export async function customer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = req.get('X-Customer-Id') ?? '';
  if (!UUID.test(id)) {
    throw new HttpError(400, 'En-tête X-Customer-Id manquant ou invalide');
  }
  await ensureCustomer(id);
  res.locals.customerId = id.toLowerCase();
  next();
}

export const customerId = (res: Response): string => res.locals.customerId;

// Crée le visiteur à sa première requête, avec une commande fictive à suivre
async function ensureCustomer(id: string) {
  const { rowCount } = await db.query(
    'INSERT INTO customers (id) VALUES ($1) ON CONFLICT DO NOTHING',
    [id.toLowerCase()],
  );
  if (!rowCount) return;
  const { rows } = await db.query(
    `INSERT INTO orders (reference, customer_id, status, demo)
     VALUES ('2026-0412', $1, 'delivering', true) RETURNING id`,
    [id.toLowerCase()],
  );
  await db.query(
    `INSERT INTO order_items (order_id, product_id, qty)
     SELECT $1, id, 1 FROM products WHERE active ORDER BY position LIMIT 1`,
    [rows[0].id],
  );
}
