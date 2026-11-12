import { catalog } from './catalog';
import { state } from './state';
import type { Product } from './types';
import { esc } from './util';

export function photo(p: Product, cls = '') {
  return p.image
    ? `<div class="photo ${cls}"><img src="${p.image}" alt="${esc(p.name)}"></div>`
    : `<div class="photo ph ${cls}"><span>${esc(p.tags[0] ?? p.name)}</span></div>`;
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

export function examplesHTML() {
  return `<div class="exs"><p>Essayer avec un exemple</p><div class="exgrid">${catalog.examples
    .map(
      (x, i) =>
        `<button class="ex" data-act="ex" data-i="${i}"><b>${x.title}</b><span class="s">${esc(x.text)}</span></button>`,
    )
    .join('')}</div></div>`;
}

// Dernière réponse de l'assistant, annoncée aux lecteurs d'écran
export function replyHTML() {
  return state.reply
    ? `<p class="reply" role="status"><span class="sr">Assistant : </span>${esc(state.reply)}</p>`
    : '';
}
