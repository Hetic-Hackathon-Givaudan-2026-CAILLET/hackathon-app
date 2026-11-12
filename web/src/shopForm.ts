// Structure du formulaire « Paramétrer votre boutique » : colonnes, cartes, champs.
// Les clés sont celles de PUT /api/shop.
type UnitOption = { unit: string; placeholder: string };

export type Field =
  | {
      key: string;
      label: string;
      type: 'text' | 'textarea';
      placeholder: string;
    }
  | {
      key: string;
      label: string;
      type: 'textlist' | 'select';
      options: string[];
      placeholder?: string;
    }
  | { key: string; label: string; type: 'unit'; option: UnitOption }
  | { key: string; label: string; type: 'range' };

export const SHOP: [string, Field[]][][] = [
  [
    [
      'Identité',
      [
        {
          key: 'nom',
          label: 'Nom de la boutique',
          type: 'text',
          placeholder: 'Ex. : Librairie des Tilleuls',
        },
        {
          key: 'type',
          label: 'Type de boutique',
          type: 'textlist',
          placeholder: 'Ex. : librairie indépendante',
          options: [
            'Librairie',
            'Boutique de thés',
            'Concept store',
            'Spa',
            'Hôtel',
            'Café',
            'Bijouterie',
            'Boutique de sport',
            'Boutique de vêtements',
            'Boutique de bougies',
          ],
        },
        {
          key: 'ville',
          label: 'Ville',
          type: 'text',
          placeholder: 'Ex. : Lyon',
        },
        {
          key: 'site',
          label: 'Adresse du site',
          type: 'text',
          placeholder: 'Ex. : www.ma-boutique.fr',
        },
      ],
    ],
    [
      'Budget',
      [
        {
          key: 'budget',
          label: 'Budget par commande',
          type: 'select',
          options: [
            'Moins de 500 €',
            '500 – 1 000 €',
            '1 000 – 5 000 €',
            'Plus de 5 000 €',
          ],
        },
      ],
    ],
  ],
  [
    [
      'Clientèle',
      [
        { key: 'age', label: 'Tranche d’âge', type: 'range' },
        {
          key: 'clients',
          label: 'Parlez-nous de vos clients',
          type: 'textarea',
          placeholder:
            'Ex. : des habitués du quartier, des lecteurs qui aiment prendre leur temps, quelques touristes en été…',
        },
      ],
    ],
    [
      'Ambiance',
      [
        {
          key: 'ambiance',
          label: 'Mots-clés de l’univers',
          type: 'text',
          placeholder: 'Ex. : chaleureux, apaisant',
        },
        {
          key: 'surface',
          label: 'Surface du lieu',
          type: 'unit',
          option: { unit: 'm²', placeholder: '80' },
        },
      ],
    ],
  ],
  [
    [
      'Livraison',
      [
        {
          key: 'adresse',
          label: 'Adresse de livraison',
          type: 'text',
          placeholder: 'Ex. : 12, rue des Tilleuls',
        },
        {
          key: 'contact',
          label: 'Interlocuteur',
          type: 'text',
          placeholder: 'Ex. : Camille Martin',
        },
      ],
    ],
  ],
];
