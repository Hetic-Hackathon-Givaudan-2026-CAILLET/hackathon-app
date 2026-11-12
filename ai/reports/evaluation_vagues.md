# Demandes vagues : seul le métier est donné (18 cas)

Modèle 1.0.0-2026-11-12

| Lecture             | hit@1 | hit@3 | MRR  |
| ------------------- | ----- | ----- | ---- |
| avant_llm_seul      | 22%   | 39%   | 0.39 |
| apres_profil_metier | 50%   | 89%   | 0.68 |

| #   | Demande                                                | Métier reconnu           | Rang avant | Rang après | Top 3 après                                                       |
| --- | ------------------------------------------------------ | ------------------------ | ---------- | ---------- | ----------------------------------------------------------------- |
| 1   | je suis un coiffeur je veux un parfum                  | salon de coiffure        | 8          | 1          | Shampoo HR1009, Shower gel GM1006, Fabric conditioner LR1007      |
| 2   | salon de coiffure                                      | salon de coiffure        | 6          | 1          | Shampoo HR1009, Shower gel GM1006, Fabric conditioner LR1007      |
| 3   | Je suis barbier, il me faut un parfum pour ma boutique | barbier                  | 1          | 1          | Masculine MM1006, Feminine FM1006, AP Roll-on UR1007              |
| 4   | J'ai une boulangerie                                   | boulangerie-pâtisserie   | 1          | 1          | Blueberry muffin, Mango peach, Feminine FM1006                    |
| 5   | Je tiens une librairie                                 | librairie                | 9          | 5          | Feminine FM1006, Mango peach, AP Roll-on UR1007                   |
| 6   | Salle de sport, je cherche un parfum d'ambiance        | salle de sport           | 1          | 1          | AP Roll-on UR1007, Mango peach, Feminine FG1006                   |
| 7   | Je suis fleuriste                                      | fleuriste                | 2          | 2          | Shampoo HR1009, Shower gel GM1006, Vert de figue basilic          |
| 8   | Je travaille dans une pharmacie                        | pharmacie                | 6          | 2          | Key Lime cream, Shampoo HR1009, Shower gel GM1006                 |
| 9   | Bijouterie en centre-ville                             | bijouterie               | 2          | 1          | Feminine FG1006, Fabric conditioner LR1007, Feminine FM1006       |
| 10  | Je gère un hôtel                                       | hôtel                    | 3          | 2          | Fabric conditioner LR1007, Feminine FG1006, Shower gel GM1006     |
| 11  | Je tiens un glacier                                    | glacier                  | 12         | 3          | Shampoo HR1009, Grenadine mandarin, Key Lime cream                |
| 12  | Une crêperie                                           | crêperie                 | 6          | 1          | Blueberry muffin, Grenadine mandarin, Mango peach                 |
| 13  | Boutique de lingerie                                   | lingerie                 | 7          | 3          | Fabric conditioner LR1007, Vert de figue basilic, Feminine FG1006 |
| 14  | Je dirige un spa                                       | spa / institut de beauté | 7          | 1          | Key Lime cream, Shampoo HR1009, Shower gel GM1006                 |
| 15  | Cabinet de massage                                     | cabinet de massage       | 4          | 3          | Shampoo HR1009, Fabric conditioner LR1007, Shower gel GM1006      |
| 16  | Bar à jus de fruits                                    | bar à jus                | 1          | 1          | Key Lime cream, AP Roll-on UR1007, Shampoo HR1009                 |
| 17  | Magasin de bougies                                     | bougies                  | 11         | 6          | Mango peach, Feminine FM1006, Feminine FG1006                     |
| 18  | Une laverie automatique                                | laverie / pressing       | 4          | 3          | Shampoo HR1009, Key Lime cream, Shower gel GM1006                 |
