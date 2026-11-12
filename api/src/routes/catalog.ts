import { Router } from 'express';
import { db } from '../db.js';

export const catalog = Router();

// Tout ce que le front lisait dans des constantes : parfums, curseurs, vocabulaire…
// Les tableaux sont ordonnés.
catalog.get('/catalog', async (_req, res) => {
  const [axes, products, shopTypes, lexicon, examples, steps, statuses] =
    await Promise.all([
      db.query(
        `SELECT id, left_pole AS left, right_pole AS right, short_name AS name
         FROM axes ORDER BY id`,
      ),
      // Les produits sont les formules Givaudan (db/init/006, issu de ai/data/raw)
      db.query(
        `SELECT id, name, ref, description AS desc, tags,
                image, image_focus AS "imageFocus"
         FROM products WHERE active ORDER BY position`,
      ),
      db.query(
        `SELECT label, pattern, flags, axes, vals, is_default AS "isDefault"
         FROM shop_types ORDER BY position`,
      ),
      db.query(
        `SELECT pattern, flags, adjective AS adj, tag, axis_id AS axis,
                axis_value AS value
         FROM lexicon_entries ORDER BY position`,
      ),
      db.query('SELECT key, title, text FROM examples ORDER BY position'),
      db.query('SELECT label FROM order_steps ORDER BY position'),
      db.query(
        `SELECT code, label, current_step AS current, mode,
                headline AS head, detail, tone
         FROM order_statuses ORDER BY position`,
      ),
    ]);

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    axes: axes.rows,
    products: products.rows,
    shopTypes: shopTypes.rows,
    lexicon: lexicon.rows,
    examples: examples.rows,
    orderSteps: steps.rows.map((r) => r.label),
    orderStatuses: statuses.rows,
  });
});
