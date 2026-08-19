import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { EmptyState, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { useAuth } from '@/store/auth';
import { describeError } from '@/shopify/client';
import { validateEmail } from '@/lib/validate';
import { layout, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const recover = useAuth((s) => s.recover);
  const busy = useAuth((s) => s.busy);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError) return;
    try {
      await recover(email);
      setSent(true);
    } catch (err) {
      setError(describeError(err));
    }
  };

  if (sent) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AppHeader title="Check your email" showBack />
        <EmptyState
          title="Reset link sent"
          body={`If an account exists for ${email.trim()}, a password reset link is on its way.`}
          actionLabel="Back to sign in"
          onAction={() => router.replace('/auth/sign-in')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <AppHeader title="Reset password" showBack />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="body" tone="muted">
          Enter your email and we will send a link to set a new password.
        </Text>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          onSubmitEditing={() => void submit()}
          returnKeyType="send"
        />
        <Button label="Send reset link" full loading={busy} onPress={() => void submit()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: layout.screenPadding, gap: spacing.lg },
});
