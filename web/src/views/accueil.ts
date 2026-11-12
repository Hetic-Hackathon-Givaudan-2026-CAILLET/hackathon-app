import { examplesHTML, replyHTML } from '../components';
import { state } from '../state';
import { esc } from '../util';

export function accueil() {
  return `<div class="hero"><div><h1>Bonjour ! Parlez-moi de votre boutique et de ce que vous voulez que vos clients ressentent.</h1>
      <div class="card composer"><label for="desc" class="lbl" style="font-weight:500;font-size:14px">Décrivez votre boutique</label>
      <ol class="guide" id="guide" aria-label="Pour vous aider à décrire votre demande"><li>Quelle est votre boutique ?</li><li>Qui sont vos clients types ?</li><li>Que souhaitez-vous provoquer chez vos clients ?</li></ol>
      <div class="prompt"><textarea id="desc" aria-describedby="guide" rows="3" placeholder="Ex. : Je dirige une boutique de thés et je souhaite une ambiance chaleureuse et apaisante.">${esc(state.desc)}</textarea>
      <div class="prompt-foot"><span class="hint">Entrée pour envoyer · Maj + Entrée pour un retour à la ligne</span><button class="btn" data-act="find">Trouver mon parfum</button></div></div>${replyHTML()}</div>${examplesHTML()}</div></div>`;
}
