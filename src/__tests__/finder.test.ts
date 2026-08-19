import { buildFinderQuery, canAdvance, describeAnswers, rankFinderResults } from '@/finder/engine';
import type { Department, FinderConfig } from '@/catalog/types';
import type { ProductSummary } from '@/shopify/types';

function money(amount: string) {
  return { amount, currencyCode: 'INR' };
}

function product(overrides: Partial<ProductSummary> & { id: string }): ProductSummary {
  return {
    handle: overrides.id,
    title: 'Product',
    vendor: 'Vendor',
    productType: 'Perfume',
    tags: [],
    availableForSale: true,
    featuredImage: null,
    priceRange: { minVariantPrice: money('5000'), maxVariantPrice: money('5000') },
    compareAtPriceRange: { minVariantPrice: money('5000'), maxVariantPrice: money('5000') },
    ...overrides,
  };
}

const finder: FinderConfig = {
  title: 'Find your signature',
  subtitle: '',
  ctaLabel: 'Start',
  steps: [
    {
      id: 'wear',
      question: 'How should it read?',
      options: [
        { id: 'masculine', label: 'Masculine', match: { tags: ['Men'] } },
        { id: 'feminine', label: 'Feminine', match: { tags: ['Women'] } },
      ],
    },
    {
      id: 'family',
      question: 'Which family?',
      multi: true,
      options: [
        { id: 'woody', label: 'Woody', match: { tags: ['family:woody'], terms: ['cedar'] } },
        { id: 'oud', label: 'Oud', match: { tags: ['family:oud'], terms: ['oud'] } },
      ],
    },
    {
      id: 'budget',
      question: 'Budget?',
      optional: true,
      options: [{ id: 'under-6k', label: 'Under ₹6,000', match: { priceMax: 6000 } }],
    },
  ],
};

const department: Department = {
  id: 'fragrance',
  label: 'Fragrance',
  tagline: '',
  enabled: true,
  order: 1,
  scope: { productTypes: ['Perfume'] },
  attributes: [],
  finder,
  rails: [],
  defaultSortKey: 'BEST_SELLING',
};

describe('buildFinderQuery', () => {
  it('always scopes to the department and to in-stock products', () => {
    const query = buildFinderQuery(department, {});
    expect(query).toContain('product_type:"Perfume"');
    expect(query).toContain('available_for_sale:true');
  });

  it('hard-filters a decisive structural answer', () => {
    const query = buildFinderQuery(department, { wear: ['masculine'] });
    expect(query).toContain('tag:"Men"');
  });

  /**
   * Namespaced taxonomy tags are not applied to every SKU in the store, so
   * hard-filtering on them would return nothing. They must rank, not filter.
   */
  it('does not hard-filter namespaced taxonomy tags', () => {
    const query = buildFinderQuery(department, { family: ['woody'] });
    expect(query).not.toContain('family:woody');
  });

  it('does not hard-filter a multi-select answer', () => {
    const query = buildFinderQuery(department, { wear: ['masculine', 'feminine'] });
    expect(query).not.toContain('tag:"Men"');
  });

  it('applies the price ceiling from a budget answer', () => {
    const query = buildFinderQuery(department, { budget: ['under-6k'] });
    expect(query).toContain('variants.price:<=6000');
  });
});

describe('rankFinderResults', () => {
  it('ranks an exact tag match above a free-text match', () => {
    const tagged = product({ id: 'tagged', tags: ['family:oud'] });
    const textual = product({ id: 'textual', title: 'Oud Wood' });
    const ranked = rankFinderResults([textual, tagged], department, { family: ['oud'] });
    expect(ranked[0]?.product.id).toBe('tagged');
  });

  it('penalises products outside the chosen budget without dropping them', () => {
    const cheap = product({ id: 'cheap', priceRange: { minVariantPrice: money('3000'), maxVariantPrice: money('3000') } });
    const dear = product({ id: 'dear', priceRange: { minVariantPrice: money('20000'), maxVariantPrice: money('20000') } });
    const ranked = rankFinderResults([dear, cheap], department, { budget: ['under-6k'] });
    expect(ranked.map((r) => r.product.id)).toEqual(['cheap', 'dear']);
    expect(ranked).toHaveLength(2);
  });

  it('accumulates score across several answers', () => {
    const both = product({ id: 'both', tags: ['Men', 'family:oud'] });
    const one = product({ id: 'one', tags: ['Men'] });
    const ranked = rankFinderResults([one, both], department, { wear: ['masculine'], family: ['oud'] });
    expect(ranked[0]?.product.id).toBe('both');
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it('reports the answers a product satisfied', () => {
    const match = product({ id: 'm', tags: ['family:oud'] });
    const [ranked] = rankFinderResults([match], department, { family: ['oud'] });
    expect(ranked?.reasons).toContain('Oud');
  });

  /** A quiz that returns nothing is worse than one that returns a loose order. */
  it('returns every candidate even when nothing matches', () => {
    const unrelated = product({ id: 'x' });
    const ranked = rankFinderResults([unrelated], department, { family: ['oud'] });
    expect(ranked).toHaveLength(1);
  });

  it('returns the input unchanged when no answers were given', () => {
    const items = [product({ id: 'a' }), product({ id: 'b' })];
    expect(rankFinderResults(items, department, {}).map((r) => r.product.id)).toEqual(['a', 'b']);
  });
});

describe('canAdvance', () => {
  it('blocks a required step until it is answered', () => {
    const step = finder.steps[0]!;
    expect(canAdvance({}, step)).toBe(false);
    expect(canAdvance({ wear: ['masculine'] }, step)).toBe(true);
  });

  it('always allows an optional step', () => {
    expect(canAdvance({}, finder.steps[2]!)).toBe(true);
  });
});

describe('describeAnswers', () => {
  it('lists answer labels in step order', () => {
    expect(describeAnswers(finder, { family: ['oud'], wear: ['masculine'] })).toEqual([
      'Masculine',
      'Oud',
    ]);
  });
});
