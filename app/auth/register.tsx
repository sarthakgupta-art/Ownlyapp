import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { describeError } from '@/shopify/client';
import { validateEmail, validatePassword, validateRequired } from '@/lib/validate';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const busy = useAuth((s) => s.busy);
  const attachCustomer = useCart((s) => s.attachCustomer);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketing, setMarketing] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    const next = {
      firstName: validateRequired(firstName, 'First name'),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;

    try {
      await register({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        acceptsMarketing: marketing,
      });
      const token = useAuth.getState().token;
      if (token) await attachCustomer(token);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/account');
    } catch (error) {
      setFormError(describeError(error));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <AppHeader title="Create account" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.nameRow}>
            <Field
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              error={errors.firstName}
              autoComplete="given-name"
              textContentType="givenName"
              style={styles.flex}
            />
            <Field
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
              textContentType="familyName"
              style={styles.flex}
            />
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            hint="At least 5 characters."
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marketing }}
            accessibilityLabel="Email me about new arrivals and offers"
            onPress={() => setMarketing((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, marketing && styles.checkboxOn]}>
              {marketing ? <Icon name="check" size={13} color={colors.onPrimary} strokeWidth={2.4} /> : null}
            </View>
            <Text variant="caption" tone="secondary" style={styles.flex}>
              Email me about new arrivals and members-only offers.
            </Text>
          </Pressable>

          {formError ? (
            <Text variant="caption" tone="danger">
              {formError}
            </Text>
          ) : null}

          <Button label="Create account" full loading={busy} onPress={() => void submit()} style={styles.submit} />

          <View style={styles.footer}>
            <Text variant="caption" tone="muted">
              Already have an account?
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/sign-in')} hitSlop={8}>
              <Text variant="caption" tone="accent">
                Sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: layout.screenPadding, gap: spacing.lg },
  nameRow: { flexDirection: 'row', gap: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  submit: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl },
});
