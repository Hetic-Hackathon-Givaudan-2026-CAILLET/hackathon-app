import type {
  CatalogDTO,
  ChatAnalysis,
  Order,
  OrderItem,
  RecoResult,
  RecoScores,
  Shop,
  User,
} from './types';

// Pas d'authentification (ADR 0004) : un identifiant anonyme, créé au premier
// lancement et gardé dans ce navigateur, rattache les données au visiteur.
const KEY = 'customerId';
let memoryId: string | null = null;

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // randomUUID n'existe que sur HTTPS ou localhost
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function customerId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) localStorage.setItem(KEY, (id = newId()));
    return id;
  } catch {
    // Stockage bloqué : l'identifiant ne vivra que le temps de la page
    return (memoryId ??= newId());
  }
}

export class ApiError extends Error {}

async function request<T>(path: string, method = 'GET', body?: unknown) {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        'X-Customer-Id': customerId(),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Le serveur est injoignable.');
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.error ?? `Erreur serveur (${response.status})`);
  }
  return (await response.json()) as T;
}

export const api = {
  catalog: () => request<CatalogDTO>('/api/catalog'),
  me: () => request<User>('/api/me'),
  saveMe: (user: Partial<User>) => request<User>('/api/me', 'PUT', user),
  shop: () => request<Shop>('/api/shop'),
  saveShop: (shop: Shop) => request<Shop>('/api/shop', 'PUT', shop),
  // `hint` : ce que l'analyse par mots-clés a déjà repéré, pour ancrer la réponse
  chat: (message: string, hint: { type: string | null; ambiance: string[] }) =>
    request<ChatAnalysis>('/api/chat', 'POST', { message, hint }),
  // Recommandation Givaudan : lecture de la description par le modèle de langage
  recommandation: (description: string) =>
    request<RecoResult>('/api/recommandation', 'POST', { description }),
  // Mêmes résultats à partir des 5 curseurs, sans modèle de langage
  recommandationCurseurs: (scores: RecoScores) =>
    request<RecoResult>('/api/recommandation/curseurs', 'POST', scores),
  orders: () => request<Order[]>('/api/orders'),
  createOrder: (items: OrderItem[]) =>
    request<Order>('/api/orders', 'POST', { items }),
  setOrderStatus: (id: string, status: string) =>
    request<Order>(`/api/orders/${encodeURIComponent(id)}/status`, 'PATCH', {
      status,
    }),
};
