import './styles.css';
import { api, ApiError } from './api';
import { bindEvents, toUser } from './actions';
import { setCatalog } from './catalog';
import { render } from './render';
import { resetSearch, state } from './state';
import { $, esc } from './util';

// Tout ce qu'il faut pour afficher la première vue : le catalogue et les
// données du visiteur
async function load() {
  const [dto, user, shop, orders] = await Promise.all([
    api.catalog(),
    api.me(),
    api.shop(),
    api.orders(),
  ]);
  setCatalog(dto);
  state.user = toUser(user);
  state.shop = shop;
  state.orders = orders;
  resetSearch();
}

async function start() {
  $('#view').textContent = 'Chargement…';
  try {
    await load();
  } catch (e) {
    const detail =
      e instanceof ApiError ? e.message : 'Réponse inattendue du serveur.';
    $('#view').innerHTML =
      `<div class="card empty"><h2>Impossible de charger l’application</h2><p class="muted">${esc(detail)}</p><button class="btn" data-act="reload">Réessayer</button></div>`;
    bindEvents();
    return;
  }
  bindEvents();
  window.addEventListener('hashchange', render);
  render();
}

start();
