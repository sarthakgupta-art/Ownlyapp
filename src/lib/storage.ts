import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Two tiers of persistence:
 *  - `store`  — ordinary app state (wishlist, cart id, recently viewed).
 *  - `secure` — the customer access token, which is a bearer credential.
 *
 * `expo-secure-store` has no web implementation, so on web the secure tier
 * degrades to AsyncStorage. That is acceptable because the web build is a
 * development convenience, not a shipping surface.
 */

export const store = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage failures are never worth crashing a screen over.
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const secureAvailable = Platform.OS !== 'web';

export const secure = {
  async get(key: string): Promise<string | null> {
    try {
      if (!secureAvailable) return AsyncStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (!secureAvailable) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      /* ignore */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (!secureAvailable) {
        await AsyncStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};

export const storageKeys = {
  cartId: 'ownly.cart.id',
  wishlist: 'ownly.wishlist.v1',
  recentlyViewed: 'ownly.recent.v1',
  recentSearches: 'ownly.searches.v1',
  accessToken: 'ownly.customer.token',
  accessTokenExpiry: 'ownly.customer.expiry',
  department: 'ownly.department',
  pushToken: 'ownly.push.token',
  pushPrefs: 'ownly.push.prefs',
  finderResult: 'ownly.finder.last',
} as const;
