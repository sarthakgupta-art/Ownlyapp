import {
  deriveFacetValues,
  filterFieldFor,
  metafieldIdentifiers,
  narrowClientSide,
  resolveAttributes,
} from '@/catalog/attributes';
import type { Department } from '@/catalog/types';
import type { Product, ProductSummary } from '@/shopify/types';

function money(amount: string) {
  return { amount, currencyCode: 'INR' };
}

const department: Department = {
  id: 'test',
  label: 'Test',
  tagline: '',
  enabled: true,
  order: 1,
  scope: {},
  defaultSortKey: 'BEST_SELLING',
  rails: [],
  attributes: [
    { key: 'brand', label: 'Brand', sources: [{ kind: 'vendor' }], inSpecs: true, inFilters: true, order: 1 },
    {
      key: 'family',
      label: 'Family',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'fragrance_family' },
        { kind: 'tagPrefix', prefix: 'family:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 2,
    },
    {
      key: 'notes',
      label: 'Notes',
      sources: [{ kind: 'metafield', namespace: 'custom', key: 'notes' }],
      multi: true,
      inSpecs: true,
      inFilters: true,
      order: 3,
    },
    { key: 'size', label: 'Size', sources: [{ kind: 'option', name: 'Size' }], inSpecs: true, order: 4 },
  ],
};

function summary(overrides: Partial<ProductSummary> & { id: string }): ProductSummary {
  return {
    handle: overrides.id,
    title: 'P',
    vendor: 'Dior',
    productType: 'Perfume',
    tags: [],
    availableForSale: true,
    featuredImage: null,
    priceRange: { minVariantPrice: money('1'), maxVariantPrice: money('1') },
    compareAtPriceRange: { minVariantPrice: money('1'), maxVariantPrice: money('1') },
    ...overrides,
  };
}

function full(overrides: Partial<Product> & { id: string }): Product {
  return {
    ...summary({ id: overrides.id }),
    description: '',
    descriptionHtml: '',
    images: [],
    options: [],
    variants: [],
    metafields: [],
    seo: { title: null, description: null },
    ...overrides,
  };
}

describe('resolveAttributes', () => {
  it('reads the vendor field', () => {
    const resolved = resolveAttributes(full({ id: 'a', vendor: 'Creed' }), department);
    expect(resolved.find((r) => r.spec.key === 'brand')?.values).toEqual(['Creed']);
  });

  it('prefers an earlier source over a later one', () => {
    const product = full({
      id: 'a',
      tags: ['family:woody'],
      metafields: [{ namespace: 'custom', key: 'fragrance_family', value: 'Amber', type: 'single_line_text_field' }],
    });
    expect(resolveAttributes(product, department).find((r) => r.spec.key === 'family')?.values).toEqual(['Amber']);
  });

  it('falls back to the tag source when the metafield is absent', () => {
    const product = full({ id: 'a', tags: ['family:woody'] });
    expect(resolveAttributes(product, department).find((r) => r.spec.key === 'family')?.values).toEqual(['Woody']);
  });

  it('parses a list-typed metafield from its JSON array', () => {
    const product = full({
      id: 'a',
      metafields: [
        { namespace: 'custom', key: 'notes', value: '["Amber","Vanilla"]', type: 'list.single_line_text_field' },
      ],
    });
    expect(resolveAttributes(product, department).find((r) => r.spec.key === 'notes')?.values).toEqual([
      'Amber',
      'Vanilla',
    ]);
  });

  it('falls back to comma splitting when a list metafield is not valid JSON', () => {
    const product = full({
      id: 'a',
      metafields: [{ namespace: 'custom', key: 'notes', value: 'Amber, Vanilla', type: 'list.single_line_text_field' }],
    });
    expect(resolveAttributes(product, department).find((r) => r.spec.key === 'notes')?.values).toEqual([
      'Amber',
      'Vanilla',
    ]);
  });

  it('reads a variant option', () => {
    const product = full({
      id: 'a',
      options: [{ id: 'o1', name: 'Size', optionValues: [{ id: 'v1', name: '50ml' }, { id: 'v2', name: '100ml' }] }],
    });
    expect(resolveAttributes(product, department).find((r) => r.spec.key === 'size')?.values).toEqual([
      '50ml',
      '100ml',
    ]);
  });

  it('omits attributes with no value rather than showing an empty row', () => {
    const resolved = resolveAttributes(full({ id: 'a' }), department);
    expect(resolved.map((r) => r.spec.key)).toEqual(['brand']);
  });

  it('tolerates a null metafield entry, which Shopify returns for a missing one', () => {
    const product = full({ id: 'a', metafields: [null] });
    expect(() => resolveAttributes(product, department)).not.toThrow();
  });
});

