import { create } from 'zustand';
import { fetchCustomer } from '@/customer/api';
import { CustomerApiError } from '@/customer/client';
import { AuthError, refresh as refreshTokens, signIn as oauthSignIn, signOutRemote } from '@/customer/oauth';
import type { Customer } from '@/customer/types';
import { isCustomerAccountsConfigured } from '@/config/env';
import { secure, storageKeys, store } from '@/lib/storage';

/**
 * Customer session, backed by Shopify's Customer Account API.
 *
 * The store runs new customer accounts, so there is no email/password mutation
 * to call — sign-in opens Shopify's hosted login in a browser and returns an
 * OAuth token set. Access tokens are short-lived, so the refresh token is the
 * thing that actually keeps someone signed in between launches; both are
 * bearer credentials and live in the keychain.
 */

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number | null;
  customer: Customer | null;
  /** False until the persisted session has been read from disk. */
  ready: boolean;
  busy: boolean;
  /** True while a background token refresh is running. */
  available: boolean;

  restore: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
  /**
   * Returns a token guaranteed live, refreshing first if it is about to expire.
   * Everything that talks to the Customer Account API goes through this.
   */
  getValidToken: () => Promise<string | null>;
}

async function persist(tokens: {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number;
}): Promise<void> {
  await secure.set(storageKeys.accessToken, tokens.accessToken);
  if (tokens.refreshToken) await secure.set(storageKeys.refreshToken, tokens.refreshToken);
  if (tokens.idToken) await secure.set(storageKeys.idToken, tokens.idToken);
  await store.set(storageKeys.accessTokenExpiry, tokens.expiresAt);
}

async function clearPersisted(): Promise<void> {
  await Promise.all([
    secure.remove(storageKeys.accessToken),
    secure.remove(storageKeys.refreshToken),
    secure.remove(storageKeys.idToken),
    store.remove(storageKeys.accessTokenExpiry),
  ]);
}

export const useAuth = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  idToken: null,
  expiresAt: null,
  customer: null,
  ready: false,
  busy: false,
  available: isCustomerAccountsConfigured,

  restore: async () => {
    if (!isCustomerAccountsConfigured) {
      set({ ready: true, available: false });
      return;
    }

    const [accessToken, refreshToken, idToken, expiresAt] = await Promise.all([
      secure.get(storageKeys.accessToken),
      secure.get(storageKeys.refreshToken),
      secure.get(storageKeys.idToken),
      store.get<number>(storageKeys.accessTokenExpiry),
    ]);

    if (!accessToken && !refreshToken) {
      set({ ready: true });
      return;
    }

    set({ accessToken, refreshToken, idToken, expiresAt: expiresAt ?? null });

    try {
      const token = await get().getValidToken();
      if (!token) {
        set({ ready: true });
        return;
      }
      const customer = await fetchCustomer(token);
      set({ ready: true, customer });
    } catch (error) {
      // Offline at launch is not a reason to sign someone out; only an
      // explicitly rejected session is.
      if (error instanceof CustomerApiError && error.kind === 'unauthorized') {
        await clearPersisted();
        set({ ready: true, accessToken: null, refreshToken: null, idToken: null, customer: null });
        return;
      }
      set({ ready: true });
    }
  },

  getValidToken: async () => {
    const { accessToken, refreshToken, expiresAt } = get();

    const stillValid = accessToken != null && expiresAt != null && Date.now() < expiresAt;
    if (stillValid) return accessToken;

    if (!refreshToken) {
      // An expired access token with nothing to renew it means signed out.
      if (accessToken) {
        await clearPersisted();
        set({ accessToken: null, expiresAt: null, customer: null });
      }
      return null;
    }

    try {
      const tokens = await refreshTokens(refreshToken);
      await persist(tokens);
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken ?? get().idToken,
        expiresAt: tokens.expiresAt,
      });
      return tokens.accessToken;
    } catch (error) {
      // A rejected refresh token is terminal — the buyer must sign in again.
      if (error instanceof AuthError) {
        await clearPersisted();
        set({ accessToken: null, refreshToken: null, idToken: null, expiresAt: null, customer: null });
      }
      return null;
    }
  },

  signIn: async () => {
    set({ busy: true });
    try {
      const tokens = await oauthSignIn();
      await persist(tokens);
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        expiresAt: tokens.expiresAt,
      });
      const customer = await fetchCustomer(tokens.accessToken);
      set({ customer });
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    const { idToken } = get();
    set({ accessToken: null, refreshToken: null, idToken: null, expiresAt: null, customer: null });
    await clearPersisted();
    // Also end the browser-side session, so the next sign-in can use a
    // different account instead of silently reusing this one.
    await signOutRemote(idToken);
  },

  refreshCustomer: async () => {
    const token = await get().getValidToken();
    if (!token) return;
    try {
      set({ customer: await fetchCustomer(token) });
    } catch {
      /* keep the cached customer */
    }
  },
}));

export const selectIsSignedIn = (state: AuthState): boolean => state.accessToken != null;
