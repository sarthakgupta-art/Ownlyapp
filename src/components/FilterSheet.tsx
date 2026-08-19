import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Icon } from './Icon';
import { Chip, Divider } from './Layout';
import { filterableAttributes } from '@/catalog/attributes';
import { countActiveFilters, emptyFilters, type ActiveFilters } from '@/catalog/query';
import type { Department } from '@/catalog/types';
import type { SortOption } from '@/shopify/types';
import { colors, fonts, layout, radius, spacing } from '@/theme/tokens';

export const sortOptions: SortOption[] = [
  { id: 'featured', label: 'Featured', sortKey: 'BEST_SELLING', reverse: false },
  { id: 'newest', label: 'Newest first', sortKey: 'CREATED_AT', reverse: true },
  { id: 'price-asc', label: 'Price: low to high', sortKey: 'PRICE', reverse: false },
  { id: 'price-desc', label: 'Price: high to low', sortKey: 'PRICE', reverse: true },
  { id: 'title', label: 'A – Z', sortKey: 'TITLE', reverse: false },
];

export interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  department: Department;
  /** Values present in the current result set, so no filter returns nothing. */
  facets: Record<string, { value: string; count: number }[]>;
  filters: ActiveFilters;
  onApply: (filters: ActiveFilters, sort: SortOption) => void;
  sort: SortOption;
}

/** How many values to show per attribute before "show all". */
const COLLAPSED_VALUES = 8;

export function FilterSheet({
  visible,
  onClose,
  department,
  facets,
  filters,
  onApply,
  sort,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<ActiveFilters>(filters);
  const [draftSort, setDraftSort] = useState<SortOption>(sort);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Reset the draft whenever the sheet opens, so a cancelled edit is discarded.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(filters);
      setDraftSort(sort);
    }
  }

  const attributes = useMemo(() => filterableAttributes(department), [department]);
  const activeCount = countActiveFilters(draft);

  const toggleValue = (key: string, value: string) => {
    setDraft((current) => {
      const selected = current.values[key] ?? [];
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      const values = { ...current.values, [key]: next };
      if (next.length === 0) delete values[key];
      return { ...current, values };
    });
  };

  const setPrice = (field: 'priceMin' | 'priceMax', raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    setDraft((current) => ({ ...current, [field]: digits ? Number(digits) : undefined }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close filters" />
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <Text variant="title">Filter &amp; sort</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} />
            </Pressable>
          </View>
          <Divider />

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text variant="eyebrow" tone="muted" uppercase>
              Sort by
            </Text>
            <View style={styles.chipWrap}>
              {sortOptions.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={option.id === draftSort.id}
                  onPress={() => setDraftSort(option)}
                />
              ))}
            </View>

            <Divider />

            <Text variant="eyebrow" tone="muted" uppercase style={styles.groupLabel}>
              Price
            </Text>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text variant="micro" tone="muted">
                  Min
                </Text>
                <TextInput
                  value={draft.priceMin != null ? String(draft.priceMin) : ''}
                  onChangeText={(text) => setPrice('priceMin', text)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  accessibilityLabel="Minimum price"
                />
              </View>
              <View style={styles.priceField}>
                <Text variant="micro" tone="muted">
                  Max
                </Text>
                <TextInput
                  value={draft.priceMax != null ? String(draft.priceMax) : ''}
                  onChangeText={(text) => setPrice('priceMax', text)}
                  keyboardType="number-pad"
                  placeholder="Any"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  accessibilityLabel="Maximum price"
                />
              </View>
            </View>

            <Chip
              label="In stock only"
              selected={draft.inStockOnly === true}
              onPress={() => setDraft((c) => ({ ...c, inStockOnly: !c.inStockOnly }))}
            />

            {attributes.map((spec) => {
              const values = facets[spec.key] ?? [];
              if (values.length === 0) return null;
              const isExpanded = expanded[spec.key] === true;
              const shown = isExpanded ? values : values.slice(0, COLLAPSED_VALUES);
              const selected = draft.values[spec.key] ?? [];

              return (
                <View key={spec.key}>
                  <Divider />
                  <Text variant="eyebrow" tone="muted" uppercase style={styles.groupLabel}>
                    {spec.label}
                  </Text>
                  <View style={styles.chipWrap}>
                    {shown.map((entry) => (
                      <Chip
                        key={entry.value}
                        label={entry.value}
                        count={entry.count}
                        selected={selected.includes(entry.value)}
                        onPress={() => toggleValue(spec.key, entry.value)}
                      />
                    ))}
                  </View>
                  {values.length > COLLAPSED_VALUES ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setExpanded((c) => ({ ...c, [spec.key]: !isExpanded }))}
                      hitSlop={8}
                    >
                      <Text variant="eyebrow" tone="muted" uppercase style={styles.showAll}>
                        {isExpanded ? 'Show fewer' : `Show all ${values.length}`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Clear"
              variant="ghost"
              onPress={() => {
                setDraft(emptyFilters);
                setDraftSort(sortOptions[0]!);
              }}
              disabled={activeCount === 0 && draftSort.id === sortOptions[0]!.id}
            />
            <Button
              label={activeCount > 0 ? `Apply (${activeCount})` : 'Apply'}
              onPress={() => {
                onApply(draft, draftSort);
                onClose();
              }}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Compact bar that opens the sheet and shows the active filter count. */
export function FilterBar({
  resultLabel,
  activeCount,
  sortLabel,
  onPress,
}: {
  resultLabel: string;
  activeCount: number;
  sortLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Text variant="caption" tone="muted">
        {resultLabel}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filter and sort. Currently ${sortLabel}${activeCount > 0 ? `, ${activeCount} filters active` : ''}`}
        onPress={onPress}
        style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}
      >
        <Icon name="filter" size={17} />
        <Text variant="caption">{activeCount > 0 ? `Filter (${activeCount})` : 'Filter & sort'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: layout.screenPadding,
  },
  body: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.xxl },
  groupLabel: { marginTop: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  priceRow: { flexDirection: 'row', gap: spacing.md },
  priceField: { flex: 1, gap: spacing.xxs },
  input: {
    height: 46,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  showAll: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  applyButton: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  barButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.6 },
});
