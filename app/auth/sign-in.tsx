import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { EmptyState, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { AuthError } from '@/customer/oauth';
import { describeCustomerError } from '@/customer/client';
import { isCustomerAccountsConfigured } from '@/config/env';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/**
 * Sign-in is a hand-off, not a form.
 *
 * The store runs Shopify's new customer accounts, which are passwordless — the
 * buyer receives a one-time code by email. That flow lives on Shopify's hosted
 * login page, so the app opens it in a browser and receives an OAuth token
 * back. Re-implementing it in-app is neither possible nor desirable: the
 * browser is what makes password managers and passkeys work.
 */
export default function SignInScreen() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);
  const busy = useAuth((s) => s.busy);
  const attachCustomer = useCart((s) => s.attachCustomer);

  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    try {
      await signIn();
      // Linking the session to the cart makes Shopify's checkout open with the
      // buyer's saved details already filled in.
      const token = useAuth.getState().accessToken;
      if (token) await attachCustomer(token);

      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/account');
    } catch (err) {
      // Backing out of the browser is a normal action, not an error worth
      // shouting about.
      if (err instanceof AuthError && err.code === 'cancelled') return;
      setError(describeCustomerError(err));
    }
  };

  if (!isCustomerAccountsConfigured) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AppHeader title="Sign in" showBack />
        <EmptyState
          title="Accounts are not set up yet"
          body="This build has no Customer Account API client id. Add EXPO_PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID and rebuild to enable sign-in."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <AppHeader title="Sign in" showBack />
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="title">Your Ownly Club account</Text>
        <Text variant="body" tone="muted" style={styles.lead}>
          Sign in with the same email you use on ownlyclub.in. Shopify sends you a one-time code — there is no
          password to remember.
        </Text>

        <View style={styles.benefits}>
          {[
            ['bag', 'Track every order in one place'],
            ['home', 'Save addresses for a one-tap checkout'],
            ['heart', 'Keep your wishlist across devices'],
          ].map(([icon, label]) => (
            <View key={label} style={styles.benefitRow}>
              <Icon name={icon as 'bag'} size={18} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary" style={styles.flex}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}

        <Button label="Continue" full size="lg" loading={busy} onPress={() => void start()} />

        <Text variant="micro" tone="faint" center style={styles.legal}>
          Signing in opens a secure Shopify page. Ownly Club never sees your password.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: layout.screenPadding, gap: spacing.lg },
  lead: { maxWidth: 380 },
  benefits: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legal: { marginTop: spacing.sm },
});
