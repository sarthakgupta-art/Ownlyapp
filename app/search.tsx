import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Divider, EmptyState, Loading, Screen } from '@/components/Layout';
import { ProductGrid } from '@/components/ProductGrid';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { useDepartmentProducts, usePredictiveSearch } from '@/hooks/useCatalog';
import { getDepartment, primaryDepartment } from '@/catalog/departments';
import { usePreferences } from '@/store/preferences';
import { formatMoney } from '@/lib/format';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Predictive search fires per keystroke; this keeps it to one request a beat. */
function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const departmentId = usePreferences((s) => s.departmentId);
  const recentSearches = usePreferences((s) => s.recentSearches);
  const noteSearch = usePreferences((s) => s.noteSearch);
  const clearSearches = usePreferences((s) => s.clearSearches);

  const [term, setTerm] = useState(params.q ?? '');
  // `submitted` separates "typing, show suggestions" from "committed, show a grid".
  const [submitted, setSubmitted] = useState(params.q ?? '');
  const debouncedTerm = useDebounced(term);

  const department = getDepartment(departmentId) ?? primaryDepartment;

  const suggestions = usePredictiveSearch(submitted ? '' : debouncedTerm);

  // Searching intentionally ignores the department scope: someone typing
  // "Tom Ford" wants everything Tom Ford, not just the active vertical.
  const results = useDepartmentProducts({
    department: { ...department, scope: {} },
    searchTerm: submitted,
    enabled: submitted.trim().length > 0,
  });

  const submit = useCallback(
    (value: string) => {
      const cleaned = value.trim();
      if (!cleaned) return;
      setTerm(cleaned);
      setSubmitted(cleaned);
      void noteSearch(cleaned);
    },
    [noteSearch],
  );

  const clear = useCallback(() => {
    setTerm('');
    setSubmitted('');
  }, []);

  const showSuggestions = submitted.length === 0;
  const suggestionData = suggestions.data;

  const header = useMemo(
    () =>
      submitted ? (
        <View style={styles.resultsHeader}>
          <Text variant="caption" tone="muted">
            {results.isLoading
              ? 'Searching…'
              : `${results.products.length}${results.hasNextPage ? '+' : ''} results for “${submitted}”`}
          </Text>
        </View>
      ) : null,
    [submitted, results.isLoading, results.products.length, results.hasNextPage],
  );

  return (
    <Screen>
      <View style={styles.searchBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={10}
        >
          <Icon name="chevron-left" size={24} />
        </Pressable>

        <View style={styles.inputWrap}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={term}
            onChangeText={(value) => {
              setTerm(value);
              // Editing after a search returns to suggestion mode.
              if (submitted) setSubmitted('');
            }}
            onSubmitEditing={() => submit(term)}
            placeholder="Search brands and products"
            placeholderTextColor={colors.textFaint}
            autoFocus={!params.q}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
            accessibilityLabel="Search"
          />
          {term.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={clear} hitSlop={8}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Divider />

      {showSuggestions ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.suggestions}>
          {term.trim().length < 2 && recentSearches.length > 0 ? (
            <>
              <View style={styles.suggestionHeader}>
                <Text variant="eyebrow" tone="muted" uppercase>
                  Recent
                </Text>
                <Pressable accessibilityRole="button" onPress={() => void clearSearches()} hitSlop={8}>
                  <Text variant="caption" tone="accent">
                    Clear
                  </Text>
                </Pressable>
              </View>
              {recentSearches.map((search) => (
                <Pressable
                  key={search}
                  accessibilityRole="button"
                  onPress={() => submit(search)}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                >
                  <Icon name="search" size={16} color={colors.textFaint} />
                  <Text variant="body">{search}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {suggestions.isLoading && term.trim().length >= 2 ? <Loading /> : null}

          {suggestionData && suggestionData.queries.length > 0 ? (
            <>
              <Text variant="eyebrow" tone="muted" uppercase style={styles.suggestionHeader}>
                Suggestions
              </Text>
              {suggestionData.queries.map((query) => (
                <Pressable
                  key={query}
                  accessibilityRole="button"
                  onPress={() => submit(query)}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                >
                  <Icon name="search" size={16} color={colors.textFaint} />
                  <Text variant="body">{query}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {suggestionData && suggestionData.collections.length > 0 ? (
            <>
              <Text variant="eyebrow" tone="muted" uppercase style={styles.suggestionHeader}>
                Brands & collections
              </Text>
              {suggestionData.collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/collection/[handle]', params: { handle: collection.handle } })
                  }
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                >
                  <Icon name="grid" size={16} color={colors.textFaint} />
                  <Text variant="body">{collection.title}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {suggestionData && suggestionData.products.length > 0 ? (
            <>
              <Text variant="eyebrow" tone="muted" uppercase style={styles.suggestionHeader}>
                Products
              </Text>
              {suggestionData.products.map((product) => (
                <Pressable
                  key={product.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/product/[handle]', params: { handle: product.handle } })
                  }
                  style={({ pressed }) => [styles.productRow, pressed && styles.pressed]}
                >
                  <Image
                    source={product.featuredImage?.url}
                    contentFit="cover"
                    style={styles.thumb}
                    alt={product.title}
                  />
                  <View style={styles.productText}>
                    <Text variant="eyebrow" tone="muted" numberOfLines={1}>
                      {product.vendor}
                    </Text>
                    <Text variant="caption" numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {formatMoney(product.priceRange.minVariantPrice)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}

          {term.trim().length >= 2 &&
          !suggestions.isLoading &&
          suggestionData &&
          suggestionData.products.length === 0 &&
          suggestionData.collections.length === 0 ? (
            <EmptyState title={`Nothing for “${term.trim()}”`} body="Try a brand name or a product line." />
          ) : null}
        </ScrollView>
      ) : (
        <ProductGrid
          products={results.products}
          loading={results.isLoading}
          loadingMore={results.isFetchingNextPage}
          header={header}
          onEndReached={() => {
            if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
          }}
          emptyTitle={`Nothing for “${submitted}”`}
          emptyBody="Try a brand name, a product line, or a scent note."
          emptyAction={{ label: 'Clear search', onPress: clear }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  suggestions: { paddingBottom: spacing.xxl },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
  thumb: { width: 52, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  productText: { flex: 1, gap: 2 },
  resultsHeader: { paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
});
