import { catalog } from '../catalog';
import { photo } from '../components';
import { state } from '../state';
import { esc } from '../util';

export function suivi() {
  const cards = state.orders
    .map((o) => {
      const s =
        catalog.statuses.find((x) => x.code === o.step) ?? catalog.statuses[0];
      const items = o.items
        .map((it) => photo(catalog.productsById[it.id]))
        .join('');
      const names = o.items
        .map((it) => `${esc(catalog.productsById[it.id].name)} × ${it.qty}`)
        .join(', ');
      const last = catalog.orderSteps.length - 1;
      const st = catalog.orderSteps
        .map((label, i) => {
          let c: string;
          if (s.mode === 'cancel') c = i === 0 ? 'done' : 'todo';
          else if (s.current === last)
            c = 'done' + (i === last ? ' final' : '');
          else c = i < s.current ? 'done' : i === s.current ? 'cur' : 'todo';
          return `<li class="st ${c}" ${c === 'cur' ? 'aria-current="step"' : ''}><span class="dot"></span><span>${label}</span></li>`;
        })
        .join('');
      return `<article class="card order"><div class="otop"><div class="items">${items}</div><div><h3>${names}</h3><p class="hint">Commande n° ${esc(o.id)}${o.demo ? ' · données fictives de démonstration' : ''}</p></div></div>
        <div class="status ${s.tone ?? ''}"><h2>${s.head}</h2><p class="muted">${s.detail}</p></div>
        <ol class="stepper ${s.mode}" aria-label="Étapes de la commande">${st}</ol>
        <div class="chips"><span>Démonstration · changer d’étape :</span>${catalog.statuses.map((x) => `<button class="chip" data-act="step" data-o="${esc(o.id)}" data-k="${x.code}" aria-pressed="${x.code === o.step}">${x.label}</button>`).join('')}</div></article>`;
    })
    .join('');
  return `<h1 style="margin-bottom:28px">Suivi des commandes</h1><div class="orders">${cards}</div>`;
}
