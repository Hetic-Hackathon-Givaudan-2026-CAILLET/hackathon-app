import { catalog } from '../catalog';
import { photo, stepsHeader } from '../components';
import { state } from '../state';
import { esc } from '../util';

export function panier() {
  const ids = Object.keys(state.cart);
  if (!ids.length) {
    return `${stepsHeader('Panier')}<div class="card empty"><h2>Votre panier est vide</h2><button class="btn" data-act="go" data-to="selection">Retour à la sélection</button></div>`;
  }
  const lines = ids
    .map((id) => {
      const p = catalog.productsById[id];
      const q = state.cart[id];
      return `<div class="card line">${photo(p)}<div><h3>${esc(p.name)}</h3><span class="ref">Réf. démo ${p.ref}</span></div><div class="qty"><button data-act="qty" data-id="${id}" data-d="-1" aria-label="Diminuer la quantité de ${esc(p.name)}">−</button><output aria-live="polite">${q}</output><button data-act="qty" data-id="${id}" data-d="1" aria-label="Augmenter la quantité de ${esc(p.name)}">+</button></div><button class="linkbtn rm" data-act="remove" data-id="${id}">Retirer</button></div>`;
    })
    .join('');
  return `${stepsHeader('Panier')}<div class="lines">${lines}</div><div class="card sum"><div class="row"><span>Sous-total</span><b style="font-weight:500">Sur devis</b></div><p class="hint">Livraison calculée à l’étape suivante</p><button class="btn" data-act="checkout">Commander</button></div>`;
}