describe('filterFieldFor', () => {
  const map = filterFieldFor(department);

  it('maps a vendor-backed attribute to the vendor field', () => {
    expect(map('brand')).toEqual({ field: 'vendor' });
  });

  it('maps a tag-backed attribute to a namespaced tag', () => {
    const mapping = map('family');
    expect(mapping?.field).toBe('tag');
    expect(mapping?.transform?.('Woody')).toBe('family:woody');
  });

  it('returns null for an attribute with no searchable source', () => {
    expect(map('notes')).toBeNull();
    expect(map('size')).toBeNull();
  });

  it('returns null for an unknown attribute', () => {
    expect(map('nope')).toBeNull();
  });
});

describe('narrowClientSide', () => {
  it('leaves products untouched when every filter is server-side', () => {
    const items = [summary({ id: 'a' })];
    expect(narrowClientSide(items, department, { brand: ['Dior'] })).toHaveLength(1);
  });

  /**
   * Ownly's tagging is uneven. Excluding untagged stock would hide most of the
   * catalogue, so an absent value is treated as "unknown", not "no".
   */
  it('keeps products that have no value for the filtered attribute', () => {
    const items = [summary({ id: 'a' })];
    expect(narrowClientSide(items, department, { size: ['100ml'] })).toHaveLength(1);
  });
});

describe('deriveFacetValues', () => {
  it('counts values and orders them by frequency', () => {
    const items = [
      summary({ id: 'a', vendor: 'Dior' }),
      summary({ id: 'b', vendor: 'Dior' }),
      summary({ id: 'c', vendor: 'Creed' }),
    ];
    expect(deriveFacetValues(items, department).brand).toEqual([
      { value: 'Dior', count: 2 },
      { value: 'Creed', count: 1 },
    ]);
  });

  it('produces an entry for every filterable attribute, even an empty one', () => {
    const facets = deriveFacetValues([], department);
    expect(Object.keys(facets).sort()).toEqual(['brand', 'family', 'notes']);
  });
});

describe('metafieldIdentifiers', () => {
  it('collects each metafield once', () => {
    expect(metafieldIdentifiers(department)).toEqual([
      { namespace: 'custom', key: 'fragrance_family' },
      { namespace: 'custom', key: 'notes' },
    ]);
  });
});

describe('narrowClientSide bounds', () => {
  const cheap = summary({
    id: 'cheap',
    priceRange: { minVariantPrice: money('2000'), maxVariantPrice: money('2000') },
  });
  const dear = summary({
    id: 'dear',
    priceRange: { minVariantPrice: money('20000'), maxVariantPrice: money('20000') },
  });
  const soldOut = summary({ id: 'gone', availableForSale: false });

  /**
   * Shopify silently ignores a filter field it does not recognise, so a price
   * bound that never reached the server must still be honoured locally —
   * otherwise the buyer sets a budget and sees products above it.
   */
  it('applies a price ceiling locally', () => {
    const kept = narrowClientSide([cheap, dear], department, {}, { priceMax: 5000 });
    expect(kept.map((p) => p.id)).toEqual(['cheap']);
  });

  it('applies a price floor locally', () => {
    const kept = narrowClientSide([cheap, dear], department, {}, { priceMin: 5000 });
    expect(kept.map((p) => p.id)).toEqual(['dear']);
  });

  it('drops sold-out products when in-stock-only is set', () => {
    const kept = narrowClientSide([cheap, soldOut], department, {}, { inStockOnly: true });
    expect(kept.map((p) => p.id)).toEqual(['cheap']);
  });

  it('is a no-op when no bounds are given', () => {
    expect(narrowClientSide([cheap, dear, soldOut], department, {})).toHaveLength(3);
    expect(narrowClientSide([cheap, dear, soldOut], department, {}, {})).toHaveLength(3);
  });

  it('combines a price bound with an attribute filter', () => {
    const kept = narrowClientSide([cheap, dear], department, { size: ['100ml'] }, { priceMax: 5000 });
    expect(kept.map((p) => p.id)).toEqual(['cheap']);
  });
});
