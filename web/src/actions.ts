import { api, ApiError } from './api';
import { catalog } from './catalog';
import {
  applyDerived,
  consistentReply,
  derive,
  exampleText,
  templateReply,
} from './recommend';
import { loadReco, moveRecoSlider } from './givaudan';
import { go, render, setErr, toast } from './render';
import { SHOP } from './shopForm';
import { recoDescription, resetSearch, state } from './state';
import type { Derived, RecoAxe, Shop, User } from './types';
import { $ } from './util';

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

function errorMessage(e: unknown) {
  return e instanceof ApiError
    ? e.message
    : 'Une erreur est survenue. Réessayez.';
}

// Un compte vide (aucun champ renseigné) vaut « pas de compte »
export function toUser(u: User): User | null {
  return Object.values(u).some(Boolean) ? u : null;
}

// Le bouton affiche « Analyse en cours… » le temps que l'assistant réponde
function busy(on: boolean) {
  const button = document.querySelector<HTMLButtonElement>(
    '[data-act="find"], [data-act="refine"]',
  );
  if (!button) return;
  button.disabled = on;
  if (on) {
    button.dataset.label = button.textContent!;
    button.textContent = 'Analyse en cours…';
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
}

// Interroge l'assistant (Ollama, via l'API). Renvoie null s'il est indisponible :
// l'analyse par mots-clés suffit alors à poursuivre.
async function askAssistant(text: string, kw: Derived) {
  busy(true);
  try {
    return await api.chat(text, { type: kw.type, ambiance: kw.tags });
  } catch (e) {
    console.warn('Assistant indisponible :', e);
    return null;
  } finally {
    busy(false);
  }
}

async function find() {
  const field = document.getElementById('desc') as HTMLTextAreaElement | null;
  const text = field?.value.trim() || exampleText();
  const kw = derive(text);
  const ai = await askAssistant(text, kw);
  state.desc = text;
  state.extra = '';
  // Ni type de boutique ni ambiance reconnus (« Bonjour »…) : l'assistant
  // relance la conversation au lieu d'afficher une sélection au hasard
  if (ai?.reply && !kw.type && !ai.type && !kw.tags.length) {
    state.reply = ai.reply;
    render();
    return;
  }
  const d = ai?.type && !kw.type ? derive(text, undefined, ai.type) : kw;
  applyDerived(d);
  state.reply = ai
    ? (consistentReply(ai.reply, d.tags) ?? templateReply(d))
    : null;
  go('selection');
  if (!ai) toast('Assistant indisponible : analyse simplifiée.');
}

type Action = (t: HTMLElement) => void | Promise<void>;

const actions: Record<string, Action> = {
  go: (t) => go(t.dataset.to!),
  newchat: () => {
    resetSearch();
    go('accueil');
  },
  find,
  ex: (t) => {
    const x = catalog.examples[+t.dataset.i!];
    state.desc = x.text;
    applyDerived(derive(x.text));
    state.extra = '';
    state.reply = null;
    go('selection');
  },
  refine: async () => {
    const x = input('extra').value.trim();
    state.extra = x;
    if (!x) {
      render();
      return;
    }
    const d = derive(x, { axes: state.axes, sliders: state.sliders });
    const ai = await askAssistant(x, d);
    state.axes = d.axes;
    state.sliders = d.sliders;
    d.adjs.forEach((a, i) => {
      if (!state.derived!.adjs.includes(a)) {
        state.derived!.adjs.push(a);
        state.derived!.tags.push(d.tags[i]);
      }
    });
    state.reply = ai
      ? (consistentReply(ai.reply, d.tags) ??
        (d.tags.length ? 'C’est noté, j’ajuste l’ambiance.' : null))
      : null;
    render();
  },
  add: (t) => {
    const id = t.dataset.id!;
    state.cart[id] = Math.min(99, (state.cart[id] || 0) + 1);
    render();
    toast(
      catalog.productsById[id].name + ' ajouté au panier',
      'gocart',
      'Voir le panier',
    );
  },
  gocart: () => {
    $('#toastZone').innerHTML = '';
    go('panier');
  },
  qty: (t) => {
    const id = t.dataset.id!;
    const q = (state.cart[id] || 0) + Number(t.dataset.d);
    if (q <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(99, q);
    render();
  },
  remove: (t) => {
    delete state.cart[t.dataset.id!];
    render();
  },
  checkout: () => go('compte'),
  authmode: (t) => {
    state.auth = t.dataset.m as 'signup' | 'login';
    render();
  },
  pw: (t) => {
    const i = input(t.dataset.for!);
    const show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    t.textContent = show ? 'Masquer' : 'Afficher';
    t.setAttribute('aria-pressed', String(show));
  },
  auth: async () => {
    const email = input('a-email').value.trim();
    const pw = input('a-pw').value;
    let ok = true;
    if (state.auth === 'signup') {
      ok =
        setErr(
          'a-prenom',
          input('a-prenom').value.trim() ? '' : 'Indiquez votre prénom.',
        ) && ok;
      ok =
        setErr(
          'a-nom',
          input('a-nom').value.trim() ? '' : 'Indiquez votre nom.',
        ) && ok;
    }
    ok =
      setErr(
        'a-email',
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ? ''
          : 'Saisissez une adresse e-mail valide, par exemple camille@example.fr.',
      ) && ok;
    // Le mot de passe n'est contrôlé que pour la forme : il n'est ni envoyé ni
    // enregistré tant qu'il n'y a pas d'authentification (ADR 0004)
    ok =
      setErr('a-pw', pw.length >= 8 ? '' : 'Utilisez au moins 8 caractères.') &&
      ok;
    if (!ok) return;
    const user: Partial<User> =
      state.auth === 'signup'
        ? {
            prenom: input('a-prenom').value.trim(),
            nom: input('a-nom').value.trim(),
            adresse: input('a-adr').value.trim(),
            email,
            tel: input('a-tel').value.trim(),
          }
        : { ...state.user, email };
    try {
      state.user = toUser(await api.saveMe(user));
    } catch (e) {
      toast(errorMessage(e));
      return;
    }
    if (Object.keys(state.cart).length) go('paiement');
    else {
      go('selection');
      toast('Compte enregistré');
    }
  },
  pay: async (t) => {
    const nom = input('p-nom').value.trim();
    const num = input('p-num').value.replace(/\s/g, '');
    const exp = input('p-exp').value;
    const cvc = input('p-cvc').value;
    let ok = true;
    ok = setErr('p-nom', nom ? '' : 'Indiquez le nom du titulaire.') && ok;
    ok =
      setErr(
        'p-num',
        /^\d{16}$/.test(num) ? '' : 'Le numéro doit comporter 16 chiffres.',
      ) && ok;
    const m = /^(\d{2})\/(\d{2})$/.exec(exp);
    let expMsg = 'Saisissez la date au format MM/AA, par exemple 12/28.';
    if (m) {
      const mm = +m[1];
      const yy = 2000 + +m[2];
      const now = new Date();
      if (mm < 1 || mm > 12)
        expMsg = 'Le mois doit être compris entre 01 et 12.';
      else if (
        yy < now.getFullYear() ||
        (yy === now.getFullYear() && mm < now.getMonth() + 1)
      ) {
        expMsg =
          'Cette carte est expirée : saisissez une date à venir, par exemple 12/28.';
      } else expMsg = '';
    }
    ok = setErr('p-exp', expMsg) && ok;
    ok =
      setErr(
        'p-cvc',
        /^\d{3,4}$/.test(cvc) ? '' : 'Le code comporte 3 ou 4 chiffres.',
      ) && ok;
    if (!ok) return;
    // Seul le panier part au serveur ; les données de carte restent ici
    (t as HTMLButtonElement).disabled = true;
    try {
      const order = await api.createOrder(
        Object.entries(state.cart).map(([id, qty]) => ({ id, qty })),
      );
      state.orders.unshift(order);
      state.cart = {};
      state.confirm = order.id;
      render();
    } catch (e) {
      (t as HTMLButtonElement).disabled = false;
      toast(errorMessage(e));
    }
  },
  saveshop: async () => {
    const shop: Shop = {};
    let first: HTMLInputElement | null = null;
    for (const [, fields] of SHOP.flat()) {
      for (const f of fields) {
        if (f.type === 'range') continue;
        const el = input('s-' + f.key);
        const v = el.value.trim();
        if (f.type === 'unit') {
          let msg = '';
          if (v) {
            const n = Number(v);
            if (!(n > 0) || n > 1000000)
              msg =
                'Indiquez un nombre positif, par exemple ' +
                f.option.placeholder +
                '.';
            else shop[f.key] = n;
          }
          $('#e-s-' + f.key).textContent = msg;
          if (msg) {
            el.setAttribute('aria-invalid', 'true');
            first = first || el;
          } else el.removeAttribute('aria-invalid');
        } else if (v) shop[f.key] = v;
      }
    }
    const mn = input('s-agemin');
    const mx = input('s-agemax');
    const a = mn.value.trim();
    const b = mx.value.trim();
    let amsg = '';
    if (a || b) {
      const na = Number(a);
      const nb = Number(b);
      if (!a || !b)
        amsg = 'Renseignez les deux âges, par exemple de 25 à 55 ans.';
      else if (
        !Number.isInteger(na) ||
        !Number.isInteger(nb) ||
        na < 0 ||
        nb > 120
      ) {
        amsg = 'Indiquez des âges entiers entre 0 et 120 ans.';
      } else if (na > nb)
        amsg = 'L’âge de début doit être inférieur ou égal à l’âge de fin.';
      else {
        shop.agemin = na;
        shop.agemax = nb;
      }
    }
    [mn, mx].forEach((i) => {
      if (amsg) i.setAttribute('aria-invalid', 'true');
      else i.removeAttribute('aria-invalid');
    });
    $('#e-s-age').textContent = amsg;
    if (amsg) first = mn;
    if (first) {
      (first as HTMLInputElement).focus();
      return;
    }
    try {
      state.shop = await api.saveShop(shop);
      toast('Informations enregistrées');
    } catch (e) {
      toast(errorMessage(e));
    }
  },
  step: async (t) => {
    try {
      const updated = await api.setOrderStatus(t.dataset.o!, t.dataset.k!);
      state.orders = state.orders.map((o) =>
        o.id === updated.id ? updated : o,
      );
      render();
    } catch (e) {
      toast(errorMessage(e));
    }
  },
  reload: () => location.reload(),
  'reco-retry': () => loadReco(recoDescription()),
};

export function bindEvents() {
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    // Une erreur d'action ne doit pas casser les clics suivants
    Promise.resolve(actions[t.dataset.act!]?.(t)).catch((err) => {
      console.error(err);
      toast(errorMessage(err));
    });
  });
  document.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset?.recoAxis !== undefined) {
      t.style.setProperty('--v', +t.value * 10 + '%');
      moveRecoSlider(t.dataset.recoAxis as RecoAxe, +t.value);
    } else if (t.id === 'p-num') {
      t.value = t.value
        .replace(/\D/g, '')
        .slice(0, 16)
        .replace(/(.{4})/g, '$1 ')
        .trim();
    } else if (t.id === 'p-exp') {
      let d = t.value.replace(/\D/g, '').slice(0, 4);
      if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
      t.value = d;
    } else if (t.id === 'p-cvc') {
      t.value = t.value.replace(/\D/g, '').slice(0, 4);
    }
  });
  document.addEventListener('keydown', (e) => {
    const id = (e.target as HTMLElement).id;
    if (e.key === 'Enter' && !e.shiftKey && id === 'desc') {
      e.preventDefault();
      void find();
    }
    if (e.key === 'Enter' && id === 'extra') {
      e.preventDefault();
      void actions.refine(e.target as HTMLElement);
    }
  });
}
