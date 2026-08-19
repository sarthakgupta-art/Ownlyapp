import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, layout, spacing } from '@/theme/tokens';

export interface AppHeaderProps {
  title?: string;
  /** Wordmark instead of a title, for the home screen. */
  brand?: boolean;
  showBack?: boolean;
  showSearch?: boolean;
  right?: React.ReactNode;
  subtitle?: string;
  /** Removes the hairline rule, for screens that open on full-bleed imagery. */
  transparent?: boolean;
}

export function AppHeader({
  title,
  brand,
  showBack,
  showSearch,
  right,
  subtitle,
  transparent,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={[styles.header, transparent && styles.transparent]}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={22} strokeWidth={1.2} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        {brand ? (
          <Text variant="wordmark" uppercase>
            Ownly Club
          </Text>
        ) : (
          <>
            <Text variant="heading" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="micro" tone="muted" numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </>
        )}
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {showSearch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => router.push('/search')}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="search" size={19} strokeWidth={1.2} />
          </Pressable>
        ) : null}
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  transparent: { borderBottomWidth: 0, backgroundColor: 'transparent' },
  side: { minWidth: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sideRight: { justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  subtitle: { marginTop: 1 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
