import { catalog } from './catalog';
import { state } from './state';
import { joinFr } from './util';
import type { Derived } from './types';

/* Analyse de la demande : types de boutique et vocabulaire reconnus */
export function derive(
  text: string,
  base?: { axes: number[]; sliders: number[] },
  // Type de boutique donné par l'assistant quand le texte n'en cite aucun
  forcedType?: string,
): Derived {
  const adjs: string[] = [];
  const tags: string[] = [];
  const type =
    catalog.types.find((t) => t.re.test(text))?.label ?? forcedType ?? null;
  let axes: number[];
  let sl: number[];
  if (base) {
    axes = base.axes.slice();
    sl = base.sliders.slice();
  } else {
    const profile = (type && catalog.profiles[type]) || catalog.defaultProfile;
    axes = profile.axes.slice();
    sl = profile.vals.slice();
  }
  const locked = new Set<number>();
  catalog.lexicon.forEach((l) => {
    if (!l.re.test(text)) return;
    adjs.push(l.adj);
    tags.push(l.tag);
    let idx = axes.indexOf(l.axis);
    if (idx < 0) {
      // Le curseur n'est pas affiché : il prend la place d'un curseur non verrouillé
      for (let k = axes.length - 1; k >= 0; k--) {
        if (!locked.has(axes[k])) {
          idx = k;
          break;
        }
      }
      if (idx < 0) return;
      axes[idx] = l.axis;
    }
    sl[idx] = l.value;
    locked.add(l.axis);
  });
  return { adjs, tags, axes, sliders: sl, type };
}

export function exampleText() {
  const t = String(state.shop.type ?? '').toLowerCase();
  const a = String(state.shop.ambiance ?? '').trim();
  if (t || a) {
    return (
      'Je dirige ma boutique' +
      (t ? ' (' + t + ')' : '') +
      ' et je cherche une ambiance ' +
      (a || 'chaleureuse et apaisante') +
      '.'
    );
  }
  return catalog.examples[0].text;
}

export function applyDerived(d: Derived) {
  state.derived = d;
  state.axes = d.axes.slice();
  state.sliders = d.sliders.slice();
}

export function ensureDerived(): Derived {
  if (!state.derived) {
    state.desc = state.desc || exampleText();
    applyDerived(derive(state.desc));
  }
  return state.derived!;
}

// La phrase du modèle n'est gardée que si elle ne cite aucune ambiance absente
// des curseurs (un petit modèle ajoute volontiers des mots que la demande ne
// contenait pas). Sinon, null : l'appelant la remplace.
export function consistentReply(reply: string | null, tags: string[]) {
  if (!reply) return null;
  const foreign = catalog.lexicon.some(
    (l) => l.re.test(reply) && !tags.includes(l.tag),
  );
  return foreign ? null : reply;
}

// Phrase de secours, construite à partir de ce qui est réellement appliqué
export function templateReply(d: Derived) {
  const type = d.type ?? 'boutique';
  return d.adjs.length
    ? `Pour votre ${type}, je retiens une ambiance ${joinFr(d.adjs)}.`
    : `Voici une sélection pour votre ${type}. Précisez l’ambiance souhaitée pour l’affiner.`;
}
