import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, layout, spacing } from '@/theme/tokens';

export interface AppHeaderProps {
  title?: string;
  /** Wordmark instead of a plain title, for the home screen. */
  brand?: boolean;
  showBack?: boolean;
  showSearch?: boolean;
  right?: React.ReactNode;
  subtitle?: string;
}

export function AppHeader({ title, brand, showBack, showSearch, right, subtitle }: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            hitSlop={10}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={24} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        {brand ? (
          <Text variant="eyebrow" style={styles.wordmark}>
            OWNLY CLUB
          </Text>
        ) : (
          <>
            <Text variant="heading" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="micro" tone="muted" numberOfLines={1}>
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
            hitSlop={10}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="search" size={21} />
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
    backgroundColor: colors.surface,
  },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sideRight: { justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  wordmark: { letterSpacing: 3 },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
