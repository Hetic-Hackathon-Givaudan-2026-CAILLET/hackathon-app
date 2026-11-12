import { Router } from 'express';
import { asObject, HttpError, optInt, type Json } from '../http.js';
import { AXES, lire, modeleActif, recommander, type Scores } from '../reco.js';

export const recommandation = Router();

function tops(body: Json) {
  return [
    optInt(body, 'top_formules', 1, 13) ?? 3,
    optInt(body, 'top_ingredients', 0, 20) ?? 5,
  ] as const;
}

// Description libre → 5 notes (LLM, secours mots-clés) → formules et ingrédients.
// `ajustements` : curseurs corrigés par la boutique, prioritaires sur la lecture.
recommandation.post('/recommandation', async (req, res) => {
  const body = asObject(req.body);
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < 3 || description.length > 1000) {
    throw new HttpError(400, 'description : 3 à 1000 caractères attendus');
  }
  const modele = await modeleActif();
  const { scores, methode } = await lire(description, modele.variante);
  if (body.ajustements !== undefined && body.ajustements !== null) {
    const aj = asObject(body.ajustements);
    for (const a of AXES) {
      const v = optInt(aj, a, 0, 10);
      if (v !== null) scores[a] = v;
    }
  }
  const [f, i] = tops(body);
  res.json({
    ...(await recommander(scores, modele, f, i)),
    methode_lecture: methode,
  });
});

// 5 curseurs (0 à 10) → même résultat, sans LLM, instantané
recommandation.post('/recommandation/curseurs', async (req, res) => {
  const body = asObject(req.body);
  const scores = {} as Scores;
  for (const a of AXES) {
    const v = optInt(body, a, 0, 10);
    if (v === null)
      throw new HttpError(400, `${a} : entier entre 0 et 10 attendu`);
    scores[a] = v;
  }
  const [f, i] = tops(body);
  res.json(await recommander(scores, await modeleActif(), f, i));
});
