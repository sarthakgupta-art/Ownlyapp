import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ProductGrid } from '@/components/ProductGrid';
import { Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { FilterBar, FilterSheet, sortOptions } from '@/components/FilterSheet';
import { deriveFacetValues } from '@/catalog/attributes';
import { countActiveFilters, emptyFilters, type ActiveFilters } from '@/catalog/query';
import { getDepartment, inferDepartment, primaryDepartment } from '@/catalog/departments';
import { useCollectionProducts } from '@/hooks/useCatalog';
import { usePreferences } from '@/store/preferences';
import { htmlToPlainText } from '@/lib/format';
import type { SortOption } from '@/shopify/types';
import { layout, spacing } from '@/theme/tokens';

export default function CollectionScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const departmentId = usePreferences((s) => s.departmentId);

  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);
  const [sort, setSort] = useState<SortOption>(sortOptions[0]!);
  const [sheetOpen, setSheetOpen] = useState(false);

  const listing = useCollectionProducts({
    handle,
    sortKey: sort.sortKey,
    reverse: sort.reverse,
    filters,
    department: getDepartment(departmentId) ?? primaryDepartment,
  });

  // A brand collection can span verticals, so the department is taken from the
  // products actually in it rather than from whatever tab the buyer came from.
  const department = useMemo(() => {
    const first = listing.products[0];
    return first ? inferDepartment(first) : (getDepartment(departmentId) ?? primaryDepartment);
  }, [listing.products, departmentId]);

  const facets = useMemo(
    () => deriveFacetValues(listing.products, department),
    [listing.products, department],
  );

  const collection = listing.collection;
  const description = collection?.description ? htmlToPlainText(collection.description) : '';
  const activeCount = countActiveFilters(filters);

  const header =
    description.length > 0 ? (
      <View style={styles.description}>
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      </View>
    ) : null;

  return (
    <Screen>
      <AppHeader title={collection?.title ?? 'Collection'} showBack showSearch />
      <FilterBar
        resultLabel={
          listing.isLoading
            ? 'Loading…'
            : `${listing.products.length}${listing.hasNextPage ? '+' : ''} products`
        }
        activeCount={activeCount}
        sortLabel={sort.label}
        onPress={() => setSheetOpen(true)}
      />
      <ProductGrid
        products={listing.products}
        loading={listing.isLoading}
        loadingMore={listing.isFetchingNextPage}
        header={header}
        onEndReached={() => {
          if (listing.hasNextPage && !listing.isFetchingNextPage) void listing.fetchNextPage();
        }}
        emptyTitle="Nothing here yet"
        emptyBody={
          activeCount > 0 ? 'No products in this collection match your filters.' : department.emptyStateCopy
        }
        emptyAction={
          activeCount > 0 ? { label: 'Clear filters', onPress: () => setFilters(emptyFilters) } : undefined
        }
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { paddingHorizontal: spacing.xs, paddingBottom: spacing.lg, maxWidth: layout.screenPadding * 30 },
});
