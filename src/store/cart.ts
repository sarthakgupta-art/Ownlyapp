import { create } from 'zustand';
import {
  cartApplyDiscount,
  cartAttachCustomer,
  cartCreate,
  cartFetch,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
} from '@/shopify/api';
import { ShopifyError } from '@/shopify/client';
import type { Cart } from '@/shopify/types';
import { storageKeys, store } from '@/lib/storage';

/**
 * The bag.
 *
 * The cart itself lives on Shopify — the app only persists its id. That keeps
 * the app's totals, taxes and discounts authoritative and, crucially, means the
 * `checkoutUrl` we hand to the WebView is the same cart the buyer just built.
 */

interface CartState {
  cart: Cart | null;
  ready: boolean;
  /** True while a line-level mutation is inflight, for per-row spinners. */
  mutating: boolean;
  error: string | null;

  restore: () => Promise<void>;
  addLine: (merchandiseId: string, quantity?: number) => Promise<void>;
  setLineQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: () => Promise<void>;
  attachCustomer: (customerAccessToken: string) => Promise<void>;
  clearLocal: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * A cart id can go stale — Shopify expires carts, and a completed checkout
 * empties one. Both surface as a null cart, which means "start fresh".
 */
async function loadCart(cartId: string): Promise<Cart | null> {
  try {
    return await cartFetch(cartId);
  } catch (error) {
    if (error instanceof ShopifyError && error.kind === 'graphql') return null;
    throw error;
  }
}

export const useCart = create<CartState>((set, get) => ({
  cart: null,
  ready: false,
  mutating: false,
  error: null,

  restore: async () => {
    const cartId = await store.get<string>(storageKeys.cartId);
    if (!cartId) {
      set({ ready: true });
      return;
    }
    try {
      const cart = await loadCart(cartId);
      if (!cart) {
        await store.remove(storageKeys.cartId);
        set({ ready: true, cart: null });
        return;
      }
      set({ ready: true, cart });
    } catch {
      // Offline at launch: keep the id, show an empty bag, retry on next action.
      set({ ready: true });
    }
  },

  refresh: async () => {
    const cartId = get().cart?.id ?? (await store.get<string>(storageKeys.cartId));
    if (!cartId) return;
    try {
      const cart = await loadCart(cartId);
      if (!cart) {
        await store.remove(storageKeys.cartId);
        set({ cart: null });
        return;
      }
      set({ cart });
    } catch {
      /* keep the cached cart */
    }
  },

  addLine: async (merchandiseId, quantity = 1) => {
    set({ mutating: true, error: null });
    try {
      const existing = get().cart;
      let cart: Cart;

      if (!existing) {
        cart = await cartCreate([{ merchandiseId, quantity }]);
        await store.set(storageKeys.cartId, cart.id);
      } else {
        // Shopify merges duplicate merchandise ids itself, but going through
        // `cartLinesUpdate` for a line we already hold avoids a needless
        // add-then-merge round trip and keeps the quantity exact.
        const line = existing.lines.find((l) => l.merchandise.id === merchandiseId);
        cart = line
          ? await cartLinesUpdate(existing.id, [{ id: line.id, quantity: line.quantity + quantity }])
          : await cartLinesAdd(existing.id, [{ merchandiseId, quantity }]);
      }
      set({ cart });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not add to the bag.' });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },

  setLineQuantity: async (lineId, quantity) => {
    const cart = get().cart;
    if (!cart) return;
    if (quantity <= 0) {
      await get().removeLine(lineId);
      return;
    }
    set({ mutating: true, error: null });
    try {
      set({ cart: await cartLinesUpdate(cart.id, [{ id: lineId, quantity }]) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update the bag.' });
    } finally {
      set({ mutating: false });
    }
  },

  removeLine: async (lineId) => {
    const cart = get().cart;
    if (!cart) return;
    set({ mutating: true, error: null });
    try {
      set({ cart: await cartLinesRemove(cart.id, [lineId]) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update the bag.' });
    } finally {
      set({ mutating: false });
    }
  },

  applyDiscount: async (code) => {
    const cart = get().cart;
    if (!cart) return;
    set({ mutating: true, error: null });
    try {
      const updated = await cartApplyDiscount(cart.id, [code.trim()]);
      set({ cart: updated });
      const applied = updated.discountCodes.find((d) => d.code.toLowerCase() === code.trim().toLowerCase());
      if (applied && !applied.applicable) {
        set({ error: 'That code is not valid for the items in your bag.' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not apply that code.' });
    } finally {
      set({ mutating: false });
    }
  },

  removeDiscount: async () => {
    const cart = get().cart;
    if (!cart) return;
    set({ mutating: true, error: null });
    try {
      set({ cart: await cartApplyDiscount(cart.id, []) });
    } finally {
      set({ mutating: false });
    }
  },

  attachCustomer: async (customerAccessToken) => {
    const cart = get().cart;
    if (!cart) return;
    try {
      set({ cart: await cartAttachCustomer(cart.id, customerAccessToken) });
    } catch {
      // Checkout still works signed-out; this is purely a convenience.
    }
  },

  clearLocal: async () => {
    await store.remove(storageKeys.cartId);
    set({ cart: null });
  },
}));

export const selectCartCount = (state: CartState): number => state.cart?.totalQuantity ?? 0;

export function findCartLineFor(cart: Cart | null, merchandiseId: string) {
  return cart?.lines.find((line) => line.merchandise.id === merchandiseId) ?? null;
}
