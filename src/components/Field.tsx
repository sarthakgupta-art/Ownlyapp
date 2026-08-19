import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Labelled text input used by every form in the app. */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, style, ...rest },
  ref,
) {
  return (
    <View style={styles.container}>
      <Text variant="micro" tone="muted" uppercase>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <Text variant="micro" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="micro" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    height: 50,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    backgroundColor: colors.backgroundAlt,
  },
  inputError: { borderColor: colors.danger },
});
