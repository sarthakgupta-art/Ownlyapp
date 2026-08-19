import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { env } from '@/config/env';
import { storageKeys, store } from '@/lib/storage';

/**
 * Push notifications.
 *
 * The app registers an Expo push token and hands it to `EXPO_PUBLIC_PUSH_
 * REGISTRATION_URL` along with the buyer's topic preferences. Sending is a
 * server concern — see `server/README.md` — so this module only covers the
 * device side: permission, token, channels and preference storage.
 */

export interface PushPreferences {
  drops: boolean;
  priceDrops: boolean;
  orders: boolean;
  offers: boolean;
}

export const defaultPushPreferences: PushPreferences = {
  drops: true,
  priceDrops: true,
  orders: true,
  offers: false,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android needs channels declared before the first notification, otherwise
 * everything lands in a single unnamed group the user can only mute wholesale.
 */
async function configureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync('drops', {
    name: 'New arrivals & restocks',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync('offers', {
    name: 'Offers',
    importance: Notifications.AndroidImportance.LOW,
  });
}

function projectId(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined;
  const id = fromExtra?.projectId;
  // The placeholder in app.json must not be sent to Expo's push service.
  if (!id || id.startsWith('00000000')) return undefined;
  return id;
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Asks for permission and returns the Expo push token, or null when the buyer
 * declines, the device cannot receive push, or the project id is unset.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  await configureAndroidChannels();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const id = projectId();
  if (!id) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await store.set(storageKeys.pushToken, token.data);
    return token.data;
  } catch {
    return null;
  }
}

export async function loadPushPreferences(): Promise<PushPreferences> {
  const saved = await store.get<Partial<PushPreferences>>(storageKeys.pushPrefs);
  return { ...defaultPushPreferences, ...(saved ?? {}) };
}

export async function savePushPreferences(prefs: PushPreferences): Promise<void> {
  await store.set(storageKeys.pushPrefs, prefs);
  await syncRegistration(prefs);
}

/**
 * Posts the token and topic preferences to the registration endpoint. Silent
 * on failure — a missed sync must never block the settings screen.
 */
export async function syncRegistration(prefs?: PushPreferences): Promise<void> {
  if (!env.pushRegistrationUrl) return;
  const token = await store.get<string>(storageKeys.pushToken);
  if (!token) return;

  const preferences = prefs ?? (await loadPushPreferences());
  try {
    await fetch(env.pushRegistrationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? null,
        preferences,
      }),
    });
  } catch {
    /* best effort */
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return store.get<string>(storageKeys.pushToken);
}
