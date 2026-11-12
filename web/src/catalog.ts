import type { Axis, CatalogDTO, LexiconEntry, Product } from './types';

type Profile = { axes: number[]; vals: number[] };

// Le catalogue vient de l'API (GET /api/catalog) ; les motifs de texte, stockés
// en base, sont compilés une fois ici.
export let catalog: {
  axes: Axis[];
  products: Product[];
  productsById: Record<string, Product>;
  examples: CatalogDTO['examples'];
  orderSteps: string[];
  statuses: CatalogDTO['orderStatuses'];
  // Types de boutique reconnus dans la demande, dans l'ordre de priorité
  types: { label: string; re: RegExp }[];
  profiles: Record<string, Profile>;
  defaultProfile: Profile;
  lexicon: (LexiconEntry & { re: RegExp })[];
};

export function setCatalog(dto: CatalogDTO) {
  // Les vues indexent `axes` par identifiant d'axe
  const axes = [...dto.axes].sort((a, b) => a.id - b.id);
  if (axes.some((axis, i) => axis.id !== i)) {
    throw new Error(
      'Catalogue invalide : les axes doivent être numérotés de 0 à n',
    );
  }
  const fallback = dto.shopTypes.find((t) => t.isDefault);
  if (!fallback)
    throw new Error('Catalogue invalide : profil par défaut absent');
  catalog = {
    axes,
    products: dto.products,
    productsById: Object.fromEntries(dto.products.map((p) => [p.id, p])),
    examples: dto.examples,
    orderSteps: dto.orderSteps,
    statuses: dto.orderStatuses,
    types: dto.shopTypes
      .filter((t) => t.pattern)
      .map((t) => ({ label: t.label, re: new RegExp(t.pattern!, t.flags) })),
    profiles: Object.fromEntries(
      dto.shopTypes.map((t) => [t.label, { axes: t.axes, vals: t.vals }]),
    ),
    defaultProfile: { axes: fallback.axes, vals: fallback.vals },
    lexicon: dto.lexicon.map((l) => ({
      ...l,
      re: new RegExp(l.pattern, l.flags),
    })),
  };
}
