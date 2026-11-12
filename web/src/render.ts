import { state } from './state';
import { $, esc } from './util';
import { VIEWS } from './views';

const NAMES = Object.keys(VIEWS);
const current = () => {
  const h = location.hash.slice(1);
  return NAMES.includes(h) ? h : 'accueil';
};

export function render() {
  const v = current();
  $('#view').innerHTML = VIEWS[v]();
  document.body.dataset.view = v;
  document.querySelectorAll<HTMLElement>('.navbtn').forEach((b) => {
    if (b.dataset.nav === v) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const n = Object.keys(state.cart).length;
  const badge = $('#badge');
  badge.hidden = n === 0;
  badge.textContent = String(n);
  $('#acctLabel').textContent = state.user?.prenom || 'Compte';
  if (state.prev !== v) {
    window.scrollTo(0, 0);
    if (state.prev !== null) $('#view').focus({ preventScroll: true });
  }
  state.prev = v;
}

export function go(v: string) {
  if (location.hash === '#' + v) render();
  else location.hash = v;
}

let toastTimer: ReturnType<typeof setTimeout>;
export function toast(msg: string, act?: string, label?: string) {
  const z = $('#toastZone');
  clearTimeout(toastTimer);
  z.innerHTML = `<div class="toast"><span>${esc(msg)}</span>${act ? `<button data-act="${act}">${esc(label)}</button>` : ''}</div>`;
  toastTimer = setTimeout(() => {
    z.innerHTML = '';
  }, 4000);
}

// Affiche ou efface l'erreur d'un champ ; renvoie true quand il est valide
export function setErr(id: string, msg?: string) {
  const e = document.getElementById('e-' + id);
  const i = document.getElementById(id);
  if (e) e.textContent = msg || '';
  if (i) {
    if (msg) i.setAttribute('aria-invalid', 'true');
    else i.removeAttribute('aria-invalid');
  }
  return !msg;
}
