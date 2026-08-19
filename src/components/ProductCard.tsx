import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Icon } from './Icon';
import { useWishlist } from '@/store/wishlist';
import { discountPercent, formatMoney } from '@/lib/format';
import type { ProductSummary } from '@/shopify/types';
import { colors, layout, spacing } from '@/theme/tokens';

const BLUR_PLACEHOLDER = 'L9Ec:%00~q9F00_3IUM{00Rj%MRj';

export interface ProductCardProps {
  product: ProductSummary;
  /** Fixed width for horizontal rails; omit inside a flex grid. */
  width?: number;
  /** Short "why this matched" line from the finder. */
  reason?: string;
}

/**
 * Editorial product card: full-bleed portrait image, then quiet metadata
 * beneath it. Nothing sits on top of the photograph except the save control and
 * a sold-out rule, because badges and price chips over imagery are what makes a
 * grid read as a marketplace rather than a boutique.
 */
function ProductCardComponent({ product, width, reason }: ProductCardProps) {
  const router = useRouter();
  const saved = useWishlist((s) => s.ids.includes(product.id));
  const toggle = useWishlist((s) => s.toggle);

  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.maxVariantPrice;
  const off = discountPercent(price, compareAt);
  const hasRange = product.priceRange.maxVariantPrice.amount !== price.amount;

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
          transition={220}
          style={styles.image}
          accessibilityIgnoresInvertColors
          alt={product.featuredImage?.altText ?? product.title}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
          accessibilityState={{ selected: saved }}
          onPress={onToggleSave}
          hitSlop={12}
          style={styles.saveButton}
        >
          <Icon
            name={saved ? 'heart-filled' : 'heart'}
            size={17}
            strokeWidth={1.2}
            color={saved ? colors.danger : colors.text}
          />
        </Pressable>

        {!product.availableForSale ? (
          <View style={styles.soldOut}>
            <Text variant="micro" tone="inverse" uppercase style={styles.soldOutLabel}>
              Sold out
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="eyebrow" tone="muted" numberOfLines={1} uppercase style={styles.vendor}>
        {product.vendor}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.title}>
        {product.title}
      </Text>

      <View style={styles.priceRow}>
        <Text variant="captionStrong">{hasRange ? `From ${formatMoney(price)}` : formatMoney(price)}</Text>
        {off != null ? (
          <Text variant="micro" tone="faint" style={styles.strike}>
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

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: { gap: 1 },
  pressed: { opacity: 0.9 },
  imageWrap: {
    aspectRatio: layout.productAspect,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunk,
    marginBottom: spacing.md,
  },
  image: { width: '100%', height: '100%' },
  saveButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOut: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.scrim,
  },
  soldOutLabel: { letterSpacing: 1.4 },
  vendor: { marginTop: spacing.xxs },
  title: { minHeight: 36, marginTop: spacing.xxs },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xxs },
  strike: { textDecorationLine: 'line-through' },
  reason: { marginTop: spacing.xs },
});
