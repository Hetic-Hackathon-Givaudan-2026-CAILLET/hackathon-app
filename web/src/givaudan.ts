import { api, ApiError } from './api';
import { catalog } from './catalog';
import { state } from './state';
import {
  RECO_AXES,
  type RecoAxe,
  type RecoFormule,
  type RecoResult,
  type RecoScores,
} from './types';
import { esc } from './util';

// Recommandation de formules Givaudan (ADR 0007). Le modèle de langage note la
// demande sur 5 axes ; l'API classe les formules et ingrédients par distance.
// La section se met à jour seule, sans redessiner la page.

const NOMS: Record<RecoAxe, [string, string]> = {
  chaleur: ['Chaleur', 'chaude, gourmande, ambrée, épicée'],
  fraicheur: ['Fraîcheur', 'agrumes, vert, marin, propre'],
  floral: ['Floral', 'rose, jasmin, muguet…'],
  boise: ['Boisé', 'cèdre, santal, cuir, mousse'],
  intensite: ['Intensité', 'de discrète à très présente'],
};

type RecoState = {
  status: 'idle' | 'loading' | 'ok' | 'error';
  // Texte analysé : une nouvelle demande relance la lecture
  description: string;
  data: RecoResult | null;
  scores: RecoScores | null;
  methode: RecoResult['methode_lecture'] | null;
  error: string | null;
};

export const reco: RecoState = {
  status: 'idle',
  description: '',
  data: null,
  scores: null,
  methode: null,
  error: null,
};

// Image d'illustration commune, en attendant les vraies photos des formules
const SAMPLE_IMAGE = '/images/sample.svg';

// Cartes retournées (face détails visible), par id de formule. L'état survit
// aux redessins de la page, par exemple après « Ajouter au panier ».
const flipped = new Set<number>();

// Retourne une carte : la face cachée est rendue inerte (clavier, lecteurs d'écran)
export function flipCard(card: HTMLElement) {
  const id = Number(card.dataset.id);
  const on = !flipped.has(id);
  if (on) flipped.add(id);
  else flipped.delete(id);
  applyFlip(card, on);
  // Le focus suit la face visible
  card
    .querySelector<HTMLElement>(on ? '.face-back .flip-back' : '.face-front')
    ?.focus();
}

function applyFlip(card: HTMLElement, on: boolean) {
  card.classList.toggle('is-flipped', on);
  card.querySelector('.face-front')?.toggleAttribute('inert', on);
  card.querySelector('.face-back')?.toggleAttribute('inert', !on);
  card.querySelector('.face-front')?.setAttribute('aria-expanded', String(on));
}

// Seule la dernière requête lancée a le droit de mettre à jour l'affichage
let ticket = 0;

export function resetReco() {
  ticket++;
  Object.assign(reco, {
    status: 'idle',
    description: '',
    data: null,
    scores: null,
    methode: null,
    error: null,
  });
}

function refresh() {
  const el = document.getElementById('reco');
  if (el) el.innerHTML = recoInnerHTML();
}

export async function loadReco(description: string) {
  const t = ++ticket;
  reco.status = 'loading';
  reco.description = description;
  reco.error = null;
  flipped.clear();
  refresh();
  try {
    const data = await api.recommandation(description);
    if (t !== ticket) return;
    Object.assign(reco, {
      status: 'ok',
      data,
      scores: { ...data.scores_utilises },
      methode: data.methode_lecture ?? null,
    });
  } catch (e) {
    if (t !== ticket) return;
    reco.status = 'error';
    reco.error =
      e instanceof ApiError ? e.message : 'Recommandation indisponible.';
  }
  refresh();
}

// Lance la lecture si la demande affichée n'a pas encore été analysée
export function ensureReco(description: string) {
  if (description && reco.description !== description) {
    void loadReco(description);
  }
}

let debounce: ReturnType<typeof setTimeout>;

// Curseur déplacé : recalcul sans modèle de langage, quasi instantané
export function moveRecoSlider(axe: RecoAxe, value: number) {
  if (!reco.scores) return;
  reco.scores[axe] = value;
  const out = document.getElementById(`reco-v-${axe}`);
  if (out) out.textContent = String(value);
  clearTimeout(debounce);
  const t = ++ticket;
  const scores = { ...reco.scores };
  debounce = setTimeout(async () => {
    try {
      const data = await api.recommandationCurseurs(scores);
      if (t !== ticket) return;
      reco.data = data;
      reco.status = 'ok';
      reco.methode = null;
      const results = document.getElementById('reco-results');
      if (results) results.innerHTML = resultsHTML(data);
    } catch (e) {
      console.warn('Recommandation indisponible :', e);
    }
  }, 150);
}

// --- Gabarits ---------------------------------------------------------------

function slidersHTML(scores: RecoScores) {
  return RECO_AXES.map((a) => {
    const [nom, aide] = NOMS[a];
    return `<div class="slider reco-slider"><label for="reco-${a}"><b>${nom}</b><span class="hint">${aide}</span></label><input id="reco-${a}" type="range" min="0" max="10" step="1" value="${scores[a]}" data-reco-axis="${a}" style="--v:${scores[a] * 10}%"><output id="reco-v-${a}" for="reco-${a}">${scores[a]}</output></div>`;
  }).join('');
}

