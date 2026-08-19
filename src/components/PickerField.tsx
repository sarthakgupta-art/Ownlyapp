import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { Divider } from './Layout';
import { AppHeader } from './AppHeader';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export interface PickerOption {
  value: string;
  label: string;
}

export interface PickerFieldProps {
  label: string;
  value: string | null;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  /** Show a search box once the list is long enough to need one. */
  searchable?: boolean;
}

/** A labelled select. Opens a searchable full-screen list on tap. */
export function PickerField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  error,
  searchable = true,
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const cleaned = term.trim().toLowerCase();
    if (!cleaned) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(cleaned) || o.value.toLowerCase().includes(cleaned),
    );
  }, [options, term]);

  return (
    <View style={styles.container}>
      <Text variant="micro" tone="muted" uppercase>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected ? selected.label : placeholder}`}
        onPress={() => {
          setTerm('');
          setOpen(true);
        }}
        style={({ pressed }) => [styles.control, error ? styles.controlError : null, pressed && styles.pressed]}
      >
        <Text variant="body" tone={selected ? 'default' : 'faint'} style={styles.flex} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevron-right" size={17} color={colors.textFaint} />
      </Pressable>
      {error ? (
        <Text variant="micro" tone="danger">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <AppHeader
            title={label}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} hitSlop={10}>
                <Icon name="close" size={22} />
              </Pressable>
            }
          />
          {searchable ? (
            <View style={styles.searchWrap}>
              <Icon name="search" size={17} color={colors.textMuted} />
              <TextInput
                value={term}
                onChangeText={setTerm}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor={colors.textFaint}
                style={styles.search}
                autoCorrect={false}
                accessibilityLabel={`Search ${label}`}
              />
            </View>
          ) : null}
          <Divider />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === value }}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text variant="body" style={styles.flex}>
                  {item.label}
                </Text>
                {item.value === value ? <Icon name="check" size={18} color={colors.accent} /> : null}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <Divider inset={layout.screenPadding} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  flex: { flex: 1 },
  control: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  controlError: { borderColor: colors.danger },
  sheet: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: layout.screenPadding,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  search: { flex: 1, color: colors.text, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
  },
  pressed: { opacity: 0.6 },
});
