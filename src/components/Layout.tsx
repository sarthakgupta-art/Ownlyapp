import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Button } from './Button';
import { Icon } from './Icon';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export function Screen({
  children,
  edges = ['top'],
  padded = false,
  style,
  ...rest
}: ViewProps & { edges?: Edge[]; padded?: boolean }) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      <View {...rest} style={[styles.flex, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Row({ children, gap = spacing.sm, style, ...rest }: ViewProps & { gap?: number }) {
  return (
    <View {...rest} style={[styles.row, { gap }, style]}>
      {children}
    </View>
  );
}

export function Spacer({ size = spacing.lg }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginHorizontal: inset }]} />;
}

/** Section header with an optional "See all" affordance. */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <Text variant="eyebrow" tone="muted" uppercase>
            {actionLabel}
          </Text>
          <Icon name="chevron-right" size={13} strokeWidth={1.2} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.text} />
      {label ? (
        <Text variant="caption" tone="muted" style={styles.centeredLabel}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text variant="title" center>
        {title}
      </Text>
      {body ? (
        <Text variant="caption" tone="muted" center style={styles.emptyBody}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text variant="title" center>
        Something went wrong
      </Text>
      <Text variant="caption" tone="muted" center style={styles.emptyBody}>
        {message}
      </Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" style={styles.emptyAction} /> : null}
    </View>
  );
}

/** Scroll container with pull-to-refresh wired up. */
export function RefreshableScroll({
  refreshing,
  onRefresh,
  children,
  contentContainerStyle,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  contentContainerStyle?: ViewProps['style'];
}) {
  return (
    <ScrollView
      contentContainerStyle={contentContainerStyle}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  count,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
}) {
  const content = (
    <View style={[styles.chip, selected && styles.chipSelected]}>
      <Text variant="eyebrow" tone={selected ? 'inverse' : 'secondary'} uppercase>
        {label}
        {count != null ? `  ${count}` : ''}
      </Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'danger' | 'neutral' }) {
  const borderColor = tone === 'danger' ? colors.danger : tone === 'neutral' ? colors.borderStrong : colors.accent;
  const textTone = tone === 'danger' ? 'danger' : tone === 'neutral' ? 'muted' : 'accent';
  return (
    <View style={[styles.badge, { borderColor }]}>
      <Text variant="eyebrow" tone={textTone} uppercase>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  padded: { paddingHorizontal: layout.screenPadding },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionSubtitle: { marginTop: spacing.xxs },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  centeredLabel: { marginTop: spacing.sm },
  emptyBody: { maxWidth: 320 },
  emptyAction: { marginTop: spacing.xl },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: 'transparent',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.7 },
});
