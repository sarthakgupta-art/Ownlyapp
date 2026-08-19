import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { allDepartments, getDepartment, inferDepartment } from '@/catalog/departments';
import { allMetafieldIdentifiers, filterFieldFor, metafieldIdentifiers, narrowClientSide } from '@/catalog/attributes';
import { buildProductQuery, scopeToQuery, type ActiveFilters } from '@/catalog/query';
import type { Department, HomeRail } from '@/catalog/types';
import {
  fetchCollection,
  fetchCollectionProducts,
  fetchCollections,
  fetchProduct,
  fetchProducts,
  fetchProductsByIds,
  fetchRecommendations,
  predictiveSearch,
} from '@/shopify/api';
import type { ProductSortKey, ProductSummary } from '@/shopify/types';

const PAGE_SIZE = 24;

export const queryKeys = {
  products: (args: unknown) => ['products', args] as const,
  collection: (handle: string) => ['collection', handle] as const,
  collectionProducts: (args: unknown) => ['collectionProducts', args] as const,
  collections: (query: string | undefined) => ['collections', query ?? ''] as const,
  product: (handle: string) => ['product', handle] as const,
  recommendations: (id: string) => ['recommendations', id] as const,
  byIds: (ids: string[]) => ['productsByIds', ids] as const,
  search: (term: string) => ['predictiveSearch', term] as const,
  rail: (departmentId: string, railId: string) => ['rail', departmentId, railId] as const,
};

/**
 * Paginated product listing for a department, with filters and sort applied.
 *
 * Server-side filters go into the Storefront query; metafield- and
 * option-backed ones cannot be searched, so they are narrowed against each
 * fetched page. That means a filtered page can be shorter than `PAGE_SIZE`,
 * which is why the hook keeps paging on the *raw* cursor rather than on the
 * narrowed count.
 */
export function useDepartmentProducts(args: {
  department: Department;
  filters?: ActiveFilters;
  searchTerm?: string;
  sortKey?: ProductSortKey;
  reverse?: boolean;
  enabled?: boolean;
}) {
  const { department, filters, searchTerm, sortKey, reverse, enabled = true } = args;

  const query = buildProductQuery({
    scope: department.scope,
    filters,
    searchTerm,
    filterFieldFor: filterFieldFor(department),
  });

  const result = useInfiniteQuery({
    queryKey: queryKeys.products({ dept: department.id, query, sortKey, reverse }),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchProducts({
        first: PAGE_SIZE,
        after: pageParam,
        query,
        sortKey: sortKey ?? department.defaultSortKey,
        reverse: reverse ?? department.defaultSortReverse ?? false,
      }),
    getNextPageParam: (lastPage) => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
  });

  const raw = result.data?.pages.flatMap((page) => page.items) ?? [];
  const products = filters
    ? narrowClientSide(raw, department, filters.values, {
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        inStockOnly: filters.inStockOnly,
      })
    : raw;

  return { ...result, products, rawCount: raw.length };
}

/** Products of one Shopify collection, paginated. */
export function useCollectionProducts(args: {
  handle: string;
  sortKey?: ProductSortKey;
  reverse?: boolean;
  department?: Department;
  filters?: ActiveFilters;
}) {
  const { handle, sortKey, reverse, department, filters } = args;

  const result = useInfiniteQuery({
    queryKey: queryKeys.collectionProducts({ handle, sortKey, reverse }),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchCollectionProducts({ handle, first: PAGE_SIZE, after: pageParam, sortKey, reverse }),
    getNextPageParam: (lastPage) =>
      lastPage.page.pageInfo.hasNextPage ? lastPage.page.pageInfo.endCursor : undefined,
  });

  const raw = result.data?.pages.flatMap((page) => page.page.items) ?? [];
  // A collection query cannot carry a Storefront search string at all, so every
  // filter on a collection screen has to be applied here.
  const products =
    department && filters
      ? narrowClientSide(raw, department, filters.values, {
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          inStockOnly: filters.inStockOnly,
        })
      : raw;
  const collection = result.data?.pages[0]?.collection ?? null;

  return { ...result, products, collection };
}

export function useCollection(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.collection(handle ?? ''),
    enabled: Boolean(handle),
    queryFn: () => fetchCollection(handle!),
  });
}

export function useCollections(query?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.collections(query),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchCollections({ first: 40, after: pageParam, query }),
    getNextPageParam: (lastPage) => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
  });
}

/**
 * A product page.
 *
 * The department is unknown before the product loads, so the query asks for the
 * union of every department's metafields. That is one request rather than two
 * and the extra identifiers cost nothing when a product has no value for them.
 */
export function useProduct(handle: string | undefined) {
  const identifiers = allMetafieldIdentifiers(allDepartments);

  const query = useQuery({
    queryKey: queryKeys.product(handle ?? ''),
    enabled: Boolean(handle),
    queryFn: () => fetchProduct(handle!, identifiers),
  });

  const department = query.data ? inferDepartment(query.data) : undefined;
  return { ...query, department };
}

export function useRecommendations(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recommendations(productId ?? ''),
    enabled: Boolean(productId),
    queryFn: () => fetchRecommendations(productId!),
    staleTime: 10 * 60 * 1000,
  });
}

/** Rehydrates wishlist / recently-viewed ids into full product summaries. */
export function useProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.byIds(ids),
    enabled: ids.length > 0,
    queryFn: () => fetchProductsByIds(ids),
    // `nodes(ids:)` returns in request order already, but the store's order is
    // what the buyer arranged, so it is reasserted here after any refetch.
    select: (products: ProductSummary[]) => {
      const byId = new Map(products.map((p) => [p.id, p]));
      return ids.map((id) => byId.get(id)).filter((p): p is ProductSummary => p != null);
    },
  });
}

export function usePredictiveSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.search(term),
    enabled: term.trim().length >= 2,
    queryFn: () => predictiveSearch(term),
    staleTime: 60 * 1000,
  });
}

/**
 * One merchandised rail. A rail may name a collection or a scope; a collection
 * wins because its order is controlled from Shopify admin.
 */
export function useRail(department: Department, rail: HomeRail) {
  return useQuery({
    queryKey: queryKeys.rail(department.id, rail.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProductSummary[]> => {
      const limit = rail.limit ?? 12;
      if (rail.collectionHandle) {
        const { page } = await fetchCollectionProducts({
          handle: rail.collectionHandle,
          first: limit,
          sortKey: rail.sortKey,
          reverse: rail.reverse,
        });
        if (page.items.length > 0) return page.items;
        // Fall through to the scope query when the handle does not exist yet,
        // so a rail configured ahead of its collection still shows something.
      }
      const scope = rail.scope
        ? { ...department.scope, ...rail.scope }
        : department.scope;
      const page = await fetchProducts({
        first: limit,
        query: scopeToQuery(scope),
        sortKey: rail.sortKey ?? department.defaultSortKey,
        reverse: rail.reverse ?? false,
      });
      return page.items;
    },
  });
}

/** Metafield identifiers for one department — used by the PDP specs table. */
export function departmentMetafields(departmentId: string) {
  const dept = getDepartment(departmentId);
  return dept ? metafieldIdentifiers(dept) : [];
}