function profilHTML(f: RecoFormule) {
  return `<dl class="reco-profil">${RECO_AXES.map(
    (a) =>
      `<div><dt>${NOMS[a][0]}</dt><dd><span class="bar" style="--v:${f.profil[a] * 10}%"></span><span class="n">${f.profil[a]}</span></dd></div>`,
  ).join('')}</dl>`;
}

const matchLabel = (pct: number) =>
  pct >= 80
    ? 'Correspondance forte'
    : pct >= 70
      ? 'Correspondance bonne'
      : 'Correspondance possible';

function formuleHTML(f: RecoFormule) {
  const p = catalog.productsById[f.produit_id];
  const q = state.cart[f.produit_id] || 0;
  const nom = esc(p?.name ?? f.nom);
  const pct = Math.round(f.correspondance_pct);
  const on = flipped.has(f.id_formule);
  // Face avant : l'essentiel d'un coup d'œil. Le bouton couvre toute la face.
  const front = `<button type="button" class="face face-front" data-act="flip" aria-expanded="${on}" aria-label="${nom}, correspondance ${pct} %. Voir les détails"${on ? ' inert' : ''}>
      <span class="flip-photo"><img src="${SAMPLE_IMAGE}" alt="" loading="lazy"><span class="flip-rang">${f.rang}</span><span class="flip-pct">${pct} %</span></span>
      <span class="flip-info"><span class="flip-name">${nom}</span><span class="hint">${esc(f.application)}</span><span class="match">${matchLabel(f.correspondance_pct)}</span><span class="flip-more">Voir les détails</span></span>
    </button>`;
  // Face arrière : les détails, avec un vrai bouton pour revenir et un pour commander
  const back = `<div class="face face-back"${on ? '' : ' inert'}>
      <div class="reco-head"><span class="reco-rang">${f.rang}</span><div><h3>${nom}</h3><span class="hint">${esc(f.application)}</span></div><span class="reco-pct" title="Correspondance avec votre demande">${pct} %</span></div>
      <p class="reco-why">${esc(f.pourquoi)}</p>${profilHTML(f)}
      <p class="hint"><b>Familles :</b> ${esc(f.familles_principales)}</p>
      <p class="hint"><b>Ingrédients Givaudan principaux :</b> ${esc(f.ingredients_givaudan_principaux)} · ${f.part_givaudan_pct} % de la formule</p>
      ${f.alerte_catalogue ? `<p class="reco-alerte">${esc(f.alerte_catalogue)}</p>` : ''}
      <div class="flip-actions"><button type="button" class="btn ghost small flip-back" data-act="flip">Retour</button>${p ? `<button class="btn small" data-act="add" data-id="${esc(p.id)}">Ajouter au panier</button>` : ''}</div>
      <span class="incart">${q ? 'Dans votre panier : ' + q : ''}</span>
    </div>`;
  return `<article class="flipcard${on ? ' is-flipped' : ''}" data-id="${f.id_formule}">${front}${back}</article>`;
}

function resultsHTML(d: RecoResult) {
  const ingredients = d.ingredients.length
    ? `<h3 class="reco-sub">Ingrédients Givaudan au catalogue 2024</h3><div class="reco-table"><table><thead><tr><th scope="col">Ingrédient</th><th scope="col">Famille</th><th scope="col">Correspondance</th><th scope="col">Prix indicatif</th></tr></thead><tbody>${d.ingredients
        .map(
          (i) =>
            `<tr><td>${esc(i.nom)}${i.utilise_dans_une_formule_recommandee ? ' <span class="reco-tag">dans une formule</span>' : ''}</td><td>${esc(i.famille)}</td><td>${Math.round(i.correspondance_pct)} %</td><td>${i.prix_indicatif_eur_kg === null ? '—' : i.prix_indicatif_eur_kg.toLocaleString('fr-FR') + ' €/kg'}</td></tr>`,
        )
        .join(
          '',
        )}</tbody></table></div><p class="hint reco-note">${esc(d.note_prix)}</p>`
    : '';
  return `<div class="reco-grid">${d.formules.map(formuleHTML).join('')}</div>${ingredients}`;
}

function recoInnerHTML() {
  const head = `<h2>Souhaitez-vous ajuster votre requête ?</h2>`;
  if (reco.status === 'loading' || reco.status === 'idle') {
    return `${head}<p class="hint" role="status">Le modèle Givaudan analyse votre demande…</p>`;
  }
  if (reco.status === 'error' || !reco.data || !reco.scores) {
    return `${head}<p class="hint" role="status">${esc(reco.error ?? 'Recommandation indisponible.')}</p><button class="btn ghost small" data-act="reco-retry">Réessayer</button>`;
  }
  const lecture =
    reco.methode === 'llm'
      ? 'Curseurs réglés à partir de votre demande par le modèle de langage.'
      : reco.methode === 'mots-clés'
        ? 'Modèle de langage indisponible : curseurs réglés par mots-clés.'
        : 'Curseurs réglés à la main.';
  return `${head}<p class="hint">${lecture} Déplacez-les : les formules Givaudan sont recalculées aussitôt.</p>
    <div class="reco-sliders">${slidersHTML(reco.scores)}</div>
    <div id="reco-results" aria-live="polite">${resultsHTML(reco.data)}</div>`;
}

// Curseurs du modèle, formules Givaudan recommandées et ingrédients
export function recoHTML() {
  return `<section class="adjust reco" id="reco">${recoInnerHTML()}</section>`;
}
