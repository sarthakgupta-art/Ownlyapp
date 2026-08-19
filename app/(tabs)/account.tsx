import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Divider, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon, type IconName } from '@/components/Icon';
import { useAuth } from '@/store/auth';
import { useWishlist } from '@/store/wishlist';
import { env } from '@/config/env';
import { colors, layout, radius, spacing } from '@/theme/tokens';

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
  const token = useAuth((s) => s.token);
  const logout = useAuth((s) => s.logout);
  const savedCount = useWishlist((s) => s.ids.length);

  const signedIn = token != null;
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');

  return (
    <Screen>
      <AppHeader title="Account" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {signedIn ? (
          <View style={styles.identity}>
            <Text variant="title">{name || 'Welcome back'}</Text>
            {customer?.email ? (
              <Text variant="caption" tone="muted">
                {customer.email}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.signInCard}>
            <Text variant="heading">Sign in to Ownly Club</Text>
            <Text variant="caption" tone="muted" style={styles.signInBody}>
              Track orders, save addresses for a faster checkout, and keep your wishlist across devices.
            </Text>
            <View style={styles.signInActions}>
              <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} style={styles.flex} />
              <Button
                label="Create account"
                variant="secondary"
                onPress={() => router.push('/auth/register')}
                style={styles.flex}
              />
            </View>
          </View>
        )}

        <View style={styles.group}>
          {signedIn ? (
            <>
              <MenuRow label="My orders" icon="bag" onPress={() => router.push('/orders')} />
              <Divider inset={layout.screenPadding} />
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
              <Divider inset={layout.screenPadding} />
              <MenuRow label="Profile" icon="user" onPress={() => router.push('/profile')} />
              <Divider inset={layout.screenPadding} />
            </>
          ) : null}
          <MenuRow
            label="Wishlist"
            detail={savedCount > 0 ? `${savedCount} saved` : 'Nothing saved yet'}
            icon="heart"
            onPress={() => router.push('/(tabs)/wishlist')}
          />
          <Divider inset={layout.screenPadding} />
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
          <Divider inset={layout.screenPadding} />
          <MenuRow
            label="Shipping & returns"
            icon="external"
            onPress={() => void Linking.openURL(`${env.storefrontUrl}/policies/refund-policy`)}
          />
          <Divider inset={layout.screenPadding} />
          <MenuRow
            label="Privacy policy"
            icon="external"
            onPress={() => void Linking.openURL(`${env.storefrontUrl}/policies/privacy-policy`)}
          />
          <Divider inset={layout.screenPadding} />
          <MenuRow
            label="Terms of service"
            icon="external"
            onPress={() => void Linking.openURL(`${env.storefrontUrl}/policies/terms-of-service`)}
          />
        </View>

        {signedIn ? (
          <Button label="Sign out" variant="ghost" onPress={() => void logout()} style={styles.signOut} />
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
    margin: layout.screenPadding,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  signInBody: { marginBottom: spacing.md },
  signInActions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  group: {
    marginHorizontal: layout.screenPadding,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  groupLabel: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
  signOut: { marginTop: spacing.xl, alignSelf: 'center' },
  version: { marginTop: spacing.lg },
  pressed: { opacity: 0.6 },
});
