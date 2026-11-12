import { Router } from 'express';
import { customerId } from '../customer.js';
import { db } from '../db.js';
import { asObject, HttpError, optInt, optText } from '../http.js';

export const shop = Router();

// Les clés sont celles du formulaire du front ; en base, agemin/agemax → age_min/age_max
const SELECT = `SELECT nom, type, ville, site, budget, age_min AS agemin,
  age_max AS agemax, clients, ambiance, surface::float8 AS surface, adresse, contact
  FROM shops WHERE customer_id = $1`;

// Seules les clés renseignées sont renvoyées, comme le front les attend
function compact(row: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(row ?? {}).filter(([, v]) => v !== null),
  );
}

shop.get('/shop', async (_req, res) => {
  const { rows } = await db.query(SELECT, [customerId(res)]);
  res.json(compact(rows[0]));
});

// Remplace la fiche entière : une clé absente est effacée
shop.put('/shop', async (req, res) => {
  const body = asObject(req.body);
  const agemin = optInt(body, 'agemin', 0, 120);
  const agemax = optInt(body, 'agemax', 0, 120);
  if ((agemin === null) !== (agemax === null)) {
    throw new HttpError(400, 'agemin et agemax vont ensemble');
  }
  if (agemin !== null && agemax !== null && agemin > agemax) {
    throw new HttpError(400, 'agemin doit être inférieur ou égal à agemax');
  }
  let surface: number | null = null;
  if (body.surface !== undefined && body.surface !== null) {
    surface = Number(body.surface);
    if (
      typeof body.surface !== 'number' ||
      !(surface > 0) ||
      surface > 1000000
    ) {
      throw new HttpError(400, 'surface : nombre positif attendu');
    }
  }
  await db.query(
    `INSERT INTO shops (customer_id, nom, type, ville, site, budget, age_min,
                        age_max, clients, ambiance, surface, adresse, contact)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (customer_id) DO UPDATE SET
       nom = $2, type = $3, ville = $4, site = $5, budget = $6, age_min = $7,
       age_max = $8, clients = $9, ambiance = $10, surface = $11,
       adresse = $12, contact = $13, updated_at = now()`,
    [
      customerId(res),
      optText(body, 'nom', 200),
      optText(body, 'type', 100),
      optText(body, 'ville', 100),
      optText(body, 'site', 200),
      optText(body, 'budget', 50),
      agemin,
      agemax,
      optText(body, 'clients', 2000),
      optText(body, 'ambiance', 300),
      surface,
      optText(body, 'adresse', 300),
      optText(body, 'contact', 200),
    ],
  );
  const { rows } = await db.query(SELECT, [customerId(res)]);
  res.json(compact(rows[0]));
});
