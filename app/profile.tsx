import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { EmptyState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { updateCustomer } from '@/shopify/api';
import { describeError } from '@/shopify/client';
import { useAuth } from '@/store/auth';
import { validateRequired } from '@/lib/validate';
import { layout, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const customer = useAuth((s) => s.customer);
  const ready = useAuth((s) => s.ready);
  const refreshCustomer = useAuth((s) => s.refreshCustomer);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Seed the form once the customer arrives, without clobbering edits in flight.
  useEffect(() => {
    if (!customer) return;
    setFirstName((current) => current || (customer.firstName ?? ''));
    setLastName((current) => current || (customer.lastName ?? ''));
    setPhone((current) => current || (customer.phone ?? ''));
  }, [customer]);

  const save = async () => {
    if (!token) return;
    const next = { firstName: validateRequired(firstName, 'First name') };
    setErrors(next);
    if (next.firstName) return;

    setSaving(true);
    try {
      await updateCustomer(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Shopify rejects an empty string here, so omit the field entirely.
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      await refreshCustomer();
      Alert.alert('Saved', 'Your details have been updated.');
    } catch (error) {
      Alert.alert('Could not save', describeError(error));
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <Screen>
        <AppHeader title="Profile" showBack />
        <Loading />
      </Screen>
    );
  }

  if (!token) {
    return (
      <Screen>
        <AppHeader title="Profile" showBack />
        <EmptyState
          title="Sign in to edit your profile"
          actionLabel="Sign in"
          onAction={() => router.push('/auth/sign-in')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Profile" showBack />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <Field
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            error={errors.firstName}
            style={styles.flex}
          />
          <Field label="Last name" value={lastName} onChangeText={setLastName} style={styles.flex} />
        </View>

        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          hint="Used for delivery updates."
        />

        <View style={styles.readOnly}>
          <Text variant="micro" tone="muted" uppercase>
            Email
          </Text>
          <Text variant="body">{customer?.email ?? '—'}</Text>
          <Text variant="micro" tone="muted">
            To change your email, contact support.
          </Text>
        </View>

        <Button label="Save changes" full loading={saving} onPress={() => void save()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: layout.screenPadding, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  readOnly: { gap: spacing.xs },
});
