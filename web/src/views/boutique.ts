import { SHOP, type Field } from '../shopForm';
import { state } from '../state';
import { esc } from '../util';

function field(f: Field) {
  const { key: k, label } = f;
  const v = state.shop[k];
  switch (f.type) {
    case 'unit':
      return `<div class="field"><label for="s-${k}">${label}</label><div class="unitwrap"><input id="s-${k}" class="input" type="number" min="1" step="any" inputmode="decimal" aria-label="${label} en ${f.option.unit}" placeholder="${esc(f.option.placeholder)}" value="${esc(v)}"><span class="unit" aria-hidden="true">${f.option.unit}</span></div><span class="err" id="e-s-${k}"></span></div>`;
    case 'textarea':
      return `<div class="field"><label for="s-${k}">${label}</label><textarea id="s-${k}" class="input" rows="5" placeholder="${esc(f.placeholder)}">${esc(v)}</textarea></div>`;
    case 'range':
      return `<div class="field" role="group" aria-labelledby="lbl-age"><span class="lbl" id="lbl-age">${label}</span><div class="agerow"><label for="s-agemin">De</label><input id="s-agemin" class="input" type="number" min="0" max="120" step="1" inputmode="numeric" placeholder="25" value="${esc(state.shop.agemin)}"><label for="s-agemax">à</label><input id="s-agemax" class="input" type="number" min="0" max="120" step="1" inputmode="numeric" placeholder="55" value="${esc(state.shop.agemax)}"><span class="muted">ans</span></div><span class="err" id="e-s-age"></span></div>`;
    case 'textlist':
      return `<div class="field"><label for="s-${k}">${label}</label><input id="s-${k}" class="input" list="dl-${k}" autocomplete="off" placeholder="${esc(f.placeholder)}" value="${esc(v)}"><datalist id="dl-${k}">${f.options.map((o) => `<option value="${o}">`).join('')}</datalist></div>`;
    case 'select':
      return `<div class="field"><label for="s-${k}">${label}</label><select id="s-${k}" class="input"><option value="">Choisir…</option>${f.options.map((o) => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    default:
      return `<div class="field"><label for="s-${k}">${label}</label><input id="s-${k}" class="input" placeholder="${esc(f.placeholder)}" value="${esc(v)}"></div>`;
  }
}

export function boutique() {
  const col = (cards: [string, Field[]][]) =>
    `<div class="col">${cards.map(([title, fields]) => `<section class="card cat"><h3>${title}</h3>${fields.map(field).join('')}</section>`).join('')}</div>`;
  return `<div class="pagehead"><div><h1>Paramétrer votre boutique</h1><p class="hint">Ces informations nous aident à adapter les propositions à votre boutique. Elles sont enregistrées et rattachées à cet appareil.</p></div><button class="btn" data-act="saveshop">Enregistrer</button></div><div class="cats">${SHOP.map(col).join('')}</div>`;
}
