import type { Href } from 'expo-router';

/**
 * Maps a push payload to an in-app route.
 *
 * Campaign payloads carry `{ type, handle }` rather than a raw path, so the
 * server never has to know the app's routing table and a route rename cannot
 * break a scheduled campaign.
 */
export interface PushPayload {
  type?: 'product' | 'collection' | 'search' | 'orders' | 'cart' | 'finder';
  handle?: string;
  query?: string;
  department?: string;
}

export function routeForPayload(payload: PushPayload | null | undefined): Href | null {
  if (!payload || !payload.type) return null;
  switch (payload.type) {
    case 'product':
      return payload.handle ? { pathname: '/product/[handle]', params: { handle: payload.handle } } : null;
    case 'collection':
      return payload.handle ? { pathname: '/collection/[handle]', params: { handle: payload.handle } } : null;
    case 'search':
      return { pathname: '/search', params: payload.query ? { q: payload.query } : {} };
    case 'orders':
      return '/orders';
    case 'cart':
      return '/cart';
    case 'finder':
      return '/(tabs)/finder';
    default:
      return null;
  }
}
