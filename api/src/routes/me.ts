import { Router } from 'express';
import { customerId } from '../customer.js';
import { db } from '../db.js';
import { asObject, HttpError, optText } from '../http.js';

export const me = Router();

const COLUMNS = 'prenom, nom, adresse, email, tel';

// Profil du visiteur ; champs null tant qu'il n'a pas « créé son compte »
me.get('/me', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM customers WHERE id = $1`,
    [customerId(res)],
  );
  res.json(rows[0]);
});

me.put('/me', async (req, res) => {
  const body = asObject(req.body);
  const email = optText(body, 'email', 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'email : adresse invalide');
  }
  try {
    const { rows } = await db.query(
      `UPDATE customers
       SET prenom = $2, nom = $3, adresse = $4, email = $5, tel = $6,
           updated_at = now()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [
        customerId(res),
        optText(body, 'prenom', 100),
        optText(body, 'nom', 100),
        optText(body, 'adresse', 300),
        email,
        optText(body, 'tel', 30),
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    // 23505 : violation d'unicité (customers_email_key)
    if ((err as { code?: string }).code === '23505') {
      throw new HttpError(409, 'Cette adresse e-mail est déjà utilisée');
    }
    throw err;
  }
});
