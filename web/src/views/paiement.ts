import { stepsHeader } from '../components';
import { state } from '../state';
import { esc } from '../util';

export function paiement() {
  if (state.confirm) {
    const o = state.orders.find((x) => x.id === state.confirm);
    return `<div class="card confirmed"><div class="tick" aria-hidden="true">✓</div><h2>Commande confirmée</h2><p class="muted">Votre commande n° ${esc(state.confirm)} a bien été enregistrée${o ? ' (' + o.items.length + (o.items.length > 1 ? ' références' : ' référence') + ')' : ''}. Vous pouvez suivre son avancement à tout moment.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn" data-act="go" data-to="suivi">Suivre ma commande</button><button class="btn ghost" data-act="newchat">Nouvelle conversation</button></div></div>`;
  }
  if (!Object.keys(state.cart).length) {
    return `${stepsHeader('Paiement')}<div class="card empty"><h2>Votre panier est vide</h2><button class="btn" data-act="go" data-to="selection">Retour à la sélection</button></div>`;
  }
  return `${stepsHeader('Paiement')}<div class="card formcard"><h2>Paiement</h2><p class="notice">Démonstration : les données de carte ne sont ni envoyées ni enregistrées. Ne saisissez pas de vraie carte bancaire.</p>
      <div class="field"><label for="p-nom">Titulaire de la carte</label><input id="p-nom" class="input" autocomplete="cc-name" placeholder="Camille Martin"><span class="err" id="e-p-nom"></span></div>
      <div class="field"><label for="p-num">Numéro de carte</label><input id="p-num" class="input" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19"><span class="err" id="e-p-num"></span></div>
      <div class="two"><div class="field"><label for="p-exp">Date d’expiration</label><input id="p-exp" class="input" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"><span class="err" id="e-p-exp"></span></div>
      <div class="field"><label for="p-cvc">Code de sécurité</label><input id="p-cvc" class="input" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"><span class="err" id="e-p-cvc"></span></div></div>
      <button class="btn block" data-act="pay">Valider la commande</button></div>`;
}
