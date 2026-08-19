import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PickerField } from '@/components/PickerField';
import { Badge, Divider, EmptyState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from '@/customer/api';
import { describeCustomerError } from '@/customer/client';
import type { AddressInput, CustomerAddress } from '@/customer/types';
import { useAuth } from '@/store/auth';
import { DEFAULT_TERRITORY_CODE, INDIAN_REGIONS, isValidRegionCode, regionName } from '@/lib/regions';
import { validatePhone, validatePincode, validateRequired } from '@/lib/validate';
import { colors, layout, radius, spacing } from '@/theme/tokens';

const EMPTY_FORM: AddressInput = {
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  zoneCode: '',
  territoryCode: DEFAULT_TERRITORY_CODE,
  zip: '',
  phoneNumber: '',
};

const REGION_OPTIONS = INDIAN_REGIONS.map((r) => ({ value: r.code, label: r.name }));

function formatAddress(address: CustomerAddress): string {
  return [
    address.address1,
    address.address2,
    address.city,
    regionName(address.zoneCode),
    address.zip,
  ]
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

  // Reseed whenever the sheet opens, so editing address A then B does not show
  // A's values.
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
              zoneCode: initial.zoneCode ?? '',
              territoryCode: initial.territoryCode ?? DEFAULT_TERRITORY_CODE,
              zip: initial.zip ?? '',
              phoneNumber: initial.phoneNumber ?? '',
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
      zoneCode: isValidRegionCode(form.zoneCode) ? null : 'Select a state.',
      zip: validatePincode(form.zip ?? ''),
      phoneNumber: validatePhone(form.phoneNumber ?? ''),
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
              autoComplete="given-name"
              style={styles.flex}
            />
            <Field
              label="Last name"
              value={form.lastName ?? ''}
              onChangeText={set('lastName')}
              autoComplete="family-name"
              style={styles.flex}
            />
          </View>

          <Field
            label="Address"
            value={form.address1 ?? ''}
            onChangeText={set('address1')}
            error={errors.address1}
            placeholder="House / flat, building, street"
            autoComplete="street-address"
          />
          <Field
            label="Landmark (optional)"
            value={form.address2 ?? ''}
            onChangeText={set('address2')}
            placeholder="Area, landmark"
          />

          <View style={styles.row}>
            <Field
              label="City"
              value={form.city ?? ''}
              onChangeText={set('city')}
              error={errors.city}
              style={styles.flex}
            />
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

          <PickerField
            label="State"
            value={form.zoneCode ?? null}
            options={REGION_OPTIONS}
            onChange={set('zoneCode')}
            error={errors.zoneCode}
            placeholder="Select a state"
          />

          <Field
            label="Phone"
            value={form.phoneNumber ?? ''}
            onChangeText={set('phoneNumber')}
            error={errors.phoneNumber}
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
  const accessToken = useAuth((s) => s.accessToken);
  const getValidToken = useAuth((s) => s.getValidToken);
  const customer = useAuth((s) => s.customer);
  const ready = useAuth((s) => s.ready);
  const refreshCustomer = useAuth((s) => s.refreshCustomer);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (values: AddressInput) => {
      setSaving(true);
      try {
        const token = await getValidToken();
        if (!token) throw new Error('Your session has expired. Please sign in again.');

        if (editing) await updateAddress(token, editing.id, values);
        // The very first address a buyer saves should become their default,
        // otherwise checkout has nothing to pre-fill.
        else await createAddress(token, values, (customer?.addresses.length ?? 0) === 0);

        await refreshCustomer();
        setFormOpen(false);
        setEditing(null);
      } catch (error) {
        Alert.alert('Could not save', describeCustomerError(error));
      } finally {
        setSaving(false);
      }
    },
    [getValidToken, editing, refreshCustomer, customer?.addresses.length],
  );

  const remove = useCallback(
    (address: CustomerAddress) => {
      Alert.alert('Delete address?', formatAddress(address), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const token = await getValidToken();
                if (!token) throw new Error('Your session has expired. Please sign in again.');
                await deleteAddress(token, address.id);
                await refreshCustomer();
              } catch (error) {
                Alert.alert('Could not delete', describeCustomerError(error));
              }
            })();
          },
        },
      ]);
    },
    [getValidToken, refreshCustomer],
  );

  const makeDefault = useCallback(
    async (address: CustomerAddress) => {
      try {
        const token = await getValidToken();
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        await setDefaultAddress(token, address);
        await refreshCustomer();
      } catch (error) {
        Alert.alert('Could not update', describeCustomerError(error));
      }
    },
    [getValidToken, refreshCustomer],
  );

  if (!ready) {
    return (
      <Screen>
        <AppHeader title="Addresses" showBack />
        <Loading />
      </Screen>
    );
  }

  if (!accessToken) {
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
          <EmptyState title="No saved addresses" body="Add one now and checkout will be pre-filled next time." />
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
              {address.phoneNumber ? (
                <Text variant="caption" tone="muted">
                  {address.phoneNumber}
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
