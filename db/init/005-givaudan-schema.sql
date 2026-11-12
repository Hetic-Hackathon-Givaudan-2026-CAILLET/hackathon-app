-- Recommandation de fragrances Givaudan (ADR 0007) : formules de démonstration,
-- ingrédients et poids du modèle entraîné par l'équipe Data (ai/reco/).
-- Données produites par `python -m reco.exporter_sql` dans ai/ (006-givaudan-seed.sql).

-- Les 5 axes du modèle, notés de 0 à 10 : chaleur, fraicheur, floral, boise, intensite

CREATE TABLE givaudan_formules (
  id SMALLINT PRIMARY KEY,
  nom TEXT NOT NULL,
  application TEXT NOT NULL,
  chaleur NUMERIC(4, 2) NOT NULL CHECK (chaleur BETWEEN 0 AND 10),
  fraicheur NUMERIC(4, 2) NOT NULL CHECK (fraicheur BETWEEN 0 AND 10),
  floral NUMERIC(4, 2) NOT NULL CHECK (floral BETWEEN 0 AND 10),
  boise NUMERIC(4, 2) NOT NULL CHECK (boise BETWEEN 0 AND 10),
  intensite NUMERIC(4, 2) NOT NULL CHECK (intensite BETWEEN 0 AND 10),
  famille_dominante TEXT NOT NULL,
  familles_principales TEXT NOT NULL,
  -- Part de la formule (hors solvants) faite d'ingrédients Givaudan
  part_givaudan_pct NUMERIC(5, 1) NOT NULL,
  ingredients_givaudan_principaux TEXT NOT NULL,
  -- Ingrédients Givaudan de la formule absents du catalogue 2024 (null : aucun)
  hors_catalogue_2024 TEXT
);

CREATE TABLE givaudan_ingredients (
  cle TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  famille TEXT NOT NULL,
  -- Seuls les ingrédients encore vendus sont recommandés
  encore_au_catalogue BOOLEAN NOT NULL,
  chaleur NUMERIC(4, 2) NOT NULL,
  fraicheur NUMERIC(4, 2) NOT NULL,
  floral NUMERIC(4, 2) NOT NULL,
  boise NUMERIC(4, 2) NOT NULL,
  intensite NUMERIC(4, 2) NOT NULL,
  -- Prix revendeur au détail (100 g pur), en EUR/kg : indicatif
  prix_eur_kg NUMERIC(8, 2)
);

-- Ingrédients présents dans chaque formule (la clé peut ne pas figurer dans
-- givaudan_ingredients : ingrédients génériques ou naturels)
CREATE TABLE givaudan_formule_ingredients (
  formule_id SMALLINT NOT NULL REFERENCES givaudan_formules (id) ON DELETE CASCADE,
  cle TEXT NOT NULL,
  PRIMARY KEY (formule_id, cle)
);

-- Modèle entraîné (ai/models/modele_reco.json) : poids des axes dans la distance
CREATE TABLE reco_modele (
  version TEXT PRIMARY KEY,
  variante_prompt TEXT NOT NULL,
  poids_axes JSONB NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX reco_modele_un_actif ON reco_modele (actif) WHERE actif;
