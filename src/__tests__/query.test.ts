import { andClauses, buildProductQuery, countActiveFilters, quote, scopeToQuery } from '@/catalog/query';
import type { DepartmentScope } from '@/catalog/types';

/**
 * Storefront search silently ignores unknown fields and returns the entire
 * catalogue, so a malformed query does not throw — it quietly shows the wrong
 * products. These tests pin the exact string shape for that reason.
 */

describe('quote', () => {
  it('wraps values in double quotes', () => {
    expect(quote('Tom Ford')).toBe('"Tom Ford"');
  });

  it('escapes embedded quotes so the clause cannot be broken out of', () => {
    expect(quote('L\'Homme "Ideal"')).toBe('"L\'Homme \\"Ideal\\""');
  });

  it('escapes backslashes before quotes', () => {
    expect(quote('a\\b')).toBe('"a\\\\b"');
  });
});

describe('andClauses', () => {
  it('drops empty and whitespace-only clauses', () => {
    expect(andClauses(['a:1', '', null, undefined, '   ', 'b:2'])).toBe('a:1 AND b:2');
  });

  it('returns an empty string when everything is empty', () => {
    expect(andClauses([null, '', undefined])).toBe('');
  });
});

describe('scopeToQuery', () => {
  it('returns an empty string for an undefined scope', () => {
    expect(scopeToQuery(undefined)).toBe('');
  });

  it('emits a bare clause for a single value, without redundant parentheses', () => {
    expect(scopeToQuery({ productTypes: ['Perfume'] })).toBe('product_type:"Perfume"');
  });

  it('ORs multiple values within one field', () => {
    expect(scopeToQuery({ productTypes: ['Perfume', 'Attar'] })).toBe(
      '(product_type:"Perfume" OR product_type:"Attar")',
    );
  });

  it('ANDs across different fields', () => {
    const scope: DepartmentScope = { productTypes: ['Watch'], vendors: ['Seiko'] };
    expect(scopeToQuery(scope)).toBe('product_type:"Watch" AND vendor:"Seiko"');
  });

  it('negates excluded tags', () => {
    expect(scopeToQuery({ tags: ['Niche'], excludeTags: ['Discontinued'] })).toBe(
      'tag:"Niche" AND NOT tag:"Discontinued"',
    );
  });

  it('ignores blank values rather than emitting an empty clause', () => {
    expect(scopeToQuery({ productTypes: ['', '  ', 'Perfume'] })).toBe('product_type:"Perfume"');
  });
});

describe('buildProductQuery', () => {
  const filterFieldFor = (key: string) => {
    if (key === 'brand') return { field: 'vendor' };
    if (key === 'family') return { field: 'tag', transform: (v: string) => `family:${v.toLowerCase()}` };
    // Simulates a metafield-backed attribute, which is not server-searchable.
    return null;
  };

  it('combines scope, search term and filters', () => {
    const query = buildProductQuery({
      scope: { productTypes: ['Perfume'] },
      searchTerm: 'oud',
      filters: { values: { brand: ['Tom Ford'] } },
      filterFieldFor,
    });
    expect(query).toBe('product_type:"Perfume" AND "oud" AND vendor:"Tom Ford"');
  });

  it('applies the attribute value transform', () => {
    const query = buildProductQuery({
      filters: { values: { family: ['Woody'] } },
      filterFieldFor,
    });
    expect(query).toBe('tag:"family:woody"');
  });

  it('omits attributes that cannot be searched server-side', () => {
    const query = buildProductQuery({
      scope: { productTypes: ['Perfume'] },
      filters: { values: { longevity: ['All day'] } },
      filterFieldFor,
    });
    expect(query).toBe('product_type:"Perfume"');
  });

  it('renders a two-sided price range', () => {
    const query = buildProductQuery({
      filters: { values: {}, priceMin: 3000, priceMax: 6000 },
      filterFieldFor,
    });
    expect(query).toBe('variants.price:>=3000 AND variants.price:<=6000');
  });

  it('renders a one-sided price range', () => {
    expect(buildProductQuery({ filters: { values: {}, priceMax: 5000 }, filterFieldFor })).toBe(
      'variants.price:<=5000',
    );
    expect(buildProductQuery({ filters: { values: {}, priceMin: 5000 }, filterFieldFor })).toBe(
      'variants.price:>=5000',
    );
  });

  it('adds the stock clause only when requested', () => {
    expect(buildProductQuery({ filters: { values: {}, inStockOnly: true }, filterFieldFor })).toBe(
      'available_for_sale:true',
    );
    expect(buildProductQuery({ filters: { values: {} }, filterFieldFor })).toBe('');
  });

  it('ignores an attribute whose value list is empty', () => {
    expect(buildProductQuery({ filters: { values: { brand: [] } }, filterFieldFor })).toBe('');
  });
});

describe('countActiveFilters', () => {
  it('counts each selected value, plus price and stock as one each', () => {
    expect(
      countActiveFilters({
        values: { brand: ['A', 'B'], family: ['Woody'] },
        priceMin: 1000,
        inStockOnly: true,
      }),
    ).toBe(5);
  });

  it('counts a min-and-max price range once, not twice', () => {
    expect(countActiveFilters({ values: {}, priceMin: 1, priceMax: 2 })).toBe(1);
  });

  it('is zero for no filters', () => {
    expect(countActiveFilters({ values: {} })).toBe(0);
  });
});
