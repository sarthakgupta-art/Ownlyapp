import { create } from 'zustand';
import {
  customerLogin,
  customerLogout,
  customerRecoverPassword,
  customerRegister,
  customerRenew,
  fetchCustomer,
} from '@/shopify/api';
import type { Customer } from '@/shopify/types';
import { secure, storageKeys, store } from '@/lib/storage';

/**
 * Customer session.
 *
 * The access token is a bearer credential, so it lives in the keychain /
 * keystore rather than AsyncStorage. Shopify tokens last ~14 days; the app
 * renews on launch whenever the token is inside its final third of life.
 */

interface AuthState {
  token: string | null;
  expiresAt: string | null;
  customer: Customer | null;
  /** False until the persisted session has been read from disk. */
  ready: boolean;
  busy: boolean;

  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    acceptsMarketing?: boolean;
  }) => Promise<void>;
  recover: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const RENEW_THRESHOLD_MS = 4 * 24 * 60 * 60 * 1000;

async function persistToken(token: string, expiresAt: string): Promise<void> {
  await secure.set(storageKeys.accessToken, token);
  await store.set(storageKeys.accessTokenExpiry, expiresAt);
}

async function clearToken(): Promise<void> {
  await secure.remove(storageKeys.accessToken);
  await store.remove(storageKeys.accessTokenExpiry);
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  expiresAt: null,
  customer: null,
  ready: false,
  busy: false,

  restore: async () => {
    const token = await secure.get(storageKeys.accessToken);
    const expiresAt = await store.get<string>(storageKeys.accessTokenExpiry);

    if (!token) {
      set({ ready: true });
      return;
    }

    const expiryMs = expiresAt ? Date.parse(expiresAt) : NaN;
    if (Number.isFinite(expiryMs) && expiryMs <= Date.now()) {
      await clearToken();
      set({ ready: true, token: null, expiresAt: null, customer: null });
      return;
    }

    let activeToken = token;
    let activeExpiry = expiresAt;

    if (Number.isFinite(expiryMs) && expiryMs - Date.now() < RENEW_THRESHOLD_MS) {
      try {
        const renewed = await customerRenew(token);
        if (renewed) {
          activeToken = renewed.accessToken;
          activeExpiry = renewed.expiresAt;
          await persistToken(renewed.accessToken, renewed.expiresAt);
        }
      } catch {
        // A failed renewal is not fatal — the existing token is still valid.
      }
    }

    try {
      const customer = await fetchCustomer(activeToken);
      if (!customer) {
        // Shopify returns null for a revoked token; treat that as signed out.
        await clearToken();
        set({ ready: true, token: null, expiresAt: null, customer: null });
        return;
      }
      set({ ready: true, token: activeToken, expiresAt: activeExpiry, customer });
    } catch {
      // Offline at launch — keep the session and let screens retry.
      set({ ready: true, token: activeToken, expiresAt: activeExpiry });
    }
  },

  login: async (email, password) => {
    set({ busy: true });
    try {
      const token = await customerLogin(email.trim(), password);
      await persistToken(token.accessToken, token.expiresAt);
      const customer = await fetchCustomer(token.accessToken);
      set({ token: token.accessToken, expiresAt: token.expiresAt, customer });
    } finally {
      set({ busy: false });
    }
  },

  register: async (input) => {
    set({ busy: true });
    try {
      await customerRegister({ ...input, email: input.email.trim() });
      // Shopify does not return a session from `customerCreate`, so sign in
      // immediately to spare the buyer a second form.
      const token = await customerLogin(input.email.trim(), input.password);
      await persistToken(token.accessToken, token.expiresAt);
      const customer = await fetchCustomer(token.accessToken);
      set({ token: token.accessToken, expiresAt: token.expiresAt, customer });
    } finally {
      set({ busy: false });
    }
  },

  recover: async (email) => {
    set({ busy: true });
    try {
      await customerRecoverPassword(email.trim());
    } finally {
      set({ busy: false });
    }
  },

  logout: async () => {
    const { token } = get();
    set({ token: null, expiresAt: null, customer: null });
    await clearToken();
    if (token) {
      try {
        await customerLogout(token);
      } catch {
        // The local session is already gone; a failed revoke is not worth a toast.
      }
    }
  },

  refreshCustomer: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const customer = await fetchCustomer(token);
      set({ customer });
    } catch {
      /* leave the cached customer in place */
    }
  },
}));

export const selectIsSignedIn = (state: AuthState): boolean => state.token != null;
