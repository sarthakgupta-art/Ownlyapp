import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ProductGrid } from '@/components/ProductGrid';
import { Chip, Divider, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { SetupNotice } from '@/components/SetupNotice';
import { FilterBar, FilterSheet, sortOptions } from '@/components/FilterSheet';
import { departments, getDepartment, primaryDepartment } from '@/catalog/departments';
import { deriveFacetValues } from '@/catalog/attributes';
import { countActiveFilters, emptyFilters, type ActiveFilters } from '@/catalog/query';
import { useCollections, useDepartmentProducts } from '@/hooks/useCatalog';
import { usePreferences } from '@/store/preferences';
import { isShopifyConfigured } from '@/config/env';
import type { SortOption } from '@/shopify/types';
import { colors, layout, spacing } from '@/theme/tokens';

type Mode = 'products' | 'brands';

/**
 * The brand directory.
 *
 * Ownly's Shopify has one auto-collection per vendor — several hundred of them
 * — so this pages through them rather than trying to hold the list in memory.
 */
function BrandList({ search }: { search: string }) {
  const router = useRouter();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useCollections(
    search.trim() ? `title:${search.trim()}*` : undefined,
  );

  const collections = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text variant="caption" tone="muted">
          Loading brands…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.brandList}
      onScroll={({ nativeEvent }) => {
        const nearBottom =
          nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
          nativeEvent.contentSize.height - 400;
        if (nearBottom && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }}
      scrollEventThrottle={200}
    >
      {collections.map((collection) => (
        <Pressable
          key={collection.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/collection/[handle]', params: { handle: collection.handle } })
          }
          style={({ pressed }) => [styles.brandRow, pressed && styles.pressed]}
        >
          <Text variant="body">{collection.title}</Text>
          <Icon name="chevron-right" size={17} color={colors.textFaint} />
        </Pressable>
      ))}
      {collections.length === 0 ? (
        <View style={styles.centered}>
          <Text variant="body" tone="muted">
            No brands match “{search}”.
          </Text>
        </View>
      ) : null}
      {isFetchingNextPage ? (
        <Text variant="caption" tone="muted" center style={styles.loadingMore}>
          Loading more…
        </Text>
      ) : null}
    </ScrollView>
  );
}

export default function ShopScreen() {
  const params = useLocalSearchParams<{ department?: string }>();
  const storedDepartment = usePreferences((s) => s.departmentId);
  const setDepartment = usePreferences((s) => s.setDepartment);

  const department = getDepartment(params.department) ?? getDepartment(storedDepartment) ?? primaryDepartment;

  const [mode, setMode] = useState<Mode>('products');
  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);
  const [sort, setSort] = useState<SortOption>(sortOptions[0]!);
  const [sheetOpen, setSheetOpen] = useState(false);

  const listing = useDepartmentProducts({
    department,
    filters,
    sortKey: sort.sortKey,
    reverse: sort.reverse,
    enabled: mode === 'products',
  });

  const facets = useMemo(
    () => deriveFacetValues(listing.products, department),
    [listing.products, department],
  );

  if (!isShopifyConfigured) return <SetupNotice />;

  const activeCount = countActiveFilters(filters);
  const resultLabel = listing.isLoading
    ? 'Loading…'
    : `${listing.products.length}${listing.hasNextPage ? '+' : ''} products`;

  return (
    <Screen>
      <AppHeader title="Shop" showSearch />

      {departments.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.departmentBar}>
          {departments.map((dept) => (
            <Chip
              key={dept.id}
              label={dept.label}
              selected={dept.id === department.id}
              onPress={() => {
                void setDepartment(dept.id);
                setFilters(emptyFilters);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.modeBar}>
        <Chip label="All products" selected={mode === 'products'} onPress={() => setMode('products')} />
        <Chip label="By brand" selected={mode === 'brands'} onPress={() => setMode('brands')} />
      </View>
      <Divider />

      {mode === 'brands' ? (
        <BrandList search="" />
      ) : (
        <>
          <FilterBar
            resultLabel={resultLabel}
            activeCount={activeCount}
            sortLabel={sort.label}
            onPress={() => setSheetOpen(true)}
          />
          <ProductGrid
            products={listing.products}
            loading={listing.isLoading}
            loadingMore={listing.isFetchingNextPage}
            onEndReached={() => {
              if (listing.hasNextPage && !listing.isFetchingNextPage) void listing.fetchNextPage();
            }}
            emptyTitle="Nothing matches"
            emptyBody={department.emptyStateCopy}
            emptyAction={activeCount > 0 ? { label: 'Clear filters', onPress: () => setFilters(emptyFilters) } : undefined}
          />
          <FilterSheet
            visible={sheetOpen}
            onClose={() => setSheetOpen(false)}
            department={department}
            facets={facets}
            filters={filters}
            sort={sort}
            onApply={(next, nextSort) => {
              setFilters(next);
              setSort(nextSort);
            }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  departmentBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  modeBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
  brandList: { paddingBottom: spacing.xxl },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  centered: { padding: spacing.xxl, alignItems: 'center' },
  loadingMore: { paddingVertical: spacing.xl },
  pressed: { opacity: 0.6 },
});
