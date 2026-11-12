import express from 'express';
import { complete } from './ai.js';
import { PORT } from './config.js';
import { customer } from './customer.js';
import { db } from './db.js';
import { errorHandler } from './http.js';
import { catalog } from './routes/catalog.js';
import { chat } from './routes/chat.js';
import { me } from './routes/me.js';
import { orders } from './routes/orders.js';
import { shop } from './routes/shop.js';

const app = express();
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const { rows } = await db.query('SELECT version()');
  res.json({ status: 'ok', db: rows[0].version });
});

app.get('/api/questions', async (_req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM questions ORDER BY id DESC LIMIT 10',
  );
  res.json(rows);
});

app.post('/api/questions', async (req, res) => {
  const question = String(req.body?.question ?? '').trim();
  if (!question) {
    res.status(400).json({ error: 'Question manquante' });
    return;
  }
  const answer = await ask(question);
  const { rows } = await db.query(
    'INSERT INTO questions (question, answer) VALUES ($1, $2) RETURNING *',
    [question, answer],
  );
  res.status(201).json(rows[0]);
});

// Catalogue : public. Le reste est rattaché au visiteur (en-tête X-Customer-Id)
app.use('/api', catalog, chat);
app.use('/api', customer, me, shop, orders);

// Même appel pour Ollama, Mistral, OpenAI… : seule la configuration change
const ask = (question: string) =>
  complete([{ role: 'user', content: question }]);

// Doit rester après les routes
app.use(errorHandler);

// Sans adresse, Node écoute sur toutes les interfaces : joignable hors du conteneur
app.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
