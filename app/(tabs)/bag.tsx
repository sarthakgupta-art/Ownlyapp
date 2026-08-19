import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { CartLineRow } from '@/components/CartLineRow';
import { Divider, EmptyState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { SetupNotice } from '@/components/SetupNotice';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { formatMoney, pluralise } from '@/lib/format';
import { isShopifyConfigured } from '@/config/env';
import { colors, fonts, layout, radius, spacing } from '@/theme/tokens';

export default function BagScreen() {
  const router = useRouter();
  const cart = useCart((s) => s.cart);
  const ready = useCart((s) => s.ready);
  const mutating = useCart((s) => s.mutating);
  const error = useCart((s) => s.error);
  const setLineQuantity = useCart((s) => s.setLineQuantity);
  const removeLine = useCart((s) => s.removeLine);
  const applyDiscount = useCart((s) => s.applyDiscount);
  const removeDiscount = useCart((s) => s.removeDiscount);
  const getValidToken = useAuth((s) => s.getValidToken);
  const attachCustomer = useCart((s) => s.attachCustomer);

  const [code, setCode] = useState('');

  const goToCheckout = useCallback(async () => {
    if (!cart) return;
    // Re-attach the customer right before handing off, so a sign-in that
    // happened after the cart was created still pre-fills checkout, and so a
    // stale access token is refreshed rather than silently ignored.
    const token = await getValidToken();
    if (token) await attachCustomer(token);
    router.push('/checkout');
  }, [cart, getValidToken, attachCustomer, router]);

  if (!isShopifyConfigured) return <SetupNotice />;
  if (!ready) {
    return (
      <Screen>
        <AppHeader title="Bag" />
        <Loading />
      </Screen>
    );
  }

  const lines = cart?.lines ?? [];
  const hasUnavailable = lines.some((line) => !line.merchandise.availableForSale);
  const appliedCode = cart?.discountCodes.find((d) => d.applicable);

  if (lines.length === 0) {
    return (
      <Screen>
        <AppHeader title="Bag" showSearch />
        <EmptyState
          title="Your bag is empty"
          body="Everything you add stays here across sessions, on this device."
          actionLabel="Start shopping"
          onAction={() => router.push('/(tabs)/shop')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Bag" subtitle={pluralise(cart?.totalQuantity ?? 0, 'item')} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {lines.map((line, index) => (
          <View key={line.id}>
            {index > 0 ? <Divider /> : null}
            <CartLineRow
              line={line}
              disabled={mutating}
              onChangeQuantity={(quantity) => void setLineQuantity(line.id, quantity)}
              onRemove={() => void removeLine(line.id)}
            />
          </View>
        ))}

        <Divider />

        <View style={styles.discount}>
          <Text variant="eyebrow" tone="muted" uppercase>
            Discount code
          </Text>
          {appliedCode ? (
            <View style={styles.appliedRow}>
              <Text variant="body">{appliedCode.code}</Text>
              <Button label="Remove" variant="ghost" size="sm" onPress={() => void removeDiscount()} />
            </View>
          ) : (
            <View style={styles.discountRow}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter code"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Discount code"
              />
              <Button
                label="Apply"
                variant="secondary"
                size="sm"
                disabled={code.trim().length === 0 || mutating}
                onPress={() => {
                  void applyDiscount(code);
                  setCode('');
                }}
              />
            </View>
          )}
          {error ? (
            <Text variant="caption" tone="danger" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text variant="body" tone="secondary">
            Subtotal
          </Text>
          <Text variant="body">{formatMoney(cart?.cost.subtotalAmount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text variant="bodyStrong">Total</Text>
          <Text variant="bodyStrong">{formatMoney(cart?.cost.totalAmount)}</Text>
        </View>
        <Text variant="micro" tone="muted">
          Shipping and any duties are calculated at checkout.
        </Text>

        {hasUnavailable ? (
          <Text variant="caption" tone="danger" style={styles.error}>
            Remove the out-of-stock items to continue.
          </Text>
        ) : null}

        <Button
          label="Checkout"
          full
          size="lg"
          loading={mutating}
          disabled={hasUnavailable}
          onPress={() => void goToCheckout()}
          style={styles.checkoutButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xl },
  discount: { paddingVertical: spacing.xl, gap: spacing.sm },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appliedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  error: { marginTop: spacing.xs },
  summary: {
    padding: layout.screenPadding,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  checkoutButton: { marginTop: spacing.sm },
});
