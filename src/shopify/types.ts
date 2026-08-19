/** Types mirroring the subset of the Shopify Storefront API this app consumes. */

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Image {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface Metafield {
  key: string;
  namespace: string;
  value: string;
  type: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  quantityAvailable: number | null;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: SelectedOption[];
  image: Image | null;
}

export interface ProductOption {
  id: string;
  name: string;
  optionValues: { id: string; name: string }[];
}

export interface ProductSummary {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: Image | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  compareAtPriceRange: { minVariantPrice: Money; maxVariantPrice: Money };
}

export interface Product extends ProductSummary {
  description: string;
  descriptionHtml: string;
  images: Image[];
  options: ProductOption[];
  variants: ProductVariant[];
  metafields: (Metafield | null)[];
  seo: { title: string | null; description: string | null };
}

export interface CollectionSummary {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: Image | null;
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: { totalAmount: Money; amountPerQuantity: Money; compareAtAmountPerQuantity: Money | null };
  merchandise: {
    id: string;
    title: string;
    availableForSale: boolean;
    quantityAvailable: number | null;
    image: Image | null;
    price: Money;
    compareAtPrice: Money | null;
    selectedOptions: SelectedOption[];
    product: { id: string; handle: string; title: string; vendor: string; featuredImage: Image | null };
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
    totalDutyAmount: Money | null;
  };
  lines: CartLine[];
  discountCodes: { code: string; applicable: boolean }[];
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

/** Sort keys accepted by the Storefront `products` connection. */
export type ProductSortKey =
  | 'RELEVANCE'
  | 'BEST_SELLING'
  | 'CREATED_AT'
  | 'PRICE'
  | 'TITLE'
  | 'PRODUCT_TYPE'
  | 'VENDOR';

export interface SortOption {
  id: string;
  label: string;
  sortKey: ProductSortKey;
  reverse: boolean;
}
