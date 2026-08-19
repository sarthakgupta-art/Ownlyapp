import { StyleSheet, Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, typography } from '@/theme/tokens';

type Variant = keyof typeof typography;
type Tone = 'default' | 'secondary' | 'muted' | 'faint' | 'inverse' | 'accent' | 'danger' | 'success';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  faint: colors.textFaint,
  inverse: colors.textInverse,
  accent: colors.accent,
  danger: colors.danger,
  success: colors.success,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
  uppercase?: boolean;
}

/** Every string in the app renders through here, so type scale stays consistent. */
export function Text({
  variant = 'body',
  tone = 'default',
  center,
  uppercase,
  style,
  ...rest
}: TextProps) {
  const base = typography[variant] as TextStyle;
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: toneColor[tone] },
        center && styles.center,
        uppercase && styles.uppercase,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  uppercase: { textTransform: 'uppercase' },
});
