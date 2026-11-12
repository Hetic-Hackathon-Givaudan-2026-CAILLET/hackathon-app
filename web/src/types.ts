// Formes échangées avec l'API (voir api/src/routes) et utilisées par le front

export type Axis = { id: number; left: string; right: string; name: string };

export type Product = {
  id: string;
  name: string;
  ref: string;
  desc: string;
  tags: string[];
  image: string | null;
  imageFocus: string;
};

export type ShopType = {
  label: string;
  pattern: string | null;
  flags: string;
  axes: number[];
  vals: number[];
  isDefault: boolean;
};

export type LexiconEntry = {
  pattern: string;
  flags: string;
  adj: string;
  tag: string;
  axis: number;
  value: number;
};

export type Example = { key: string; title: string; text: string };

export type OrderStatus = {
  code: string;
  label: string;
  current: number;
  mode: 'ok' | 'late' | 'cancel';
  head: string;
  detail: string;
  tone: 'good' | 'bad' | null;
};

export type CatalogDTO = {
  axes: Axis[];
  products: Product[];
  shopTypes: ShopType[];
  lexicon: LexiconEntry[];
  examples: Example[];
  orderSteps: string[];
  orderStatuses: OrderStatus[];
};

export type OrderItem = { id: string; qty: number };
export type Order = {
  // Numéro affiché, par exemple 2026-1001
  id: string;
  // Code d'un OrderStatus
  step: string;
  demo: boolean;
  items: OrderItem[];
};

export type User = {
  prenom: string | null;
  nom: string | null;
  adresse: string | null;
  email: string | null;
  tel: string | null;
};

// Réponse de POST /api/chat : le type de boutique repéré et une courte réponse
export type ChatAnalysis = { reply: string | null; type: string | null };

// Réponses du formulaire « Paramétrer votre boutique » : seules les clés
// renseignées sont présentes
export type Shop = Record<string, string | number>;

// Lecture de la demande : mots retenus et position des curseurs
export type Derived = {
  adjs: string[];
  tags: string[];
  axes: number[];
  sliders: number[];
  type: string | null;
};

// Recommandation Givaudan (POST /api/recommandation, ADR 0007) : 5 notes de 0 à 10
export const RECO_AXES = [
  'chaleur',
  'fraicheur',
  'floral',
  'boise',
  'intensite',
] as const;
export type RecoAxe = (typeof RECO_AXES)[number];
export type RecoScores = Record<RecoAxe, number>;

export type RecoFormule = {
  rang: number;
  id_formule: number;
  // Identifiant du produit à ajouter au panier
  produit_id: string;
  nom: string;
  application: string;
  correspondance_pct: number;
  profil: RecoScores;
  famille_dominante: string;
  familles_principales: string;
  part_givaudan_pct: number;
  ingredients_givaudan_principaux: string;
  alerte_catalogue: string | null;
  pourquoi: string;
};

export type RecoIngredient = {
  nom: string;
  famille: string;
  correspondance_pct: number;
  utilise_dans_une_formule_recommandee: boolean;
  prix_indicatif_eur_kg: number | null;
};

export type RecoResult = {
  scores_utilises: RecoScores;
  methode_lecture?: 'llm' | 'mots-clés';
  formules: RecoFormule[];
  ingredients: RecoIngredient[];
  modele: { version: string; poids_axes: RecoScores };
  note_prix: string;
};
