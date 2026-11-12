import { Router } from 'express';
import { db } from '../db.js';

export const catalog = Router();

// Tout ce que le front lisait dans des constantes : parfums, curseurs, vocabulaire…
// Les tableaux sont ordonnés ; un parfum liste ses scores dans l'ordre des axes.
catalog.get('/catalog', async (_req, res) => {
  const [axes, products, shopTypes, lexicon, examples, steps, statuses] =
    await Promise.all([
      db.query(
        `SELECT id, left_pole AS left, right_pole AS right, short_name AS name
         FROM axes ORDER BY id`,
      ),
      db.query(
        `SELECT p.id, p.name, p.ref, p.description AS desc, p.tags,
                p.image, p.image_focus AS "imageFocus",
                array_agg(s.score::float8 ORDER BY s.axis_id) AS v
         FROM products p JOIN product_scores s ON s.product_id = p.id
         WHERE p.active GROUP BY p.id ORDER BY p.position`,
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
