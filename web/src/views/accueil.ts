import { examplesHTML, replyHTML } from '../components';
import { state } from '../state';
import { esc } from '../util';

export function accueil() {
  return `<div class="hero"><div><h1>Bonjour ! Parlez-moi de votre boutique et de ce que vous voulez que vos clients ressentent.</h1>
      <div class="card composer"><label for="desc" class="lbl" style="font-weight:500;font-size:14px">Décrivez votre boutique</label>
      <div class="prompt"><textarea id="desc" rows="3" placeholder="Ex. : Je dirige une boutique de thés et je souhaite une ambiance chaleureuse et apaisante.">${esc(state.desc)}</textarea>
      <div class="prompt-foot"><span class="hint">Entrée pour envoyer · Maj + Entrée pour un retour à la ligne</span><button class="btn" data-act="find">Trouver mon parfum</button></div></div>${replyHTML()}</div>${examplesHTML()}</div></div>`;
}
