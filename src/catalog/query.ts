import type { DepartmentScope } from './types';

/**
 * Compiles scopes and filters into Shopify Storefront search syntax.
 *
 * Storefront search is finicky: unknown field names are silently ignored and
 * quietly return the whole catalogue, so every clause here uses a field the
 * `products` connection actually supports (`product_type`, `tag`, `vendor`,
 * `variants.price`, `title`).
 */

/** Wraps a value in double quotes and escapes any it contains. */
export function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** ORs a set of `field:value` terms into a single parenthesised clause. */
function orClause(field: string, values: readonly string[] | undefined): string | null {
  const cleaned = (values ?? []).map((v) => v.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  const parts = cleaned.map((v) => `${field}:${quote(v)}`);
  return parts.length === 1 ? parts[0]! : `(${parts.join(' OR ')})`;
}

/** ANDs a set of clauses, dropping empties. */
export function andClauses(clauses: (string | null | undefined)[]): string {
  const kept = clauses.filter((c): c is string => Boolean(c && c.trim()));
  return kept.join(' AND ');
}

export function scopeToQuery(scope: DepartmentScope | undefined): string {
  if (!scope) return '';
  return andClauses([
    orClause('product_type', scope.productTypes),
    orClause('tag', scope.tags),
    orClause('vendor', scope.vendors),
    ...(scope.excludeTags ?? []).map((t) => `NOT tag:${quote(t)}`),
  ]);
}

/** A user-selected filter: an attribute key plus the chosen values. */
export interface ActiveFilters {
  /** attributeKey -> selected values (ORed within a key, ANDed across keys). */
  values: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
}

export const emptyFilters: ActiveFilters = { values: {} };

export function countActiveFilters(filters: ActiveFilters): number {
  let n = Object.values(filters.values).reduce((sum, list) => sum + list.length, 0);
  if (filters.priceMin != null || filters.priceMax != null) n += 1;
  if (filters.inStockOnly) n += 1;
  return n;
}

/**
 * Renders the price clause. Shopify accepts `variants.price` as a range filter
 * on the `products` connection specifically (it is one of the few dotted names
 * that is real), so it is written literally rather than through `orClause`.
 */
function priceClause(min?: number, max?: number): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `variants.price:>=${min} AND variants.price:<=${max}`;
  if (min != null) return `variants.price:>=${min}`;
  return `variants.price:<=${max}`;
}

/**
 * Builds the full Storefront `query` string for a listing screen.
 *
 * `filterFieldFor` maps an attribute key to the Shopify field its values live
 * in — supplied by the caller because only the department registry knows
 * whether e.g. `brand` is a vendor or a tag.
 */
export function buildProductQuery(options: {
  scope?: DepartmentScope;
  filters?: ActiveFilters;
  searchTerm?: string;
  filterFieldFor: (attributeKey: string) => { field: string; transform?: (value: string) => string } | null;
}): string {
  const { scope, filters, searchTerm, filterFieldFor } = options;
  const clauses: (string | null)[] = [scopeToQuery(scope)];

  if (searchTerm && searchTerm.trim()) {
    clauses.push(quote(searchTerm.trim()));
  }

  if (filters) {
    for (const [key, values] of Object.entries(filters.values)) {
      if (!values || values.length === 0) continue;
      const mapping = filterFieldFor(key);
      if (!mapping) continue;
      const rendered = values.map((v) => (mapping.transform ? mapping.transform(v) : v));
      clauses.push(orClause(mapping.field, rendered));
    }
    clauses.push(priceClause(filters.priceMin, filters.priceMax));
    if (filters.inStockOnly) clauses.push('available_for_sale:true');
  }

  return andClauses(clauses);
}
