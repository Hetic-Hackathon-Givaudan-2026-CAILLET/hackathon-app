import { catalog } from '../catalog';
import { replyHTML } from '../components';
import { recoHTML } from '../givaudan';
import { ensureDerived } from '../recommend';
import { state } from '../state';
import { esc } from '../util';

// Demande, curseurs du modèle Givaudan et formules recommandées (ADR 0007).
// Seules les données de ai/data/raw sont affichées : aucune référence fictive.
export function selection() {
  const d = ensureDerived();
  const type =
    d.type ||
    (state.shop.type ? String(state.shop.type).toLowerCase() : 'boutique');
  return `<section class="card req"><div><span class="reqlbl">Votre demande</span><p class="reqtxt">${esc(state.desc)}</p>${replyHTML()}<p class="hint">Recommandation pour votre ${esc(type)}, parmi les formules de démonstration Givaudan.</p></div><button class="btn ghost" data-act="go" data-to="accueil">Modifier</button></section>
      <div class="chips" style="margin-bottom:32px"><span>Autre exemple :</span>${catalog.examples.map((x, i) => `<button class="chip" data-act="ex" data-i="${i}" aria-pressed="${state.desc === x.text}">${x.title}</button>`).join('')}</div>
      ${recoHTML()}
      <div class="prompt row"><label class="sr" for="extra">Complétez votre demande</label><input id="extra" placeholder="Complétez votre demande, par exemple : je voudrais quelque chose de plus boisé" value="${esc(state.extra)}"><button class="btn" data-act="refine">Trouver mon parfum</button></div>`;
}
