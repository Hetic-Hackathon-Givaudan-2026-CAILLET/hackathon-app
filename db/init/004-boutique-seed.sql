-- Données du prototype « Human by nature » (catalogue, vocabulaire, suivi).
-- Les produits ne sont plus fictifs : ce sont les formules Givaudan (006).

INSERT INTO axes (id, left_pole, right_pole, short_name) VALUES
  (0, 'pétillant', 'apaisant', 'énergie'),
  (1, 'chaleureux', 'raffiné', 'chaleur'),
  (2, 'floral', 'gourmand', 'saveur'),
  (3, 'frais', 'boisé', 'fraîcheur'),
  (4, 'léger', 'intense', 'intensité'),
  (5, 'doux', 'épicé', 'caractère');

-- Les produits vendus sont les formules Givaudan de ai/data/raw : voir
-- 006-givaudan-seed.sql (généré par `python -m reco.exporter_sql`).

INSERT INTO shop_types (label, position, pattern, flags, axes, vals, is_default) VALUES
  ('librairie', 0, 'librairie|livre', 'i', ARRAY[0, 1, 3]::smallint[], ARRAY[60, 30, 70]::smallint[], false),
  ('boutique de thés', 1, '(?<![a-zà-ÿ])th[ée]s?(?![a-zà-ÿ])', 'i', ARRAY[0, 3, 5]::smallint[], ARRAY[70, 45, 25]::smallint[], false),
  ('spa', 2, 'spa|bien-être|massage', 'i', ARRAY[0, 2, 4]::smallint[], ARRAY[80, 30, 25]::smallint[], false),
  ('bijouterie', 3, 'bijou', 'i', ARRAY[1, 2, 4]::smallint[], ARRAY[70, 30, 30]::smallint[], false),
  ('boutique de sport', 4, 'running|sneaker|articles? de sport|boutique de sport', 'i', ARRAY[0, 3, 4]::smallint[], ARRAY[25, 25, 70]::smallint[], false),
  ('hôtel', 5, 'hôtel|hotel', 'i', ARRAY[1, 2, 4]::smallint[], ARRAY[75, 35, 40]::smallint[], false),
  ('salle de sport', 6, 'salle de sport|fitness|gym', 'i', ARRAY[0, 3, 4]::smallint[], ARRAY[25, 25, 70]::smallint[], false),
  ('café', 7, 'café|cafe', 'i', ARRAY[1, 3, 5]::smallint[], ARRAY[35, 60, 60]::smallint[], false),
  ('boutique de bougies', 8, 'bougie', 'i', ARRAY[0, 2, 4]::smallint[], ARRAY[70, 40, 50]::smallint[], false),
  ('concept store', 9, 'concept', 'i', ARRAY[0, 1, 4]::smallint[], ARRAY[50, 60, 40]::smallint[], false),
  ('par défaut', 10, NULL, 'i', ARRAY[0, 1, 2]::smallint[], ARRAY[55, 25, 70]::smallint[], true);

INSERT INTO lexicon_entries (position, pattern, flags, adjective, tag, axis_id, axis_value) VALUES
  (0, 'chaleureu', 'i', 'chaleureuse', 'chaleureux', 1, 15),
  (1, 'raffin|élégan|elegan|chic|luxe|sophistiq|prestige', 'i', 'raffinée', 'raffiné', 1, 85),
  (2, 'apais|calme|zen|serein|détend|detend|relax', 'i', 'apaisante', 'apaisant', 0, 85),
  (3, 'pétill|petill|vif|dynamiq|énerg|energ|tonic|sportif|joyeu', 'i', 'pétillante', 'pétillant', 0, 12),
  (4, 'frais|fraîch|fraich|agrume|marin|aérien|aerien', 'i', 'fraîche', 'frais', 3, 12),
  (5, 'bois|cèdre|cedre|santal|forêt|foret|vieux livres', 'i', 'boisée', 'boisé', 3, 88),
  (6, 'intens|puissant|marqué|sillage', 'i', 'intense', 'intense', 4, 85),
  (7, 'léger|leger|discr[eè]t|subtil|délicat|delicat', 'i', 'légère', 'léger', 4, 15),
  (8, 'épic|epic|poivr|cannelle|gingembre', 'i', 'épicée', 'épicé', 5, 88),
  (9, 'doux|douce|rond|enveloppant', 'i', 'douce', 'doux', 5, 12),
  (10, 'flor|fleur', 'i', 'florale', 'floral', 2, 12),
  (11, 'gourmand|sucr|vanill|caramel', 'i', 'gourmande', 'gourmand', 2, 88);

INSERT INTO examples (key, position, title, text) VALUES
  ('librairie', 0, 'Librairie', 'Je dirige une librairie indépendante et je cherche une odeur chaleureuse et apaisante, qui donne envie de rester feuilleter.'),
  ('boutique de sport', 1, 'Boutique de sport', 'Je dirige une boutique de sport et je veux une ambiance énergique et fraîche, qui donne envie de bouger dès l’entrée.'),
  ('bijouterie', 2, 'Bijouterie', 'Je tiens une bijouterie et je cherche une senteur élégante et florale, discrète, pour accueillir mes clientes.');

INSERT INTO order_steps (position, label) VALUES
  (0, 'Commande reçue'),
  (1, 'Paiement confirmé'),
  (2, 'En préparation'),
  (3, 'Expédiée'),
  (4, 'En livraison'),
  (5, 'Livrée');

INSERT INTO order_statuses (code, position, label, current_step, mode, headline, detail, tone) VALUES
  ('received', 0, 'Reçue', 0, 'ok', 'Commande reçue', 'Nous avons bien reçu votre commande. Elle va être vérifiée.', NULL),
  ('paid', 1, 'Payée', 1, 'ok', 'Paiement confirmé', 'Votre paiement a bien été enregistré.', NULL),
  ('preparing', 2, 'En préparation', 2, 'ok', 'En préparation', 'Votre commande est en cours de préparation. Expédition prévue sous 2 jours.', NULL),
  ('shipped', 3, 'Expédiée', 3, 'ok', 'Expédiée', 'Votre colis a été remis au transporteur. Il arrivera dans 4 jours.', NULL),
  ('delivering', 4, 'En livraison', 4, 'ok', 'En cours de livraison', 'Arrivera dans 2 jours.', NULL),
  ('delivered', 5, 'Livrée', 5, 'ok', 'Livrée', 'Votre commande a été livrée.', 'good'),
  ('delayed', 6, 'Retard', 4, 'late', 'Livraison retardée', 'Votre commande aura 3 jours de retard. Nous nous excusons pour la gêne occasionnée.', 'bad'),
  ('cancelled', 7, 'Annulée', 0, 'cancel', 'Commande annulée', 'Votre commande a été annulée. Le remboursement sera effectué sous 5 jours ouvrés.', 'bad');
