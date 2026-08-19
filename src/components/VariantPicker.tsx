import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Chip } from './Layout';
import type { Product, ProductVariant } from '@/shopify/types';
import { spacing } from '@/theme/tokens';

export interface VariantPickerProps {
  product: Product;
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

/**
 * Option-by-option variant selection.
 *
 * Values that no in-stock variant can reach given the other selections are
 * still shown but marked, rather than hidden — a buyer looking for 100ml should
 * learn it is sold out, not silently fail to find it.
 */
export function VariantPicker({ product, selected, onSelect }: VariantPickerProps) {
  // A lone "Default Title" option is Shopify's placeholder for a product with
  // no real variants, and showing it would be meaningless.
  const meaningful = product.options.filter(
    (option) => !(option.optionValues.length === 1 && option.optionValues[0]?.name === 'Default Title'),
  );
  if (meaningful.length === 0) return null;

  const pick = (optionName: string, value: string) => {
    const desired = new Map(
      (selected?.selectedOptions ?? []).map((o) => [o.name, o.value] as const),
    );
    desired.set(optionName, value);

    // Prefer an exact match on every option; fall back to the best partial
    // match so changing one option never leaves the picker with no selection.
    const exact = product.variants.find((variant) =>
      variant.selectedOptions.every((o) => desired.get(o.name) === o.value),
    );
    if (exact) {
      onSelect(exact);
      return;
    }
    const partial = product.variants.find((variant) =>
      variant.selectedOptions.some((o) => o.name === optionName && o.value === value),
    );
    if (partial) onSelect(partial);
  };

  const isAvailable = (optionName: string, value: string): boolean =>
    product.variants.some(
      (variant) =>
        variant.availableForSale &&
        variant.selectedOptions.some((o) => o.name === optionName && o.value === value),
    );

  return (
    <View style={styles.container}>
      {meaningful.map((option) => {
        const current = selected?.selectedOptions.find((o) => o.name === option.name)?.value;
        return (
          <View key={option.id} style={styles.group}>
            <Text variant="eyebrow" tone="muted" uppercase>
              {option.name}
            </Text>
            <View style={styles.values}>
              {option.optionValues.map((value) => {
                const available = isAvailable(option.name, value.name);
                return (
                  <Chip
                    key={value.id}
                    label={available ? value.name : `${value.name} — sold out`}
                    selected={current === value.name}
                    onPress={() => pick(option.name, value.name)}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  group: { gap: spacing.sm },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
