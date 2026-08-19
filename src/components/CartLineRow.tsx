import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Icon } from './Icon';
import { formatMoney } from '@/lib/format';
import type { CartLine } from '@/shopify/types';
import { colors, radius, spacing } from '@/theme/tokens';

export interface CartLineRowProps {
  line: CartLine;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function CartLineRow({ line, onChangeQuantity, onRemove, disabled }: CartLineRowProps) {
  const router = useRouter();
  const { merchandise } = line;
  const image = merchandise.image ?? merchandise.product.featuredImage;
  // Variant titles are "Default Title" for single-variant products, which is
  // noise on a cart row.
  const variantLabel =
    merchandise.title && merchandise.title !== 'Default Title' ? merchandise.title : null;

  const atStockLimit =
    merchandise.quantityAvailable != null && line.quantity >= merchandise.quantityAvailable;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${merchandise.product.title}`}
        onPress={() =>
          router.push({ pathname: '/product/[handle]', params: { handle: merchandise.product.handle } })
        }
      >
        <Image
          source={image?.url}
          contentFit="cover"
          transition={150}
          style={styles.image}
          alt={merchandise.product.title}
        />
      </Pressable>

      <View style={styles.details}>
        <Text variant="eyebrow" tone="muted" numberOfLines={1}>
          {merchandise.product.vendor}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {merchandise.product.title}
        </Text>
        {variantLabel ? (
          <Text variant="micro" tone="muted">
            {variantLabel}
          </Text>
        ) : null}

        {!merchandise.availableForSale ? (
          <Text variant="micro" tone="danger" style={styles.stockNote}>
            Out of stock — remove to check out
          </Text>
        ) : null}

        <View style={styles.controls}>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              disabled={disabled}
              onPress={() => onChangeQuantity(line.quantity - 1)}
              hitSlop={6}
              style={styles.stepperButton}
            >
              <Icon name="minus" size={15} color={disabled ? colors.textFaint : colors.text} />
            </Pressable>
            <Text variant="caption" style={styles.quantity}>
              {line.quantity}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              disabled={disabled || atStockLimit}
              onPress={() => onChangeQuantity(line.quantity + 1)}
              hitSlop={6}
              style={styles.stepperButton}
            >
              <Icon name="plus" size={15} color={disabled || atStockLimit ? colors.textFaint : colors.text} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${merchandise.product.title} from bag`}
            onPress={onRemove}
            disabled={disabled}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Icon name="trash" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.priceColumn}>
        <Text variant="bodyStrong">{formatMoney(line.cost.totalAmount)}</Text>
        {line.cost.compareAtAmountPerQuantity ? (
          <Text variant="micro" tone="faint" style={styles.strike}>
            {formatMoney(line.cost.compareAtAmountPerQuantity)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  image: { width: 78, height: 96, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  details: { flex: 1, gap: spacing.xxs },
  stockNote: { marginTop: spacing.xxs },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  stepperButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  quantity: { minWidth: 20, textAlign: 'center' },
  priceColumn: { alignItems: 'flex-end', gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  pressed: { opacity: 0.6 },
});
