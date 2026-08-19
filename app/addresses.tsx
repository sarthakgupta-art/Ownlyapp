import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Badge, Divider, EmptyState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { createAddress, deleteAddress, setDefaultAddress, updateAddress, type AddressInput } from '@/shopify/api';
import { describeError } from '@/shopify/client';
import { useAuth } from '@/store/auth';
import { validatePhone, validatePincode, validateRequired } from '@/lib/validate';
import type { CustomerAddress } from '@/shopify/types';
import { colors, layout, radius, spacing } from '@/theme/tokens';

const EMPTY_FORM: AddressInput = {
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  zip: '',
  country: 'India',
  phone: '',
};

function formatAddress(address: CustomerAddress): string {
  return [address.address1, address.address2, address.city, address.province, address.zip, address.country]
    .filter(Boolean)
    .join(', ');
}

function AddressForm({
  visible,
  initial,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  initial: CustomerAddress | null;
  onClose: () => void;
  onSave: (values: AddressInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Reload the form whenever the modal opens, so editing address A then B does
  // not show A's values.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setForm(
        initial
          ? {
              firstName: initial.firstName ?? '',
              lastName: initial.lastName ?? '',
              address1: initial.address1 ?? '',
              address2: initial.address2 ?? '',
              city: initial.city ?? '',
              province: initial.province ?? '',
              zip: initial.zip ?? '',
              country: initial.country ?? 'India',
              phone: initial.phone ?? '',
            }
          : EMPTY_FORM,
      );
      setErrors({});
    }
  }

  const set = (key: keyof AddressInput) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    const next: Record<string, string | null> = {
      firstName: validateRequired(form.firstName ?? '', 'First name'),
      address1: validateRequired(form.address1 ?? '', 'Address'),
      city: validateRequired(form.city ?? '', 'City'),
      province: validateRequired(form.province ?? '', 'State'),
      zip: validatePincode(form.zip ?? ''),
      phone: validatePhone(form.phone ?? ''),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen edges={['top', 'bottom']}>
        <AppHeader
          title={initial ? 'Edit address' : 'Add address'}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} />
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <Field
              label="First name"
              value={form.firstName ?? ''}
              onChangeText={set('firstName')}
              error={errors.firstName}
              style={styles.flex}
            />
            <Field label="Last name" value={form.lastName ?? ''} onChangeText={set('lastName')} style={styles.flex} />
          </View>
          <Field
            label="Address"
            value={form.address1 ?? ''}
            onChangeText={set('address1')}
            error={errors.address1}
            placeholder="House / flat, building, street"
          />
          <Field
            label="Landmark (optional)"
            value={form.address2 ?? ''}
            onChangeText={set('address2')}
            placeholder="Area, landmark"
          />
          <View style={styles.row}>
            <Field label="City" value={form.city ?? ''} onChangeText={set('city')} error={errors.city} style={styles.flex} />
            <Field
              label="PIN code"
              value={form.zip ?? ''}
              onChangeText={set('zip')}
              error={errors.zip}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.flex}
            />
          </View>
          <Field label="State" value={form.province ?? ''} onChangeText={set('province')} error={errors.province} />
          <Field label="Country" value={form.country ?? ''} onChangeText={set('country')} />
          <Field
            label="Phone"
            value={form.phone ?? ''}
            onChangeText={set('phone')}
            error={errors.phone}
            keyboardType="phone-pad"
            hint="Used by the courier for delivery updates."
          />
          <Button label="Save address" full loading={saving} onPress={submit} style={styles.save} />
        </ScrollView>
      </Screen>
    </Modal>
  );
}

export default function AddressesScreen() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const customer = useAuth((s) => s.customer);
  const ready = useAuth((s) => s.ready);
  const refreshCustomer = useAuth((s) => s.refreshCustomer);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (values: AddressInput) => {
      if (!token) return;
      setSaving(true);
      try {
        if (editing) await updateAddress(token, editing.id, values);
        else await createAddress(token, values);
        await refreshCustomer();
        setFormOpen(false);
        setEditing(null);
      } catch (error) {
        Alert.alert('Could not save', describeError(error));
      } finally {
        setSaving(false);
      }
    },
    [token, editing, refreshCustomer],
  );

  const remove = useCallback(
    (address: CustomerAddress) => {
      if (!token) return;
      Alert.alert('Delete address?', formatAddress(address), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAddress(token, address.id);
                await refreshCustomer();
              } catch (error) {
                Alert.alert('Could not delete', describeError(error));
              }
            })();
          },
        },
      ]);
    },
    [token, refreshCustomer],
  );

  const makeDefault = useCallback(
    async (address: CustomerAddress) => {
      if (!token) return;
      try {
        await setDefaultAddress(token, address.id);
        await refreshCustomer();
      } catch (error) {
        Alert.alert('Could not update', describeError(error));
      }
    },
    [token, refreshCustomer],
  );

  if (!ready) {
    return (
      <Screen>
        <AppHeader title="Addresses" showBack />
        <Loading />
      </Screen>
    );
  }

  if (!token) {
    return (
      <Screen>
        <AppHeader title="Addresses" showBack />
        <EmptyState
          title="Sign in to manage addresses"
          actionLabel="Sign in"
          onAction={() => router.push('/auth/sign-in')}
        />
      </Screen>
    );
  }

  const addresses = customer?.addresses ?? [];
  const defaultId = customer?.defaultAddress?.id;

  return (
    <Screen>
      <AppHeader title="Addresses" showBack />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <EmptyState
            title="No saved addresses"
            body="Add one now and checkout will be pre-filled next time."
          />
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="bodyStrong">
                  {[address.firstName, address.lastName].filter(Boolean).join(' ') || 'Address'}
                </Text>
                {address.id === defaultId ? <Badge label="Default" /> : null}
              </View>
              <Text variant="caption" tone="secondary">
                {formatAddress(address)}
              </Text>
              {address.phone ? (
                <Text variant="caption" tone="muted">
                  {address.phone}
                </Text>
              ) : null}

              <Divider />
              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEditing(address);
                    setFormOpen(true);
                  }}
                  hitSlop={8}
                >
                  <Text variant="caption" tone="accent">
                    Edit
                  </Text>
                </Pressable>
                {address.id !== defaultId ? (
                  <Pressable accessibilityRole="button" onPress={() => void makeDefault(address)} hitSlop={8}>
                    <Text variant="caption" tone="accent">
                      Set as default
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => remove(address)} hitSlop={8}>
                  <Text variant="caption" tone="danger">
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Button
          label="Add a new address"
          variant="secondary"
          full
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          style={styles.addButton}
        />
      </ScrollView>

      <AddressForm
        visible={formOpen}
        initial={editing}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={(values) => void save(values)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  body: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  formBody: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', gap: spacing.xl, paddingTop: spacing.sm },
  addButton: { marginTop: spacing.sm },
  save: { marginTop: spacing.md },
});
