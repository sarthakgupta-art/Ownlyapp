import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Icon } from './Icon';
import { Badge } from './Layout';
import { useWishlist } from '@/store/wishlist';
import { discountPercent, formatMoney } from '@/lib/format';
import type { ProductSummary } from '@/shopify/types';
import { colors, radius, spacing } from '@/theme/tokens';

const BLUR_PLACEHOLDER = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';

export interface ProductCardProps {
  product: ProductSummary;
  /** Fixed width for horizontal rails; omit inside a flex grid. */
  width?: number;
  /** Short "why this matched" line from the finder. */
  reason?: string;
}

function ProductCardComponent({ product, width, reason }: ProductCardProps) {
  const router = useRouter();
  const saved = useWishlist((s) => s.ids.includes(product.id));
  const toggle = useWishlist((s) => s.toggle);

  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.maxVariantPrice;
  const off = discountPercent(price, compareAt);
  const rangeHigh = product.priceRange.maxVariantPrice;
  const hasRange = rangeHigh.amount !== price.amount;

  const open = useCallback(() => {
    router.push({ pathname: '/product/[handle]', params: { handle: product.handle } });
  }, [router, product.handle]);

  const onToggleSave = useCallback(() => {
    void toggle(product.id);
  }, [toggle, product.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.vendor} ${product.title}, ${formatMoney(price)}`}
      onPress={open}
      style={({ pressed }) => [styles.card, width != null && { width }, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={product.featuredImage?.url}
          placeholder={BLUR_PLACEHOLDER}
          contentFit="cover"
          transition={180}
          style={styles.image}
          accessibilityIgnoresInvertColors
          alt={product.featuredImage?.altText ?? product.title}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
          accessibilityState={{ selected: saved }}
          onPress={onToggleSave}
          hitSlop={10}
          style={styles.saveButton}
        >
          <Icon
            name={saved ? 'heart-filled' : 'heart'}
            size={18}
            color={saved ? colors.danger : colors.text}
          />
        </Pressable>

        {!product.availableForSale ? (
          <View style={styles.soldOut}>
            <Text variant="micro" tone="inverse" uppercase>
              Sold out
            </Text>
          </View>
        ) : off != null ? (
          <View style={styles.badgeSlot}>
            <Badge label={`${off}% off`} />
          </View>
        ) : null}
      </View>

      <Text variant="eyebrow" tone="muted" numberOfLines={1} style={styles.vendor}>
        {product.vendor}
      </Text>
      <Text variant="caption" numberOfLines={2} style={styles.title}>
        {product.title}
      </Text>

      <View style={styles.priceRow}>
        <Text variant="bodyStrong">
          {hasRange ? `From ${formatMoney(price)}` : formatMoney(price)}
        </Text>
        {off != null ? (
          <Text variant="caption" tone="faint" style={styles.strike}>
            {formatMoney(compareAt)}
          </Text>
        ) : null}
      </View>

      {reason ? (
        <Text variant="micro" tone="accent" numberOfLines={1} style={styles.reason}>
          {reason}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Memoised because product grids re-render on every wishlist change, and the
 * card subscribes to its own saved state anyway.
 */
export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: { gap: spacing.xxs },
  pressed: { opacity: 0.85 },
  imageWrap: {
    aspectRatio: 0.82,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunk,
    marginBottom: spacing.sm,
  },
  image: { width: '100%', height: '100%' },
  saveButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  badgeSlot: { position: 'absolute', left: spacing.sm, top: spacing.sm },
  soldOut: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  vendor: { marginTop: spacing.xxs },
  title: { minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  strike: { textDecorationLine: 'line-through' },
  reason: { marginTop: spacing.xxs },
});
