import { Router } from 'express';
import { RECO_API_URL } from '../config.js';
import { asObject, HttpError } from '../http.js';

export const reco = Router();

// Recommandation de formules Givaudan par le modèle de l'équipe Data/IA
// (service Python reco/, lancé à part : voir api.py). L'API ne fait que
// transmettre la description et renvoyer la réponse telle quelle.
reco.post('/recommandation', async (req, res) => {
  if (!RECO_API_URL) {
    throw new HttpError(503, 'Modèle de recommandation non configuré');
  }
  const body = asObject(req.body);
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < 3 || description.length > 1000) {
    throw new HttpError(400, 'description : 3 à 1000 caractères attendus');
  }

  let response: Response;
  try {
    response = await fetch(`${RECO_API_URL}/recommander`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        top_formules: 3,
        top_ingredients: 5,
      }),
      // Le LLM peut mettre une minute à se charger au premier appel
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    console.error('Modèle de recommandation injoignable :', err);
    throw new HttpError(502, 'Le modèle de recommandation est indisponible');
  }
  if (!response.ok) {
    console.error(`Reco : ${response.status} ${await response.text()}`);
    throw new HttpError(502, 'Le modèle de recommandation est indisponible');
  }
  res.json(await response.json());
});
