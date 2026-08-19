import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { usePreferences } from '@/store/preferences';
import { routeForPayload, type PushPayload } from '@/notifications/links';
import { ShopifyError } from '@/shopify/client';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        // The client already retries transport failures; retrying a GraphQL or
        // config error here would just delay the error state the user needs.
        if (error instanceof ShopifyError && error.kind !== 'network') return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

/** Restores persisted state and wires push deep links. */
function useAppBootstrap() {
  const router = useRouter();
  const restoreAuth = useAuth((s) => s.restore);
  const restoreCart = useCart((s) => s.restore);
  const restoreWishlist = useWishlist((s) => s.restore);
  const restorePreferences = usePreferences((s) => s.restore);
  const authReady = useAuth((s) => s.ready);
  const cartReady = useCart((s) => s.ready);
  const attachCustomer = useCart((s) => s.attachCustomer);
  const accessToken = useAuth((s) => s.accessToken);
  const handledColdStart = useRef(false);

  useEffect(() => {
    void Promise.all([restoreAuth(), restoreCart(), restoreWishlist(), restorePreferences()]);
  }, [restoreAuth, restoreCart, restoreWishlist, restorePreferences]);

  useEffect(() => {
    if (authReady && cartReady) {
      void SplashScreen.hideAsync();
    }
  }, [authReady, cartReady]);

  // Linking the signed-in customer to the cart makes Shopify's hosted checkout
  // open pre-filled, which is most of the checkout speed win in the app.
  useEffect(() => {
    if (accessToken && cartReady) void attachCustomer(accessToken);
  }, [accessToken, cartReady, attachCustomer]);

  useEffect(() => {
    const navigate = (payload: PushPayload | null | undefined) => {
      const href = routeForPayload(payload);
      if (href) router.push(href);
    };

    // A notification that launched the app from cold has no listener event.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) navigate(response.notification.request.content.data as PushPayload);
      });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response.notification.request.content.data as PushPayload);
    });
    return () => subscription.remove();
  }, [router]);
}

function RootNavigator() {
  useAppBootstrap();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[handle]" />
      <Stack.Screen name="collection/[handle]" />
      <Stack.Screen name="search" options={{ animation: 'fade' }} />
      <Stack.Screen name="cart" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="checkout" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="auth/sign-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
