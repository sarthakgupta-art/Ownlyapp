import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors, layout, radius, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onImage';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  leading?: React.ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
}

const heights: Record<Size, number> = { sm: 38, md: 48, lg: 56 };

/** Squared-off, wide-tracked caps — the register of a boutique, not an app store. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  full = false,
  leading,
  style,
  accessibilityHint,
}: ButtonProps) {
  const inert = disabled || loading;
  const inverse = variant === 'primary' || variant === 'danger';

  const handlePress = () => {
    if (inert) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={handlePress}
      disabled={inert}
      style={({ pressed }) => [
        styles.base,
        { height: Math.max(heights[size], layout.minTapTarget) },
        variantStyles[variant],
        full && styles.full,
        pressed && !inert && styles.pressed,
        inert && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={inverse ? colors.onPrimary : colors.text} size="small" />
      ) : (
        <View style={styles.content}>
          {leading}
          <Text variant="button" tone={inverse || variant === 'onImage' ? 'inverse' : 'default'} uppercase>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.text },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  // Sits over photography; the hairline keeps it legible on a busy image.
  onImage: { backgroundColor: 'rgba(17,17,17,0.55)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.6)' },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  full: { alignSelf: 'stretch' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.35 },
});
