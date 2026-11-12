import { catalog } from './catalog';
import type { Derived, Order, Reco, Shop, User } from './types';

export const state = {
  desc: '',
  extra: '',
  // Dernière réponse de l'assistant
  reply: null as string | null,
  axes: [] as number[],
  sliders: [] as number[],
  derived: null as Derived | null,
  cart: {} as Record<string, number>,
  user: null as User | null,
  auth: 'signup' as 'signup' | 'login',
  // Numéro de la commande qu'on vient de confirmer
  confirm: null as string | null,
  prev: null as string | null,
  shop: {} as Shop,
  orders: [] as Order[],
  // Recommandation du modèle Givaudan pour la demande `key` (desc + extra)
  reco: {
    key: '',
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    data: null as Reco | null,
    error: '',
  },
};

// Nouvelle conversation : on repart du profil par défaut
export function resetSearch() {
  state.desc = '';
  state.extra = '';
  state.reply = null;
  state.derived = null;
  state.axes = catalog.defaultProfile.axes.slice();
  state.sliders = catalog.defaultProfile.vals.slice();
  state.confirm = null;
}
