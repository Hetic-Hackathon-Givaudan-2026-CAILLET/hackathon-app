import { stepsHeader } from '../components';
import { state } from '../state';
import { esc } from '../util';

export function compte() {
  const u = state.user;
  if (state.auth === 'login') {
    return `${stepsHeader('Compte')}<div class="card formcard"><h2>Se connecter</h2>
      <div class="field"><label for="a-email">Adresse e-mail</label><input id="a-email" class="input" type="email" autocomplete="email" placeholder="camille@example.fr" value="${esc(u?.email)}"><span class="err" id="e-a-email"></span></div>
      <div class="field"><label for="a-pw">Mot de passe</label><div class="pwrap"><input id="a-pw" class="input" type="password" autocomplete="current-password" placeholder="••••••••••••"><button type="button" data-act="pw" data-for="a-pw" aria-pressed="false">Afficher</button></div><span class="err" id="e-a-pw"></span></div>
      <button class="btn block" data-act="auth">Continuer</button><p style="margin-top:12px;text-align:center"><button class="linkbtn" data-act="authmode" data-m="signup">Créer un compte</button></p></div>`;
  }
  return `${stepsHeader('Compte')}<div class="card formcard"><h2>${u ? 'Mon compte' : 'Créer votre compte'}</h2>
      <div class="two"><div class="field"><label for="a-prenom">Prénom</label><input id="a-prenom" class="input" autocomplete="given-name" placeholder="Camille" value="${esc(u?.prenom)}"><span class="err" id="e-a-prenom"></span></div>
      <div class="field"><label for="a-nom">Nom</label><input id="a-nom" class="input" autocomplete="family-name" placeholder="Martin" value="${esc(u?.nom)}"><span class="err" id="e-a-nom"></span></div></div>
      <div class="field"><label for="a-adr">Adresse</label><input id="a-adr" class="input" autocomplete="street-address" placeholder="12, rue des Tilleuls" value="${esc(u?.adresse)}"></div>
      <div class="field"><label for="a-email">Adresse e-mail</label><input id="a-email" class="input" type="email" autocomplete="email" placeholder="camille@example.fr" value="${esc(u?.email)}"><span class="err" id="e-a-email"></span></div>
      <div class="field"><label for="a-tel">N° de téléphone</label><input id="a-tel" class="input" type="tel" autocomplete="tel" placeholder="06 00 00 00 00" value="${esc(u?.tel)}"></div>
      <div class="field"><label for="a-pw">Mot de passe</label><div class="pwrap"><input id="a-pw" class="input" type="password" autocomplete="new-password" placeholder="8 caractères minimum"><button type="button" data-act="pw" data-for="a-pw" aria-pressed="false">Afficher</button></div><span class="err" id="e-a-pw"></span></div>
      <button class="btn block" data-act="auth">${u ? 'Enregistrer' : 'Créer mon compte'}</button>
      <p style="margin-top:12px;text-align:center"><button class="linkbtn" data-act="authmode" data-m="login">J’ai déjà un compte — Se connecter</button></p></div>`;
}
