import { create } from 'zustand';
import { storageKeys, store } from '@/lib/storage';

/**
 * Wishlist and recently-viewed.
 *
 * Both persist product GIDs only, and rehydrate through `fetchProductsByIds`.
 * Storing ids rather than snapshots means a saved product always shows its
 * current price and stock — which is the whole point of a wishlist on a
 * catalogue whose prices move.
 */

const MAX_RECENT = 30;

interface WishlistState {
  ids: string[];
  recentIds: string[];
  ready: boolean;

  restore: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  has: (productId: string) => boolean;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  noteViewed: (productId: string) => Promise<void>;
}

export const useWishlist = create<WishlistState>((set, get) => ({
  ids: [],
  recentIds: [],
  ready: false,

  restore: async () => {
    const [ids, recentIds] = await Promise.all([
      store.get<string[]>(storageKeys.wishlist),
      store.get<string[]>(storageKeys.recentlyViewed),
    ]);
    set({ ids: ids ?? [], recentIds: recentIds ?? [], ready: true });
  },

  toggle: async (productId) => {
    const current = get().ids;
    const saved = current.includes(productId);
    // Newest first, so the wishlist screen reads as a running list.
    const next = saved ? current.filter((id) => id !== productId) : [productId, ...current];
    set({ ids: next });
    await store.set(storageKeys.wishlist, next);
    return !saved;
  },

  has: (productId) => get().ids.includes(productId),

  remove: async (productId) => {
    const next = get().ids.filter((id) => id !== productId);
    set({ ids: next });
    await store.set(storageKeys.wishlist, next);
  },

  clear: async () => {
    set({ ids: [] });
    await store.set(storageKeys.wishlist, []);
  },

  noteViewed: async (productId) => {
    const next = [productId, ...get().recentIds.filter((id) => id !== productId)].slice(0, MAX_RECENT);
    set({ recentIds: next });
    await store.set(storageKeys.recentlyViewed, next);
  },
}));
