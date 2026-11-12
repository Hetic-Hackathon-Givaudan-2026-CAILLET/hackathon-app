-- Prototype « Human by nature » : catalogue de parfums, réglages, clients et commandes.
-- Les scripts de db/init/ ne sont joués que sur une base vide (voir README, section 8).

-- ---------------------------------------------------------------------------
-- Catalogue : ce que le front lisait dans des constantes JavaScript
-- ---------------------------------------------------------------------------

-- Les curseurs possibles : [pôle gauche, pôle droit, nom court]
CREATE TABLE axes (
  id SMALLINT PRIMARY KEY,
  left_pole TEXT NOT NULL,
  right_pole TEXT NOT NULL,
  short_name TEXT NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  -- Chemin public servi par le front (web/public)
  image TEXT,
  -- Cadrage CSS (object-position) de la photo dans la carte
  image_focus TEXT NOT NULL DEFAULT '50% 50%',
  position SMALLINT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Position d'un parfum sur chaque curseur, de 0 (pôle gauche) à 1 (pôle droit)
CREATE TABLE product_scores (
  product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  axis_id SMALLINT NOT NULL REFERENCES axes (id),
  score NUMERIC(3, 2) NOT NULL CHECK (score BETWEEN 0 AND 1),
  PRIMARY KEY (product_id, axis_id)
);

-- Types de boutique : reconnus dans la demande (pattern, syntaxe RegExp
-- JavaScript, premier qui correspond dans l'ordre de position) et profil de
-- curseurs associé : 3 axes et leur valeur initiale (0 à 100).
CREATE TABLE shop_types (
  label TEXT PRIMARY KEY,
  position SMALLINT NOT NULL,
  pattern TEXT,
  flags TEXT NOT NULL DEFAULT 'i',
  axes SMALLINT[] NOT NULL,
  vals SMALLINT[] NOT NULL,
  -- Profil utilisé quand aucun type n'est reconnu
  is_default BOOLEAN NOT NULL DEFAULT false,
  CHECK (cardinality(axes) = 3 AND cardinality(vals) = 3),
  CHECK (is_default = (pattern IS NULL))
);
CREATE UNIQUE INDEX shop_types_one_default ON shop_types (is_default)
  WHERE is_default;

-- Vocabulaire qui déplace un curseur : si la demande correspond au pattern,
-- le curseur `axis_id` est placé à `axis_value` (0 à 100)
CREATE TABLE lexicon_entries (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  position SMALLINT NOT NULL,
  pattern TEXT NOT NULL,
  flags TEXT NOT NULL DEFAULT 'i',
  adjective TEXT NOT NULL,
  tag TEXT NOT NULL,
  axis_id SMALLINT NOT NULL REFERENCES axes (id),
  axis_value SMALLINT NOT NULL CHECK (axis_value BETWEEN 0 AND 100)
);

CREATE TABLE examples (
  key TEXT PRIMARY KEY,
  position SMALLINT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Suivi de commande
-- ---------------------------------------------------------------------------

-- Les 6 étapes de la frise de suivi
CREATE TABLE order_steps (
  position SMALLINT PRIMARY KEY,
  label TEXT NOT NULL
);

-- Les états possibles d'une commande et l'étape de la frise qu'ils affichent
CREATE TABLE order_statuses (
  code TEXT PRIMARY KEY,
  position SMALLINT NOT NULL,
  label TEXT NOT NULL,
  current_step SMALLINT NOT NULL REFERENCES order_steps (position),
  -- ok : déroulé normal, late : retard, cancel : annulée
  mode TEXT NOT NULL CHECK (mode IN ('ok', 'late', 'cancel')),
  headline TEXT NOT NULL,
  detail TEXT NOT NULL,
  tone TEXT CHECK (tone IN ('good', 'bad'))
);

-- ---------------------------------------------------------------------------
-- Données du visiteur
-- ---------------------------------------------------------------------------

-- Il n'y a pas d'authentification (voir l'ADR 0004) : le front génère un
-- identifiant anonyme, le garde dans le navigateur et l'envoie dans l'en-tête
-- X-Customer-Id. Le profil est rempli quand le visiteur « crée son compte ».
-- Aucun mot de passe n'est stocké.
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  prenom TEXT,
  nom TEXT,
  adresse TEXT,
  email TEXT,
  tel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_email_key ON customers (lower(email));

-- Page « Paramétrer votre boutique » : une fiche par visiteur
CREATE TABLE shops (
  customer_id UUID PRIMARY KEY REFERENCES customers (id) ON DELETE CASCADE,
  nom TEXT,
  type TEXT,
  ville TEXT,
  site TEXT,
  budget TEXT,
  age_min SMALLINT CHECK (age_min BETWEEN 0 AND 120),
  age_max SMALLINT CHECK (age_max BETWEEN 0 AND 120),
  clients TEXT,
  ambiance TEXT,
  surface NUMERIC CHECK (surface > 0 AND surface <= 1000000),
  adresse TEXT,
  contact TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((age_min IS NULL) = (age_max IS NULL)),
  CHECK (age_min <= age_max)
);

-- Numéro de commande affiché : 2026-1000, 2026-1001…
CREATE SEQUENCE order_reference_seq START 1000;

CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference TEXT NOT NULL DEFAULT to_char(now(), 'YYYY') || '-'
    || nextval('order_reference_seq'),
  customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  status TEXT NOT NULL REFERENCES order_statuses (code),
  -- Commande fictive créée avec chaque nouveau visiteur
  demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, reference)
);

CREATE TABLE order_items (
  order_id BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products (id),
  qty SMALLINT NOT NULL CHECK (qty BETWEEN 1 AND 99),
  PRIMARY KEY (order_id, product_id)
);
