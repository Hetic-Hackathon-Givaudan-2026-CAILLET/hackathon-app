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
  // Position sur chaque curseur, dans l'ordre des axes (0 à 1)
  v: number[];
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
