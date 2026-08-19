import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Screen } from './Layout';
import { AppHeader } from './AppHeader';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/**
 * Shown instead of the catalogue when the Storefront credentials are missing.
 * A precise setup checklist beats a screen full of network errors when someone
 * clones the repo and runs it for the first time.
 */
export function SetupNotice() {
  return (
    <Screen>
      <AppHeader brand />
      <View style={styles.body}>
        <Text variant="title">Almost there</Text>
        <Text variant="body" tone="secondary" style={styles.lead}>
          The app cannot reach Shopify yet. Add your Storefront API credentials and reload.
        </Text>

        <View style={styles.card}>
          <Text variant="bodyStrong">1. Create a Storefront token</Text>
          <Text variant="caption" tone="muted" style={styles.step}>
            Shopify admin → Settings → Apps and sales channels → Develop apps → Create an app → Configure Storefront
            API scopes → Install → copy the Storefront API access token.
          </Text>

          <Text variant="bodyStrong" style={styles.stepTitle}>
            2. Fill in .env
          </Text>
          <View style={styles.code}>
            <Text variant="micro" tone="secondary">
              EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN=ownlyclub.myshopify.com
            </Text>
            <Text variant="micro" tone="secondary">
              EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=your_token
            </Text>
          </View>

          <Text variant="bodyStrong" style={styles.stepTitle}>
            3. Restart with a clear cache
          </Text>
          <View style={styles.code}>
            <Text variant="micro" tone="secondary">
              npx expo start --clear
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: layout.screenPadding, gap: spacing.md },
  lead: { maxWidth: 420 },
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  step: { marginTop: spacing.xxs },
  stepTitle: { marginTop: spacing.lg },
  code: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
    gap: spacing.xxs,
  },
});
