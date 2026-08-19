import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { colors, spacing } from '@/theme/tokens';

/**
 * Checkout.
 *
 * Browsing and the bag are native; payment is Shopify's hosted checkout in a
 * WebView. That is deliberate — it keeps PCI scope, the Shiprocket hand-off,
 * every payment method and every discount rule exactly as they are on the web
 * store, and it is what Apple and Google expect for physical goods.
 *
 * The one thing the app must get right is detecting completion, so the local
 * cart is cleared and the buyer is returned to a sensible screen rather than
 * left staring at an order-status page inside a modal.
 */

function isOrderComplete(url: string): boolean {
  // `/checkouts/` alone is the checkout itself; only the status page under it
  // (`.../checkouts/<token>/thank_you` or a redirect to `/orders/<id>`) counts.
  if (url.includes('/thank_you') || url.includes('/thank-you')) return true;
  if (/\/orders\/[^/]+/.test(url) && !url.includes('/checkouts/')) return true;
  return false;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const cart = useCart((s) => s.cart);
  const clearLocal = useCart((s) => s.clearLocal);
  const refreshCart = useCart((s) => s.refresh);
  const refreshCustomer = useAuth((s) => s.refreshCustomer);

  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const handledCompletion = useRef(false);

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (handledCompletion.current) return;
      if (!isOrderComplete(navState.url)) return;

      handledCompletion.current = true;
      setCompleted(true);
      // The Shopify cart is consumed by a completed checkout, so drop the local
      // id; keeping it would resurrect an empty cart on the next launch.
      void clearLocal();
      void refreshCustomer();
    },
    [clearLocal, refreshCustomer],
  );

  const close = useCallback(() => {
    // If the buyer backs out mid-checkout the cart may have changed server-side
    // (stock, discounts), so re-read it rather than trusting the local copy.
    if (!handledCompletion.current) void refreshCart();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/bag');
  }, [router, refreshCart]);

  if (!cart?.checkoutUrl) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AppHeader title="Checkout" showBack />
        <EmptyState
          title="Your bag is empty"
          body="Add something before checking out."
          actionLabel="Back to shopping"
          onAction={() => router.replace('/(tabs)/shop')}
        />
      </Screen>
    );
  }

  if (completed) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AppHeader title="Order placed" />
        <EmptyState
          title="Thank you"
          body="Your order is confirmed. You will get a confirmation email, and tracking as soon as it ships."
          actionLabel="View my orders"
          onAction={() => router.replace('/orders')}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)')}
          style={styles.secondaryLink}
        >
          <Text variant="caption" tone="muted">
            Back to shopping
          </Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <AppHeader
        title="Secure checkout"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Close checkout" onPress={close} hitSlop={10}>
            <Icon name="close" size={22} />
          </Pressable>
        }
      />

      <View style={styles.webviewWrap}>
        <WebView
          source={{ uri: cart.checkoutUrl }}
          onNavigationStateChange={onNavigationStateChange}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={false}
          // UPI, netbanking and wallet flows on Indian gateways routinely open
          // a new window; without this they silently fail to launch.
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={['https://*', 'http://*', 'upi://*', 'intent://*']}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={Platform.OS === 'ios'}
          style={styles.webview}
        />
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.text} />
            <Text variant="caption" tone="muted" style={styles.loadingLabel}>
              Opening secure checkout…
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  webviewWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.background },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingLabel: { marginTop: spacing.xs },
  secondaryLink: { alignItems: 'center', paddingBottom: spacing.xl },
});
