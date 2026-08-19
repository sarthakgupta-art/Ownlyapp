import type { ProductSortKey } from '@/shopify/types';

/**
 * A "department" is a top-level merchandising vertical: fragrance today,
 * watches / handbags / fashion later.
 *
 * Everything that differs between verticals — how their products are selected
 * out of the shared Shopify catalogue, which structured facts a product page
 * shows, which filters appear, and what the discovery quiz asks — is data in a
 * `Department` object. Screens read the registry and render generically, so a
 * new vertical is a config addition, never a new screen.
 */

/** Where a structured attribute value is read from on a Shopify product. */
export type AttributeSource =
  /** A product metafield, e.g. `custom.concentration`. The richest source. */
  | { kind: 'metafield'; namespace: string; key: string }
  /**
   * A namespaced tag, e.g. the tag `note:amber` yields `amber`. Lets the store
   * carry structured data before metafields are set up, which matters for a
   * ~700 SKU catalogue that is already tagged.
   */
  | { kind: 'tagPrefix'; prefix: string }
  /** A variant option, e.g. `Size`. */
  | { kind: 'option'; name: string }
  /** Shopify's own `productType` field. */
  | { kind: 'productType' }
  /** Shopify's own `vendor` field — the brand, for every vertical. */
  | { kind: 'vendor' };

export type AttributeDisplay = 'text' | 'chips' | 'measurement';

export interface AttributeSpec {
  /** Stable key, unique within a department. */
  key: string;
  label: string;
  sources: AttributeSource[];
  /** Multi-valued attributes (fragrance notes, handbag materials) render as chips. */
  multi?: boolean;
  display?: AttributeDisplay;
  /** Show in the PDP "Details" table. */
  inSpecs?: boolean;
  /** Offer as a filter on listing screens. */
  inFilters?: boolean;
  /** Appended to each value in the specs table, e.g. `mm` for a watch case. */
  unit?: string;
  /** Sort order within the specs table and the filter sheet. */
  order?: number;
}

/**
 * How a department's products are selected. All non-empty clauses are ANDed;
 * values within a clause are ORed. Compiles to a Storefront `query` string.
 */
export interface DepartmentScope {
  productTypes?: string[];
  tags?: string[];
  vendors?: string[];
  excludeTags?: string[];
  /**
   * When set, listing screens read this collection directly instead of running
   * a `products(query:)` search. Preferred once a real collection exists,
   * because collection ordering is merchandisable from Shopify admin.
   */
  collectionHandle?: string;
}

export interface FinderOptionMatch {
  tags?: string[];
  vendors?: string[];
  productTypes?: string[];
  /** Free-text terms ORed into the Storefront query. */
  terms?: string[];
  priceMin?: number;
  priceMax?: number;
}

export interface FinderOption {
  id: string;
  label: string;
  description?: string;
  match: FinderOptionMatch;
}

export interface FinderStep {
  id: string;
  question: string;
  helper?: string;
  /** Allow more than one answer. Multi-select answers are ORed together. */
  multi?: boolean;
  /** A step the buyer may skip without narrowing anything. */
  optional?: boolean;
  options: FinderOption[];
}

export interface FinderConfig {
  /** Shown on the finder's intro card. */
  title: string;
  subtitle: string;
  ctaLabel: string;
  steps: FinderStep[];
}

/** A merchandised rail on the home screen. */
export interface HomeRail {
  id: string;
  title: string;
  subtitle?: string;
  /** Prefer a collection when one exists; otherwise fall back to a query. */
  collectionHandle?: string;
  scope?: DepartmentScope;
  sortKey?: ProductSortKey;
  reverse?: boolean;
  limit?: number;
  /** Render as a full-bleed editorial card instead of a horizontal rail. */
  layout?: 'rail' | 'grid';
}

export interface Department {
  id: string;
  label: string;
  /** Short line under the department name in the shop tab. */
  tagline: string;
  /** When false the department is hidden everywhere but stays in the registry. */
  enabled: boolean;
  /** Display order across the app. */
  order: number;
  scope: DepartmentScope;
  attributes: AttributeSpec[];
  finder?: FinderConfig;
  rails: HomeRail[];
  defaultSortKey: ProductSortKey;
  defaultSortReverse?: boolean;
  /** Handles of curated collections shown on the department landing screen. */
  featuredCollections?: string[];
  /** Copy shown when a listing comes back empty. */
  emptyStateCopy?: string;
}
