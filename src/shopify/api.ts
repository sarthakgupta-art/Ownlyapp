import { assertNoUserErrors, storefront, type UserError } from './client';
import {
  CART_QUERY,
  COLLECTIONS_QUERY,
  COLLECTION_META_QUERY,
  COLLECTION_PRODUCTS_QUERY,
  PREDICTIVE_SEARCH_QUERY,
  PRODUCTS_BY_HANDLES_QUERY,
  PRODUCTS_QUERY,
  PRODUCT_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from './graphql/queries';
import {
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_CREATE_MUTATION,
  CART_DISCOUNT_CODES_UPDATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
} from './graphql/mutations';
import type {
  Cart,
  CollectionSummary,
  Paginated,
  Product,
  ProductSortKey,
  ProductSummary,
} from './types';

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export interface ProductQueryArgs {
  first?: number;
  after?: string | null;
  query?: string;
  sortKey?: ProductSortKey;
  reverse?: boolean;
}

export async function fetchProducts(args: ProductQueryArgs): Promise<Paginated<ProductSummary>> {
  const data = await storefront<{
    products: { nodes: ProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  }>(PRODUCTS_QUERY, {
    first: args.first ?? 24,
    after: args.after ?? null,
    // An empty string is a valid "match everything" query, but `null` is what
    // Shopify expects when there is no query at all.
    query: args.query && args.query.trim() ? args.query : null,
    sortKey: args.sortKey ?? 'BEST_SELLING',
    reverse: args.reverse ?? false,
  });
  return { items: data.products.nodes, pageInfo: data.products.pageInfo };
}

/** Collection sort keys are a different enum from the top-level product ones. */
type CollectionSortKey = 'BEST_SELLING' | 'COLLECTION_DEFAULT' | 'CREATED' | 'ID' | 'MANUAL' | 'PRICE' | 'RELEVANCE' | 'TITLE';

const PRODUCT_TO_COLLECTION_SORT: Record<ProductSortKey, CollectionSortKey> = {
  RELEVANCE: 'RELEVANCE',
  BEST_SELLING: 'BEST_SELLING',
  CREATED_AT: 'CREATED',
  PRICE: 'PRICE',
  TITLE: 'TITLE',
  PRODUCT_TYPE: 'COLLECTION_DEFAULT',
  VENDOR: 'COLLECTION_DEFAULT',
};

export async function fetchCollectionProducts(args: {
  handle: string;
  first?: number;
  after?: string | null;
  sortKey?: ProductSortKey;
  reverse?: boolean;
}): Promise<{ collection: CollectionSummary | null; page: Paginated<ProductSummary> }> {
  const data = await storefront<{
    collection:
      | (CollectionSummary & {
          products: { nodes: ProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
        })
      | null;
  }>(COLLECTION_PRODUCTS_QUERY, {
    handle: args.handle,
    first: args.first ?? 24,
    after: args.after ?? null,
    sortKey: PRODUCT_TO_COLLECTION_SORT[args.sortKey ?? 'BEST_SELLING'],
    reverse: args.reverse ?? false,
    filters: null,
  });

  if (!data.collection) {
    return { collection: null, page: { items: [], pageInfo: { hasNextPage: false, endCursor: null } } };
  }
  const { products, ...collection } = data.collection;
  return { collection, page: { items: products.nodes, pageInfo: products.pageInfo } };
}

export async function fetchCollection(handle: string): Promise<CollectionSummary | null> {
  const data = await storefront<{ collection: CollectionSummary | null }>(COLLECTION_META_QUERY, { handle });
  return data.collection;
}

export async function fetchCollections(args: {
  first?: number;
  after?: string | null;
  query?: string;
}): Promise<Paginated<CollectionSummary>> {
  const data = await storefront<{
    collections: { nodes: CollectionSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  }>(COLLECTIONS_QUERY, {
    first: args.first ?? 30,
    after: args.after ?? null,
    query: args.query && args.query.trim() ? args.query : null,
  });
  return { items: data.collections.nodes, pageInfo: data.collections.pageInfo };
}

export async function fetchProduct(
  handle: string,
  metafields: { namespace: string; key: string }[],
): Promise<Product | null> {
  const data = await storefront<{
    product:
      | (Omit<Product, 'images' | 'variants' | 'metafields'> & {
          images: { nodes: Product['images'] };
          variants: { nodes: Product['variants'] };
          metafields: Product['metafields'];
        })
      | null;
  }>(PRODUCT_QUERY, { handle, metafields });

  if (!data.product) return null;
  const { images, variants, ...rest } = data.product;
  return { ...rest, images: images.nodes, variants: variants.nodes, metafields: data.product.metafields ?? [] };
}

export async function fetchRecommendations(productId: string): Promise<ProductSummary[]> {
  const data = await storefront<{ productRecommendations: ProductSummary[] | null }>(
    PRODUCT_RECOMMENDATIONS_QUERY,
    { productId },
  );
  return data.productRecommendations ?? [];
}

/** Rehydrates wishlist / recently-viewed entries stored as product GIDs. */
export async function fetchProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (ids.length === 0) return [];
  const data = await storefront<{ nodes: (ProductSummary | null)[] }>(PRODUCTS_BY_HANDLES_QUERY, { ids });
  return data.nodes.filter((n): n is ProductSummary => n != null && 'handle' in n);
}

export interface PredictiveSearchResult {
  queries: string[];
  products: ProductSummary[];
  collections: CollectionSummary[];
}

export async function predictiveSearch(term: string): Promise<PredictiveSearchResult> {
  if (!term.trim()) return { queries: [], products: [], collections: [] };
  const data = await storefront<{
    predictiveSearch: {
      queries: { text: string }[];
      products: ProductSummary[];
      collections: CollectionSummary[];
    } | null;
  }>(PREDICTIVE_SEARCH_QUERY, { term });
  const result = data.predictiveSearch;
  return {
    queries: result?.queries.map((q) => q.text) ?? [],
    products: result?.products ?? [],
    collections: result?.collections ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                        */
/* -------------------------------------------------------------------------- */

interface RawCart extends Omit<Cart, 'lines'> {
  lines: { nodes: Cart['lines'] };
}

function normaliseCart(cart: RawCart | null): Cart | null {
  if (!cart) return null;
  return { ...cart, lines: cart.lines.nodes };
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

export async function cartCreate(lines: CartLineInput[], customerAccessToken?: string): Promise<Cart> {
  const data = await storefront<{ cartCreate: { cart: RawCart | null; userErrors: UserError[] } }>(
    CART_CREATE_MUTATION,
    {
      lines,
      buyerIdentity: customerAccessToken ? { customerAccessToken } : null,
    },
    { idempotent: false },
  );
  assertNoUserErrors(data.cartCreate.userErrors);
  const cart = normaliseCart(data.cartCreate.cart);
  if (!cart) throw new Error('Could not start a cart.');
  return cart;
}

export async function cartFetch(cartId: string): Promise<Cart | null> {
  const data = await storefront<{ cart: RawCart | null }>(CART_QUERY, { id: cartId });
  return normaliseCart(data.cart);
}

export async function cartLinesAdd(cartId: string, lines: CartLineInput[]): Promise<Cart> {
  const data = await storefront<{ cartLinesAdd: { cart: RawCart | null; userErrors: UserError[] } }>(
    CART_LINES_ADD_MUTATION,
    { cartId, lines },
    { idempotent: false },
  );
  assertNoUserErrors(data.cartLinesAdd.userErrors);
  const cart = normaliseCart(data.cartLinesAdd.cart);
  if (!cart) throw new Error('Could not add to the bag.');
  return cart;
}

export async function cartLinesUpdate(
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<Cart> {
  const data = await storefront<{ cartLinesUpdate: { cart: RawCart | null; userErrors: UserError[] } }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId, lines },
  );
  assertNoUserErrors(data.cartLinesUpdate.userErrors);
  const cart = normaliseCart(data.cartLinesUpdate.cart);
  if (!cart) throw new Error('Could not update the bag.');
  return cart;
}

export async function cartLinesRemove(cartId: string, lineIds: string[]): Promise<Cart> {
  const data = await storefront<{ cartLinesRemove: { cart: RawCart | null; userErrors: UserError[] } }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId, lineIds },
  );
  assertNoUserErrors(data.cartLinesRemove.userErrors);
  const cart = normaliseCart(data.cartLinesRemove.cart);
  if (!cart) throw new Error('Could not update the bag.');
  return cart;
}

export async function cartApplyDiscount(cartId: string, codes: string[]): Promise<Cart> {
  const data = await storefront<{
    cartDiscountCodesUpdate: { cart: RawCart | null; userErrors: UserError[] };
  }>(CART_DISCOUNT_CODES_UPDATE_MUTATION, { cartId, discountCodes: codes });
  assertNoUserErrors(data.cartDiscountCodesUpdate.userErrors);
  const cart = normaliseCart(data.cartDiscountCodesUpdate.cart);
  if (!cart) throw new Error('Could not apply that code.');
  return cart;
}

/**
 * Attaches the signed-in buyer to the cart.
 *
 * `customerAccessToken` here is the OAuth access token from the Customer
 * Account API — the Storefront API accepts it directly on buyer identity, which
 * is what makes Shopify's hosted checkout open pre-filled.
 */
export async function cartAttachCustomer(cartId: string, customerAccessToken: string): Promise<Cart> {
  const data = await storefront<{
    cartBuyerIdentityUpdate: { cart: RawCart | null; userErrors: UserError[] };
  }>(CART_BUYER_IDENTITY_UPDATE_MUTATION, { cartId, buyerIdentity: { customerAccessToken } });
  assertNoUserErrors(data.cartBuyerIdentityUpdate.userErrors);
  const cart = normaliseCart(data.cartBuyerIdentityUpdate.cart);
  if (!cart) throw new Error('Could not link your account to the bag.');
  return cart;
}
