import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ProductCard } from './ProductCard';
import { EmptyState, Loading } from './Layout';
import type { ProductSummary } from '@/shopify/types';
import { colors, layout, spacing } from '@/theme/tokens';

export interface ProductGridProps {
  products: ProductSummary[];
  loading?: boolean;
  loadingMore?: boolean;
  onEndReached?: () => void;
  header?: React.ReactElement | null;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: { label: string; onPress: () => void };
  /** Per-product "why this matched" copy, keyed by product id. */
  reasons?: Record<string, string>;
}

/**
 * Two-column grid on phones, three or four on wider screens. Column count is
 * derived from width rather than hard-coded so tablets and landscape don't
 * render comically large cards.
 */
export function ProductGrid({
  products,
  loading = false,
  loadingMore = false,
  onEndReached,
  header,
  emptyTitle = 'Nothing here yet',
  emptyBody,
  emptyAction,
  reasons,
}: ProductGridProps) {
  const { width } = useWindowDimensions();
  const columns = width >= 1024 ? 4 : width >= 700 ? 3 : 2;

  const renderItem = useCallback(
    ({ item }: { item: ProductSummary }) => (
      <View style={[styles.cell, { width: `${100 / columns}%` }]}>
        <ProductCard product={item} reason={reasons?.[item.id]} />
      </View>
    ),
    [columns, reasons],
  );

  const footer = useMemo(
    () =>
      loadingMore ? (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : (
        <View style={styles.footerSpacer} />
      ),
    [loadingMore],
  );

  if (loading && products.length === 0) {
    return (
      <>
        {header}
        <Loading />
      </>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      numColumns={columns}
      // `numColumns` cannot change on a mounted FlatList, so the key forces a
      // remount when the device rotates into a different column count.
      key={`grid-${columns}`}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={
        <EmptyState
          title={emptyTitle}
          body={emptyBody}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onPress}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      contentContainerStyle={[styles.content, products.length === 0 && styles.contentEmpty]}
      columnWrapperStyle={columns > 1 ? styles.column : undefined}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={8}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding - spacing.xs, paddingBottom: spacing.xxl },
  contentEmpty: { flexGrow: 1 },
  column: { alignItems: 'flex-start' },
  cell: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xl },
  footer: { paddingVertical: spacing.xl, alignItems: 'center' },
  footerSpacer: { height: spacing.xxl },
});
