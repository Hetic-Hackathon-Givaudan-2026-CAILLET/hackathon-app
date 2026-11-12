import { catalog } from './catalog';
import { derive, matchLabel, ranked } from './recommend';
import { state } from './state';
import type { Product } from './types';
import { esc } from './util';

export function photo(p: Product, cls = '') {
  return p.image
    ? `<div class="photo ${cls}"><img src="${p.image}" alt="${esc(p.name)}"></div>`
    : `<div class="photo ph ${cls}"><span>Image à fournir : ${esc(p.name)}</span></div>`;
}

export function stepsHeader(active: string) {
  return `<div class="steps" aria-label="Étapes de commande">${[
    'Panier',
    'Compte',
    'Paiement',
  ]
    .map(
      (s) => `<span ${s === active ? 'aria-current="step"' : ''}>${s}</span>`,
    )
    .join('')}</div>`;
}

export function slidersHTML() {
  return state.axes
    .map((a, i) => {
      const ax = catalog.axes[a];
      return `<div class="slider"><span class="l">${ax.left}</span><input type="range" min="0" max="100" value="${state.sliders[i]}" data-slider="${i}" style="--v:${state.sliders[i]}%" aria-label="${ax.left} ou ${ax.right}"><span class="r">${ax.right}</span></div>`;
    })
    .join('');
}

export function gridHTML() {
  return ranked()
    .map(({ p, sc }) => {
      const q = state.cart[p.id] || 0;
      return `<article class="card pcard">${
        p.image
          ? `<img class="pbg" src="${p.image}" alt="${esc(p.name)}" style="object-position:${esc(p.imageFocus)}">`
          : `<div class="pbg ph"></div>`
      }<h3 class="pname">${esc(p.name)}</h3><div class="pinfo"><span class="match">${matchLabel(sc)}</span><p class="pdesc">${esc(p.desc)}</p><span class="tags">${p.tags.join(', ')} · réf. démo ${p.ref}</span><button class="btn ghost small block" data-act="add" data-id="${p.id}">Ajouter au panier</button><span class="incart">${q ? 'Dans votre panier : ' + q : ''}</span></div></article>`;
    })
    .join('');
}

export function examplesHTML() {
  return `<div class="exs"><p>Essayer avec un exemple</p><div class="exgrid">${catalog.examples
    .map(
      (x, i) =>
        `<button class="ex" data-act="ex" data-i="${i}"><b>${x.title}</b><span class="s">Curseurs : ${derive(
          x.text,
        )
          .axes.map((a) => catalog.axes[a].name)
          .join(', ')}</span></button>`,
    )
    .join('')}</div></div>`;
}

// Dernière réponse de l'assistant, annoncée aux lecteurs d'écran
export function replyHTML() {
  return state.reply
    ? `<p class="reply" role="status"><span class="sr">Assistant : </span>${esc(state.reply)}</p>`
    : '';
}
