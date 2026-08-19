import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductRail } from '@/components/ProductRail';
import { VariantPicker } from '@/components/VariantPicker';
import { Badge, Chip, Divider, ErrorState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { specAttributes } from '@/catalog/attributes';
import { useProduct, useRecommendations } from '@/hooks/useCatalog';
import { useCart, findCartLineFor } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { describeError } from '@/shopify/client';
import { discountPercent, formatMoney, htmlToPlainText } from '@/lib/format';
import { env } from '@/config/env';
import type { ProductVariant } from '@/shopify/types';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Below this, show "only N left" to give the buyer a reason to decide. */
const LOW_STOCK_THRESHOLD = 5;

export default function ProductScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();

  const { data: product, department, isLoading, error, refetch } = useProduct(handle);
  const { data: recommendations } = useRecommendations(product?.id);

  const addLine = useCart((s) => s.addLine);
  const cart = useCart((s) => s.cart);
  const mutating = useCart((s) => s.mutating);
  const saved = useWishlist((s) => (product ? s.ids.includes(product.id) : false));
  const toggleSaved = useWishlist((s) => s.toggle);
  const noteViewed = useWishlist((s) => s.noteViewed);

  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Default to the first in-stock variant, so the buy button is live on arrival
  // even when the first listed variant happens to be sold out.
  useEffect(() => {
    if (!product) return;
    setVariant((current) => {
      if (current && product.variants.some((v) => v.id === current.id)) return current;
      return product.variants.find((v) => v.availableForSale) ?? product.variants[0] ?? null;
    });
  }, [product]);

  useEffect(() => {
    if (product) void noteViewed(product.id);
  }, [product, noteViewed]);

  const specs = useMemo(
    () => (product && department ? specAttributes(product, department) : []),
    [product, department],
  );

  const description = useMemo(
    () => (product ? htmlToPlainText(product.descriptionHtml || product.description) : ''),
    [product],
  );

  if (isLoading) {
    return (
      <Screen>
        <AppHeader showBack showSearch />
        <Loading />
      </Screen>
    );
  }

  if (error || !product) {
    return (
      <Screen>
        <AppHeader showBack />
        <ErrorState
          message={error ? describeError(error) : 'That product is no longer available.'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = variant?.compareAtPrice ?? product.compareAtPriceRange.maxVariantPrice;
  const off = discountPercent(price, compareAt);
  const inCart = variant ? findCartLineFor(cart, variant.id) : null;
  const stock = variant?.quantityAvailable ?? null;
  const canBuy = variant?.availableForSale === true;

  const onAdd = async () => {
    if (!variant) return;
    try {
      await addLine(variant.id, 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } catch {
      // The store already recorded the message; the banner below surfaces it.
    }
  };

  const onShare = () => {
    void Share.share({
      message: `${product.vendor} ${product.title} — ${env.storefrontUrl}/products/${product.handle}`,
    });
  };

  return (
    <Screen>
      <AppHeader
        showBack
        showSearch
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={onShare} hitSlop={8}>
            <Icon name="share" size={20} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProductGallery images={product.images} title={product.title} />

        <View style={styles.body}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${product.vendor}`}
            onPress={() => router.push({ pathname: '/search', params: { q: product.vendor } })}
          >
            <Text variant="eyebrow" tone="accent" uppercase>
              {product.vendor}
            </Text>
          </Pressable>

          <Text variant="title" style={styles.title}>
            {product.title}
          </Text>

          <View style={styles.priceRow}>
            <Text variant="title">{formatMoney(price)}</Text>
            {off != null ? (
              <>
                <Text variant="body" tone="faint" style={styles.strike}>
                  {formatMoney(compareAt)}
                </Text>
                <Badge label={`${off}% off`} />
              </>
            ) : null}
          </View>
          <Text variant="micro" tone="muted">
            Inclusive of all taxes
          </Text>

          {!canBuy ? (
            <Text variant="caption" tone="danger" style={styles.stockLine}>
              Currently sold out
            </Text>
          ) : stock != null && stock <= LOW_STOCK_THRESHOLD ? (
            <Text variant="caption" tone="accent" style={styles.stockLine}>
              Only {stock} left
            </Text>
          ) : null}

          <Divider />

          <VariantPicker product={product} selected={variant} onSelect={setVariant} />

          {description ? (
            <>
              <Divider />
              <View style={styles.section}>
                <Text variant="heading">Description</Text>
                <Text
                  variant="body"
                  tone="secondary"
                  numberOfLines={descriptionExpanded ? undefined : 6}
                  style={styles.description}
                >
                  {description}
                </Text>
                {description.length > 300 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDescriptionExpanded((v) => !v)}
                    hitSlop={8}
                  >
                    <Text variant="caption" tone="accent">
                      {descriptionExpanded ? 'Show less' : 'Read more'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          {specs.length > 0 ? (
            <>
              <Divider />
              <View style={styles.section}>
                <Text variant="heading">Details</Text>
                {specs.map(({ spec, values }) =>
                  spec.display === 'chips' ? (
                    <View key={spec.key} style={styles.chipSpec}>
                      <Text variant="caption" tone="muted">
                        {spec.label}
                      </Text>
                      <View style={styles.chipRow}>
                        {values.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View key={spec.key} style={styles.specRow}>
                      <Text variant="caption" tone="muted" style={styles.specLabel}>
                        {spec.label}
                      </Text>
                      <Text variant="caption" style={styles.specValue}>
                        {values.join(', ')}
                        {spec.unit ? ` ${spec.unit}` : ''}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </>
          ) : null}

          <Divider />
          <View style={styles.section}>
            <Text variant="heading">Ownly assurance</Text>
            <Text variant="caption" tone="secondary">
              Sourced from authorised international distributors. Every unit is checked before dispatch and shipped
              from India with tracking. Questions? {env.supportEmail}
            </Text>
          </View>
        </View>

        {recommendations && recommendations.length > 0 ? (
          <ProductRail title="You may also like" products={recommendations} />
        ) : null}
      </ScrollView>

      <View style={styles.buyBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          accessibilityState={{ selected: saved }}
          onPress={() => void toggleSaved(product.id)}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Icon name={saved ? 'heart-filled' : 'heart'} size={22} color={saved ? colors.danger : colors.text} />
        </Pressable>

        <Button
          label={justAdded ? 'Added to bag' : inCart ? `In bag (${inCart.quantity}) — add another` : 'Add to bag'}
          full
          size="lg"
          disabled={!canBuy}
          loading={mutating}
          onPress={() => void onAdd()}
          style={styles.buyButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  body: { padding: layout.screenPadding, gap: spacing.md },
  title: { marginTop: spacing.xxs },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  stockLine: { marginTop: spacing.xxs },
  section: { gap: spacing.sm },
  description: { marginTop: spacing.xxs },
  specRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  specLabel: { width: 120 },
  specValue: { flex: 1 },
  chipSpec: { paddingVertical: spacing.sm, gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveButton: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButton: { flex: 1 },
  pressed: { opacity: 0.7 },
});
