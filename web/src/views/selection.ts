import { catalog } from '../catalog';
import { gridHTML, replyHTML, slidersHTML } from '../components';
import { ensureDerived } from '../recommend';
import { ensureReco, recoHTML } from '../reco';
import { state } from '../state';
import { esc } from '../util';

export function selection() {
  const d = ensureDerived();
  ensureReco();
  const type =
    d.type ||
    (state.shop.type ? String(state.shop.type).toLowerCase() : 'boutique');
  return `<section class="card req"><div><span class="reqlbl">Votre demande</span><p class="reqtxt">${esc(state.desc)}</p>${replyHTML()}<p class="hint">${d.tags.length ? 'Ambiance retenue : ' + esc(d.tags.join(', ')) + '.' : 'Ambiance sur mesure pour votre ' + esc(type) + '.'}</p></div><button class="btn ghost" data-act="go" data-to="accueil">Modifier</button></section>
      <div class="chips" style="margin-bottom:32px"><span>Autre exemple :</span>${catalog.examples.map((x, i) => `<button class="chip" data-act="ex" data-i="${i}" aria-pressed="${state.desc === x.text}">${x.title}</button>`).join('')}</div>
      <section class="adjust"><h2>Souhaitez-vous ajuster votre requête ?</h2><p class="hint">Curseurs adaptés à votre ${esc(type)}. Références fictives de démonstration.</p><div id="sliders">${slidersHTML()}</div></section>
      ${recoHTML()}
      <div class="grid" id="grid">${gridHTML()}</div>
      <div class="prompt row"><label class="sr" for="extra">Complétez votre demande</label><input id="extra" placeholder="Complétez votre demande, par exemple : je voudrais quelque chose de plus boisé" value="${esc(state.extra)}"><button class="btn" data-act="refine">Trouver mon parfum</button></div>`;
}
