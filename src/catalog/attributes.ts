import type { Product, ProductSummary } from '@/shopify/types';
import type { AttributeSpec, Department } from './types';

/**
 * Reads the structured attributes a department declares off a Shopify product.
 *
 * Sources are tried in order, so a store can start with tags (which the Ownly
 * catalogue already has) and later move to metafields without touching any
 * screen — just reorder the `sources` array.
 */

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => (word.length <= 3 && word === word.toUpperCase() ? word : word[0]!.toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

/** Metafields of a list type arrive as a JSON array string. */
function parseMetafieldValue(value: string, type: string): string[] {
  if (type.startsWith('list.')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
    } catch {
      // Fall through to the comma-separated reading below.
    }
  }
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export interface ResolvedAttribute {
  spec: AttributeSpec;
  values: string[];
}

interface ProductLike {
  vendor: string;
  productType: string;
  tags: string[];
}

function readSource(
  product: ProductLike & Partial<Pick<Product, 'metafields' | 'options' | 'variants'>>,
  spec: AttributeSpec,
): string[] {
  for (const source of spec.sources) {
    switch (source.kind) {
      case 'vendor': {
        if (product.vendor) return [product.vendor];
        break;
      }
      case 'productType': {
        if (product.productType) return [product.productType];
        break;
      }
      case 'tagPrefix': {
        const prefix = source.prefix.toLowerCase();
        const hits = product.tags
          .filter((tag) => tag.toLowerCase().startsWith(prefix))
          .map((tag) => titleCase(tag.slice(prefix.length)))
          .filter(Boolean);
        if (hits.length > 0) return hits;
        break;
      }
      case 'metafield': {
        const field = (product.metafields ?? []).find(
          (m) => m != null && m.namespace === source.namespace && m.key === source.key,
        );
        if (field && field.value) {
          const parsed = parseMetafieldValue(field.value, field.type);
          if (parsed.length > 0) return parsed;
        }
        break;
      }
      case 'option': {
        const option = (product.options ?? []).find(
          (o) => o.name.toLowerCase() === source.name.toLowerCase(),
        );
        if (option && option.optionValues.length > 0) {
          return option.optionValues.map((v) => v.name);
        }
        break;
      }
    }
  }
  return [];
}

/** All attributes a department declares, resolved against one product. */
export function resolveAttributes(
  product: Product,
  department: Department,
  filter?: (spec: AttributeSpec) => boolean,
): ResolvedAttribute[] {
  return department.attributes
    .filter((spec) => (filter ? filter(spec) : true))
    .map((spec) => ({ spec, values: readSource(product, spec) }))
    .filter((entry) => entry.values.length > 0)
    .sort((a, b) => (a.spec.order ?? 99) - (b.spec.order ?? 99));
}

/** Attributes marked for the PDP details table. */
export function specAttributes(product: Product, department: Department): ResolvedAttribute[] {
  return resolveAttributes(product, department, (spec) => spec.inSpecs === true);
}

/** Attributes marked as filterable, for the filter sheet. */
export function filterableAttributes(department: Department): AttributeSpec[] {
  return department.attributes
    .filter((spec) => spec.inFilters === true)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

/**
 * Maps an attribute key to the Storefront field its values can be searched on.
 *
 * Only `vendor`, `product_type` and `tag` are searchable; metafield- and
 * option-backed attributes are not, so they are excluded from server-side
 * filtering and narrowed client-side instead (see `narrowClientSide`).
 */
export function filterFieldFor(department: Department) {
  return (attributeKey: string): { field: string; transform?: (v: string) => string } | null => {
    const spec = department.attributes.find((a) => a.key === attributeKey);
    if (!spec) return null;
    for (const source of spec.sources) {
      if (source.kind === 'vendor') return { field: 'vendor' };
      if (source.kind === 'productType') return { field: 'product_type' };
      if (source.kind === 'tagPrefix') {
        const prefix = source.prefix;
        return { field: 'tag', transform: (v: string) => `${prefix}${v.toLowerCase()}` };
      }
    }
    return null;
  };
}

/**
 * Values that could not be pushed into the Storefront query — metafield- and
 * option-backed ones — are applied here against the summaries we already have.
 * Product summaries carry `tags`, `vendor` and `productType`, so anything
 * derivable from those is checkable without a second round-trip.
 */
export function narrowClientSide(
  products: ProductSummary[],
  department: Department,
  selected: Record<string, string[]>,
  bounds?: { priceMin?: number; priceMax?: number; inStockOnly?: boolean },
): ProductSummary[] {
  const serverSide = filterFieldFor(department);
  const unresolved = Object.entries(selected).filter(
    ([key, values]) => values.length > 0 && serverSide(key) == null,
  );

  const needsBounds =
    bounds != null &&
    (bounds.priceMin != null || bounds.priceMax != null || bounds.inStockOnly === true);

  if (unresolved.length === 0 && !needsBounds) return products;

  return products.filter((product) => {
    if (needsBounds && bounds) {
      if (bounds.inStockOnly && !product.availableForSale) return false;
      // Re-applying the price bound locally is a no-op when Shopify honoured
      // the `variants.price` clause, and a safety net when it did not. A
      // silently ignored price filter is otherwise invisible to the buyer.
      const price = Number(product.priceRange.minVariantPrice.amount);
      if (Number.isFinite(price)) {
        if (bounds.priceMin != null && price < bounds.priceMin) return false;
        if (bounds.priceMax != null && price > bounds.priceMax) return false;
      }
    }

    return unresolved.every(([key, values]) => {
      const spec = department.attributes.find((a) => a.key === key);
      if (!spec) return true;
      const actual = readSource(product, spec).map((v) => v.toLowerCase());
      // A product with no value for the attribute is not excluded — the store's
      // data is uneven, and hiding untagged stock would hide most of it.
      if (actual.length === 0) return true;
      return values.some((v) => actual.includes(v.toLowerCase()));
    });
  });
}

/**
 * Derives the filter options actually present in a result set, so the filter
 * sheet only ever offers values that will return something.
 */
export function deriveFacetValues(
  products: ProductSummary[],
  department: Department,
): Record<string, { value: string; count: number }[]> {
  const out: Record<string, Map<string, number>> = {};
  for (const spec of filterableAttributes(department)) {
    out[spec.key] = new Map();
  }
  for (const product of products) {
    for (const spec of filterableAttributes(department)) {
      const bucket = out[spec.key];
      if (!bucket) continue;
      for (const value of readSource(product, spec)) {
        bucket.set(value, (bucket.get(value) ?? 0) + 1);
      }
    }
  }
  const result: Record<string, { value: string; count: number }[]> = {};
  for (const [key, bucket] of Object.entries(out)) {
    result[key] = [...bucket.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }
  return result;
}

/** Metafield identifiers a department needs, for the PDP query. */
export function metafieldIdentifiers(department: Department): { namespace: string; key: string }[] {
  const seen = new Set<string>();
  const out: { namespace: string; key: string }[] = [];
  for (const spec of department.attributes) {
    for (const source of spec.sources) {
      if (source.kind !== 'metafield') continue;
      const id = `${source.namespace}.${source.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ namespace: source.namespace, key: source.key });
    }
  }
  return out;
}

/** Union of every department's metafields — used when the department is unknown. */
export function allMetafieldIdentifiers(departmentList: Department[]): { namespace: string; key: string }[] {
  const seen = new Set<string>();
  const out: { namespace: string; key: string }[] = [];
  for (const dept of departmentList) {
    for (const id of metafieldIdentifiers(dept)) {
      const key = `${id.namespace}.${id.key}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(id);
    }
  }
  return out;
}
