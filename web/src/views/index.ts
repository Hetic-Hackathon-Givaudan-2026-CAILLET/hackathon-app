import { accueil } from './accueil';
import { boutique } from './boutique';
import { compte } from './compte';
import { paiement } from './paiement';
import { panier } from './panier';
import { selection } from './selection';
import { suivi } from './suivi';

export const VIEWS: Record<string, () => string> = {
  accueil,
  selection,
  panier,
  compte,
  paiement,
  boutique,
  suivi,
};
