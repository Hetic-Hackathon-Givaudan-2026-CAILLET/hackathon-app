import { Router } from 'express';
import { customerId } from '../customer.js';
import { db } from '../db.js';
import { asObject, HttpError } from '../http.js';

export const orders = Router();

// Une commande vue par le front : `id` est le numéro affiché (2026-1000)
const SELECT = `SELECT o.reference AS id, o.status AS step, o.demo,
  json_agg(json_build_object('id', i.product_id, 'qty', i.qty)
           ORDER BY i.product_id) AS items
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.customer_id = $1`;
const GROUP = 'GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC';

orders.get('/orders', async (_req, res) => {
  const { rows } = await db.query(`${SELECT} ${GROUP}`, [customerId(res)]);
  res.json(rows);
});

// Crée la commande à partir du panier. Le paiement est une démonstration :
// le front valide la carte lui-même et ne transmet jamais ses données.
orders.post('/orders', async (req, res) => {
  const { items } = asObject(req.body);
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    throw new HttpError(400, 'items : 1 à 50 lignes attendues');
  }
  const lines = new Map<string, number>();
  for (const raw of items) {
    const { id, qty } = asObject(raw);
    if (typeof id !== 'string' || !Number.isInteger(qty)) {
      throw new HttpError(400, 'Chaque ligne a un id et une quantité entière');
    }
    if ((qty as number) < 1 || (qty as number) > 99) {
      throw new HttpError(400, 'La quantité doit être comprise entre 1 et 99');
    }
    lines.set(id, (lines.get(id) ?? 0) + (qty as number));
  }
  if ([...lines.values()].some((qty) => qty > 99)) {
    throw new HttpError(400, 'La quantité doit être comprise entre 1 et 99');
  }

  const known = await db.query(
    'SELECT id FROM products WHERE active AND id = ANY($1)',
    [[...lines.keys()]],
  );
  if (known.rowCount !== lines.size) {
    throw new HttpError(400, 'Parfum inconnu dans la commande');
  }

  const client = await db.connect();
  let reference: string;
  try {
    await client.query('BEGIN');
    const order = await client.query(
      `INSERT INTO orders (customer_id, status) VALUES ($1, 'paid')
       RETURNING id, reference`,
      [customerId(res)],
    );
    for (const [productId, qty] of lines) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, qty) VALUES ($1, $2, $3)',
        [order.rows[0].id, productId, qty],
      );
    }
    await client.query('COMMIT');
    reference = order.rows[0].reference;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await db.query(`${SELECT} AND o.reference = $2 ${GROUP}`, [
    customerId(res),
    reference,
  ]);
  res.status(201).json(rows[0]);
});

// Fonction de démonstration : le prototype laisse changer l'étape à la main.
// En production, ce serait réservé à un outil interne.
orders.patch('/orders/:reference/status', async (req, res) => {
  const { status } = asObject(req.body);
  if (typeof status !== 'string') {
    throw new HttpError(400, 'status : code attendu');
  }
  const known = await db.query('SELECT 1 FROM order_statuses WHERE code = $1', [
    status,
  ]);
  if (!known.rowCount) throw new HttpError(400, 'Statut inconnu');
  const { rowCount } = await db.query(
    'UPDATE orders SET status = $3 WHERE customer_id = $1 AND reference = $2',
    [customerId(res), req.params.reference, status],
  );
  if (!rowCount) throw new HttpError(404, 'Commande introuvable');
  const { rows } = await db.query(`${SELECT} AND o.reference = $2 ${GROUP}`, [
    customerId(res),
    req.params.reference,
  ]);
  res.json(rows[0]);
});
