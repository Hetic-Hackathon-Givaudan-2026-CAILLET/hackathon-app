import { api, ApiError } from './api';
import { render } from './render';
import { state } from './state';
import type { RecoAxes } from './types';
import { esc } from './util';

const AXES: [keyof RecoAxes, string][] = [
  ['chaleur', 'Chaleur'],
  ['fraicheur', 'Fraîcheur'],
  ['floral', 'Floral'],
  ['boise', 'Boisé'],
  ['intensite', 'Intensité'],
];

// Texte envoyé au modèle : la demande et son complément éventuel
const recoKey = () => [state.desc, state.extra].filter(Boolean).join('. ');

// Lance la recommandation si la demande a changé ; la vue se redessine à
// l'arrivée de la réponse, si l'utilisateur est toujours sur la même demande
export function ensureReco() {
  const key = recoKey();
  if (!key || state.reco.key === key) return;
  state.reco = { key, status: 'loading', data: null, error: '' };
  api
    .reco(key)
    .then((data) => {
      if (state.reco.key !== key) return;
      state.reco = { key, status: 'ready', data, error: '' };
    })
    .catch((e) => {
      if (state.reco.key !== key) return;
      const error =
        e instanceof ApiError ? e.message : 'Réponse inattendue du serveur.';
      state.reco = { key, status: 'error', data: null, error };
    })
    .finally(() => {
      if (state.reco.key === key && location.hash === '#selection') render();
    });
}

const bar = (label: string, v: number) =>
  `<span class="rbar"><span>${label}</span><span class="rtrack"><span style="width:${Math.max(0, Math.min(10, v)) * 10}%"></span></span><b>${Math.round(v)}</b></span>`;

export function recoHTML() {
  const r = state.reco;
  const head = `<h2>Formules Givaudan recommandées</h2>`;
  if (r.status === 'loading' || r.status === 'idle') {
    return `<section class="reco" aria-busy="true">${head}<p class="hint" role="status">Le modèle analyse votre demande… (jusqu’à une minute au premier appel)</p></section>`;
  }
  if (r.status === 'error' || !r.data) {
    return `<section class="reco">${head}<p class="hint" role="status">${esc(r.error || 'Recommandation indisponible.')}</p></section>`;
  }
  const d = r.data;
  const lecture =
    d.methode_lecture === 'llm'
      ? 'lue par l’IA'
      : 'lue par mots-clés (IA indisponible)';
  return `<section class="reco">${head}
    <p class="hint">Votre demande, ${lecture} :</p>
    <div class="rscores">${AXES.map(([k, l]) => bar(l, d.scores_utilises[k])).join('')}</div>
    <div class="rgrid">${d.formules
      .map(
        (f) => `<article class="card rcard">
        <div class="rtop"><span class="rrank">${f.rang}</span><h3>${esc(f.nom)}</h3><span class="match">${f.correspondance_pct.toFixed(0)} %</span></div>
        <p class="pdesc">${esc(f.familles_principales)}</p>
        <p class="hint">${esc(f.pourquoi)}</p>
        <div class="rscores small">${AXES.map(([k, l]) => bar(l, f.profil[k])).join('')}</div>
        <p class="tags">Ingrédients Givaudan : ${esc(f.ingredients_givaudan_principaux)} · ${f.part_givaudan_pct} % de la formule</p>
        ${f.alerte_catalogue ? `<p class="ralert">${esc(f.alerte_catalogue)}</p>` : ''}
      </article>`,
      )
      .join('')}</div>
    ${
      d.ingredients.length
        ? `<h3 class="rsub">Ingrédients Givaudan proches</h3><ul class="ringr">${d.ingredients
            .map(
              (i) =>
                `<li><b>${esc(i.nom)}</b> <span class="hint">${esc(i.famille)} · ${i.correspondance_pct.toFixed(0)} %${i.prix_indicatif_eur_kg !== null ? ` · ~${i.prix_indicatif_eur_kg} €/kg` : ''}</span></li>`,
            )
            .join('')}</ul><p class="hint small">${esc(d.note_prix)}</p>`
        : ''
    }
    <p class="hint small">Modèle ${esc(d.modele.version)}.</p>
  </section>`;
}
