import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { describeError } from '@/shopify/client';
import { validateEmail, validatePassword } from '@/lib/validate';
import { layout, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const busy = useAuth((s) => s.busy);
  const attachCustomer = useCart((s) => s.attachCustomer);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    setFormError(null);
    if (emailError || passwordError) return;

    try {
      await login(email, password);
      // Linking the session to the existing cart is what makes checkout open
      // pre-filled for someone who signed in after filling their bag.
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
      <AppHeader title="Sign in" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text variant="body" tone="muted">
            Use the same account as ownlyclub.in.
          </Text>

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
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />

          {formError ? (
            <Text variant="caption" tone="danger">
              {formError}
            </Text>
          ) : null}

          <Button label="Sign in" full loading={busy} onPress={() => void submit()} style={styles.submit} />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/forgot-password')}
            hitSlop={8}
            style={styles.link}
          >
            <Text variant="caption" tone="accent">
              Forgot your password?
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Text variant="caption" tone="muted">
              New to Ownly Club?
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/register')} hitSlop={8}>
              <Text variant="caption" tone="accent">
                Create an account
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
  submit: { marginTop: spacing.sm },
  link: { alignSelf: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl },
});
