import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon, type IconName } from '@/components/Icon';
import { useAuth } from '@/store/auth';
import { useWishlist } from '@/store/wishlist';
import { env } from '@/config/env';
import { colors, layout, spacing } from '@/theme/tokens';

function MenuRow({
  label,
  detail,
  icon,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <View style={styles.rowText}>
        <Text variant="body">{label}</Text>
        {detail ? (
          <Text variant="micro" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={17} color={colors.textFaint} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const customer = useAuth((s) => s.customer);
  const accessToken = useAuth((s) => s.accessToken);
  const signOut = useAuth((s) => s.signOut);
  const accountsAvailable = useAuth((s) => s.available);
  const savedCount = useWishlist((s) => s.ids.length);

  const signedIn = accessToken != null;
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');

  return (
    <Screen>
      <AppHeader title="Account" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {signedIn ? (
          <View style={styles.identity}>
            <Text variant="display">{name || 'Welcome back'}</Text>
            {customer?.email ? (
              <Text variant="caption" tone="muted">
                {customer.email}
              </Text>
            ) : null}
          </View>
        ) : accountsAvailable ? (
          <View style={styles.signInCard}>
            <Text variant="title">Sign in to Ownly Club</Text>
            <Text variant="caption" tone="muted" style={styles.signInBody}>
              Track orders, save addresses for a faster checkout, and keep your wishlist across devices. Shopify
              emails you a one-time code — no password needed.
            </Text>
            <Button label="Sign in or create an account" onPress={() => router.push('/auth/sign-in')} />
          </View>
        ) : null}

        <View style={styles.group}>
          {signedIn ? (
            <>
              <MenuRow label="My orders" icon="bag" onPress={() => router.push('/orders')} />
              <MenuRow
                label="Saved addresses"
                detail={
                  customer?.addresses.length
                    ? `${customer.addresses.length} saved`
                    : 'Add one for faster checkout'
                }
                icon="home"
                onPress={() => router.push('/addresses')}
              />
              <MenuRow label="Profile" icon="user" onPress={() => router.push('/profile')} />
            </>
          ) : null}
          <MenuRow
            label="Wishlist"
            detail={savedCount > 0 ? `${savedCount} saved` : 'Nothing saved yet'}
            icon="heart"
            onPress={() => router.push('/(tabs)/wishlist')}
          />
          <MenuRow label="Notifications" icon="bell" onPress={() => router.push('/notifications')} />
        </View>

        <Text variant="eyebrow" tone="muted" uppercase style={styles.groupLabel}>
          Support
        </Text>
        <View style={styles.group}>
          <MenuRow
            label="Contact us"
            detail={env.supportEmail}
            icon="external"
            onPress={() => void Linking.openURL(`mailto:${env.supportEmail}`)}
          />
          <MenuRow
            label="Shipping & returns"
            icon="external"
            onPress={() => void Linking.openURL(`${env.storefrontUrl}/policies/refund-policy`)}
          />
          <MenuRow
            label="Privacy policy"
            icon="external"
            onPress={() => void Linking.openURL(`${env.storefrontUrl}/policies/privacy-policy`)}
          />
          <MenuRow
            label="Terms of service"
            icon="external"
            onPress={() => void Linking.openURL(`${env.storefrontUrl}/policies/terms-of-service`)}
          />
        </View>

        {signedIn ? (
          <Button label="Sign out" variant="ghost" onPress={() => void signOut()} style={styles.signOut} />
        ) : null}

        <Text variant="micro" tone="faint" center style={styles.version}>
          Ownly Club · ownlyclub.in
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xxl },
  identity: { padding: layout.screenPadding, gap: spacing.xxs },
  signInCard: {
    marginHorizontal: layout.screenPadding,
    marginVertical: spacing.lg,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  signInBody: { marginBottom: spacing.md },
  signInActions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  group: {
    marginHorizontal: layout.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  groupLabel: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, gap: 2 },
  signOut: { marginTop: spacing.xl, alignSelf: 'center' },
  version: { marginTop: spacing.lg },
  pressed: { opacity: 0.6 },
});
