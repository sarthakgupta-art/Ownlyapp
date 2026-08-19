import type { Department } from './types';

/**
 * ---------------------------------------------------------------------------
 * DEPARTMENT REGISTRY
 * ---------------------------------------------------------------------------
 *
 * Fragrance and beauty are live today. Watches, handbags and fashion are
 * already defined but disabled — flip `enabled: true` once the Shopify
 * catalogue carries products for them and the app picks them up everywhere:
 * the shop tab, the home screen, filters, the PDP specs table and the finder
 * quiz. No screen code changes.
 *
 * To add a brand-new vertical:
 *   1. Append a `Department` object below.
 *   2. Point `scope` at the product types / tags that identify it.
 *   3. List the `attributes` its product pages should show and filter on.
 *   4. Optionally give it a `finder` quiz and some home `rails`.
 * ---------------------------------------------------------------------------
 */

const fragrance: Department = {
  id: 'fragrance',
  label: 'Fragrance',
  tagline: 'Designer and niche houses, sourced worldwide',
  enabled: true,
  order: 1,
  // Product types below are the ones the live Shopify catalogue actually uses.
  // Verify with: shop { productTypes(first: 60) } before adding to this list —
  // a product type that does not exist silently matches nothing.
  scope: {
    productTypes: ['Perfume', 'Perfumes', 'Body mist', 'Aftershave', 'Gift set'],
  },
  defaultSortKey: 'BEST_SELLING',
  attributes: [
    { key: 'brand', label: 'Brand', sources: [{ kind: 'vendor' }], inSpecs: true, inFilters: true, order: 1 },
    {
      key: 'concentration',
      label: 'Concentration',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'concentration' },
        { kind: 'tagPrefix', prefix: 'concentration:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 2,
    },
    {
      key: 'size',
      label: 'Size',
      sources: [{ kind: 'option', name: 'Size' }, { kind: 'tagPrefix', prefix: 'size:' }],
      inSpecs: true,
      inFilters: true,
      display: 'measurement',
      order: 3,
    },
    {
      key: 'gender',
      label: 'Wear',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'gender' },
        { kind: 'tagPrefix', prefix: 'gender:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 4,
    },
    {
      key: 'family',
      label: 'Scent family',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'fragrance_family' },
        { kind: 'tagPrefix', prefix: 'family:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 5,
    },
    {
      key: 'notes',
      label: 'Notes',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'notes' },
        { kind: 'tagPrefix', prefix: 'note:' },
      ],
      multi: true,
      display: 'chips',
      inSpecs: true,
      inFilters: true,
      order: 6,
    },
    {
      key: 'longevity',
      label: 'Longevity',
      sources: [{ kind: 'metafield', namespace: 'custom', key: 'longevity' }],
      inSpecs: true,
      order: 7,
    },
    {
      key: 'occasion',
      label: 'Occasion',
      sources: [{ kind: 'tagPrefix', prefix: 'occasion:' }],
      multi: true,
      display: 'chips',
      inSpecs: true,
      inFilters: true,
      order: 8,
    },
  ],
  rails: [
    { id: 'bestsellers', title: 'Most wanted', subtitle: 'What Ownly members are buying now', sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'new', title: 'Just landed', subtitle: 'Freshly sourced this month', sortKey: 'CREATED_AT', reverse: true, limit: 12 },
    { id: 'gifting', title: 'Gift sets', subtitle: 'Ready to give, beautifully boxed', scope: { productTypes: ['Gift set'] }, sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'for-him', title: 'For him', scope: { tags: ['Men'] }, sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'for-her', title: 'For her', scope: { tags: ['Women'] }, sortKey: 'BEST_SELLING', limit: 12 },
  ],
  finder: {
    title: 'Find your signature',
    subtitle: 'Six quick questions. We read your answers against the whole Ownly catalogue.',
    ctaLabel: 'Start the scent finder',
    steps: [
      {
        id: 'who',
        question: 'Who is this for?',
        options: [
          { id: 'me', label: 'Myself', match: {} },
          { id: 'gift-her', label: 'A gift for her', match: { tags: ['Women'] } },
          { id: 'gift-him', label: 'A gift for him', match: { tags: ['Men'] } },
          { id: 'gift-any', label: 'A gift, unsure of taste', match: { tags: ['Unisex', 'Gift Set'] } },
        ],
      },
      {
        id: 'wear',
        question: 'How should it read?',
        helper: 'There is no wrong answer — plenty of houses sit happily in the middle.',
        options: [
          { id: 'feminine', label: 'Feminine', match: { tags: ['Women'] } },
          { id: 'masculine', label: 'Masculine', match: { tags: ['Men'] } },
          { id: 'unisex', label: 'Unisex', match: { tags: ['Unisex'] } },
        ],
      },
      {
        id: 'family',
        question: 'Which of these appeals most?',
        helper: 'Pick as many as you like.',
        multi: true,
        options: [
          { id: 'fresh', label: 'Fresh & citrus', description: 'Bergamot, lemon, sea air', match: { tags: ['family:fresh', 'family:citrus'], terms: ['citrus', 'aqua', 'fresh'] } },
          { id: 'floral', label: 'Floral', description: 'Rose, jasmine, tuberose', match: { tags: ['family:floral'], terms: ['floral', 'rose', 'jasmine'] } },
          { id: 'woody', label: 'Woody', description: 'Cedar, vetiver, sandalwood', match: { tags: ['family:woody'], terms: ['wood', 'cedar', 'vetiver', 'sandal'] } },
          { id: 'oriental', label: 'Amber & spice', description: 'Vanilla, amber, cardamom', match: { tags: ['family:oriental', 'family:amber'], terms: ['amber', 'oud', 'spice', 'vanilla'] } },
          { id: 'gourmand', label: 'Sweet & gourmand', description: 'Caramel, cocoa, praline', match: { tags: ['family:gourmand'], terms: ['gourmand', 'vanilla', 'caramel'] } },
          { id: 'oud', label: 'Oud & resins', description: 'Deep, smoky, long-wearing', match: { tags: ['family:oud'], terms: ['oud', 'agarwood', 'incense'] } },
        ],
      },
      {
        id: 'occasion',
        question: 'When will you wear it?',
        multi: true,
        optional: true,
        options: [
          { id: 'daily', label: 'Every day', match: { tags: ['occasion:daily'] } },
          { id: 'office', label: 'Work', match: { tags: ['occasion:office'] } },
          { id: 'evening', label: 'Evenings out', match: { tags: ['occasion:evening'] } },
          { id: 'special', label: 'Weddings & occasions', match: { tags: ['occasion:special'] } },
          { id: 'summer', label: 'Indian summer', match: { tags: ['occasion:summer'] } },
        ],
      },
      {
        id: 'intensity',
        question: 'How much presence do you want?',
        optional: true,
        options: [
          { id: 'soft', label: 'Close to the skin', match: { tags: ['concentration:edt', 'concentration:cologne'], terms: ['eau de toilette', 'cologne'] } },
          { id: 'balanced', label: 'Noticeable, not loud', match: { tags: ['concentration:edp'], terms: ['eau de parfum'] } },
          { id: 'strong', label: 'Fills the room', match: { tags: ['concentration:parfum', 'concentration:extrait'], terms: ['extrait', 'parfum', 'intense'] } },
        ],
      },
      {
        id: 'budget',
        question: 'What are you comfortable spending?',
        optional: true,
        options: [
          { id: 'under-3k', label: 'Under ₹3,000', match: { priceMax: 3000 } },
          { id: '3k-6k', label: '₹3,000 – ₹6,000', match: { priceMin: 3000, priceMax: 6000 } },
          { id: '6k-12k', label: '₹6,000 – ₹12,000', match: { priceMin: 6000, priceMax: 12000 } },
          { id: '12k-plus', label: '₹12,000 and above', match: { priceMin: 12000 } },
        ],
      },
    ],
  },
  emptyStateCopy: 'No fragrances match that combination yet. Try loosening a filter.',
};

const beauty: Department = {
  id: 'beauty',
  label: 'Beauty & Skincare',
  tagline: 'Skin, body and hair from the houses you already trust',
  enabled: true,
  order: 2,
  scope: {
    productTypes: [
      // Makeup
      'Blush', 'Bronzer', 'Concealer', 'Eyebrow gel', 'Eyebrow pencil', 'Eyeliner',
      'Eyeshadow', 'Face powder', 'Face primer', 'Foundation', 'Highlighter',
      'Lip balm', 'Lip gloss', 'Lip liner', 'Lipstick', 'Mascara', 'Nail polish',
      'Setting spray',
      // Skincare
      'Anti-ageing treatment', 'Eye cream', 'Eye mask', 'Eye serum', 'Face cleanser',
      'Face mask', 'Face moisturizer', 'Face scrub', 'Face serum', 'Skincare set',
      'Sunscreen', 'Toner',
      // Body & hair
      'Beard Care', 'Body lotion', 'Body moisturiser', 'Body moisturizer',
      'Body powder', 'Body scrub', 'Body wash', 'Conditioner', 'Deodorant',
      'Hair oil', 'Hair serum', 'Hair treatment', 'Hand cream', 'Heat protectant',
      'Shampoo',
    ],
  },
  defaultSortKey: 'BEST_SELLING',
  attributes: [
    { key: 'brand', label: 'Brand', sources: [{ kind: 'vendor' }], inSpecs: true, inFilters: true, order: 1 },
    { key: 'category', label: 'Category', sources: [{ kind: 'productType' }], inSpecs: true, inFilters: true, order: 2 },
    {
      key: 'concern',
      label: 'Targets',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'skin_concern' },
        { kind: 'tagPrefix', prefix: 'concern:' },
      ],
      multi: true,
      display: 'chips',
      inSpecs: true,
      inFilters: true,
      order: 3,
    },
    {
      key: 'skinType',
      label: 'Skin type',
      sources: [{ kind: 'tagPrefix', prefix: 'skin:' }],
      multi: true,
      inSpecs: true,
      inFilters: true,
      order: 4,
    },
    {
      key: 'keyIngredient',
      label: 'Key ingredients',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'key_ingredients' },
        { kind: 'tagPrefix', prefix: 'ingredient:' },
      ],
      multi: true,
      display: 'chips',
      inSpecs: true,
      inFilters: true,
      order: 5,
    },
    { key: 'volume', label: 'Size', sources: [{ kind: 'option', name: 'Size' }], inSpecs: true, display: 'measurement', order: 6 },
  ],
  rails: [
    { id: 'beauty-best', title: 'Beauty bestsellers', sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'beauty-new', title: 'New in beauty', sortKey: 'CREATED_AT', reverse: true, limit: 12 },
  ],
  emptyStateCopy: 'Nothing in beauty matches that yet. Try a different filter.',
};

/**
 * -------------------------------------------------------------------
 * Future verticals. Disabled until the catalogue carries the products.
 * Flip `enabled` and the whole app picks them up.
 * -------------------------------------------------------------------
 */

const watches: Department = {
  id: 'watches',
  label: 'Watches',
  tagline: 'Swiss, Japanese and microbrand, authenticated',
  enabled: false,
  order: 3,
  scope: { productTypes: ['Watch'] },
  defaultSortKey: 'BEST_SELLING',
  attributes: [
    { key: 'brand', label: 'Brand', sources: [{ kind: 'vendor' }], inSpecs: true, inFilters: true, order: 1 },
    {
      key: 'movement',
      label: 'Movement',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'movement' },
        { kind: 'tagPrefix', prefix: 'movement:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 2,
    },
    {
      key: 'caseSize',
      label: 'Case size',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'case_size' },
        { kind: 'tagPrefix', prefix: 'case:' },
      ],
      unit: 'mm',
      display: 'measurement',
      inSpecs: true,
      inFilters: true,
      order: 3,
    },
    {
      key: 'caseMaterial',
      label: 'Case material',
      sources: [{ kind: 'tagPrefix', prefix: 'material:' }],
      inSpecs: true,
      inFilters: true,
      order: 4,
    },
    { key: 'strap', label: 'Strap', sources: [{ kind: 'tagPrefix', prefix: 'strap:' }], inSpecs: true, inFilters: true, order: 5 },
    {
      key: 'waterResistance',
      label: 'Water resistance',
      sources: [{ kind: 'metafield', namespace: 'custom', key: 'water_resistance' }],
      inSpecs: true,
      order: 6,
    },
    {
      key: 'complications',
      label: 'Complications',
      sources: [{ kind: 'tagPrefix', prefix: 'complication:' }],
      multi: true,
      display: 'chips',
      inSpecs: true,
      inFilters: true,
      order: 7,
    },
  ],
  rails: [
    { id: 'watch-best', title: 'Most wanted watches', sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'watch-new', title: 'New arrivals', sortKey: 'CREATED_AT', reverse: true, limit: 12 },
  ],
  finder: {
    title: 'Find your watch',
    subtitle: 'Tell us how you wear it and we will shortlist the case.',
    ctaLabel: 'Start the watch finder',
    steps: [
      {
        id: 'style',
        question: 'What kind of watch are you after?',
        multi: true,
        options: [
          { id: 'dress', label: 'Dress', match: { tags: ['style:dress'] } },
          { id: 'dive', label: 'Dive & sport', match: { tags: ['style:dive', 'style:sport'] } },
          { id: 'field', label: 'Field', match: { tags: ['style:field'] } },
          { id: 'chrono', label: 'Chronograph', match: { tags: ['complication:chronograph'] } },
        ],
      },
      {
        id: 'movement',
        question: 'Movement preference?',
        optional: true,
        options: [
          { id: 'automatic', label: 'Automatic', match: { tags: ['movement:automatic'] } },
          { id: 'quartz', label: 'Quartz', match: { tags: ['movement:quartz'] } },
          { id: 'either', label: 'No preference', match: {} },
        ],
      },
      {
        id: 'case',
        question: 'Wrist size?',
        optional: true,
        options: [
          { id: 'small', label: 'Slim — under 38mm', match: { tags: ['case:36', 'case:37', 'case:38'] } },
          { id: 'medium', label: 'Standard — 38 to 42mm', match: { tags: ['case:39', 'case:40', 'case:41', 'case:42'] } },
          { id: 'large', label: 'Large — 42mm and up', match: { tags: ['case:43', 'case:44', 'case:45'] } },
        ],
      },
      {
        id: 'budget',
        question: 'Budget?',
        optional: true,
        options: [
          { id: 'under-25k', label: 'Under ₹25,000', match: { priceMax: 25000 } },
          { id: '25k-75k', label: '₹25,000 – ₹75,000', match: { priceMin: 25000, priceMax: 75000 } },
          { id: '75k-plus', label: '₹75,000 and above', match: { priceMin: 75000 } },
        ],
      },
    ],
  },
  emptyStateCopy: 'No watches match that yet.',
};

const handbags: Department = {
  id: 'handbags',
  label: 'Handbags',
  tagline: 'Shoulder, tote and evening, sourced from Europe',
  enabled: false,
  order: 4,
  scope: { productTypes: ['Crossbody bag', 'Shoulder bag', 'Briefcase', 'Wallet'] },
  defaultSortKey: 'BEST_SELLING',
  attributes: [
    { key: 'brand', label: 'Brand', sources: [{ kind: 'vendor' }], inSpecs: true, inFilters: true, order: 1 },
    { key: 'style', label: 'Style', sources: [{ kind: 'tagPrefix', prefix: 'style:' }], inSpecs: true, inFilters: true, order: 2 },
    {
      key: 'material',
      label: 'Material',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'material' },
        { kind: 'tagPrefix', prefix: 'material:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 3,
    },
    { key: 'colour', label: 'Colour', sources: [{ kind: 'option', name: 'Colour' }, { kind: 'option', name: 'Color' }], inSpecs: true, inFilters: true, order: 4 },
    {
      key: 'dimensions',
      label: 'Dimensions',
      sources: [{ kind: 'metafield', namespace: 'custom', key: 'dimensions' }],
      inSpecs: true,
      display: 'measurement',
      order: 5,
    },
    { key: 'hardware', label: 'Hardware', sources: [{ kind: 'tagPrefix', prefix: 'hardware:' }], inSpecs: true, inFilters: true, order: 6 },
  ],
  rails: [
    { id: 'bag-best', title: 'Most wanted bags', sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'bag-new', title: 'New arrivals', sortKey: 'CREATED_AT', reverse: true, limit: 12 },
  ],
  emptyStateCopy: 'No handbags match that yet.',
};

const fashion: Department = {
  id: 'fashion',
  label: 'Fashion',
  tagline: 'Ready-to-wear, eyewear and accessories',
  enabled: false,
  order: 5,
  scope: { productTypes: ['Apparel', 'Clothing', 'Eyewear', 'Sunglasses', 'Footwear', 'Accessories'] },
  defaultSortKey: 'BEST_SELLING',
  attributes: [
    { key: 'brand', label: 'Brand', sources: [{ kind: 'vendor' }], inSpecs: true, inFilters: true, order: 1 },
    { key: 'category', label: 'Category', sources: [{ kind: 'productType' }], inSpecs: true, inFilters: true, order: 2 },
    { key: 'size', label: 'Size', sources: [{ kind: 'option', name: 'Size' }], inSpecs: true, inFilters: true, order: 3 },
    { key: 'colour', label: 'Colour', sources: [{ kind: 'option', name: 'Colour' }, { kind: 'option', name: 'Color' }], inSpecs: true, inFilters: true, order: 4 },
    {
      key: 'fabric',
      label: 'Fabric',
      sources: [
        { kind: 'metafield', namespace: 'custom', key: 'fabric' },
        { kind: 'tagPrefix', prefix: 'fabric:' },
      ],
      inSpecs: true,
      inFilters: true,
      order: 5,
    },
    { key: 'fit', label: 'Fit', sources: [{ kind: 'tagPrefix', prefix: 'fit:' }], inSpecs: true, inFilters: true, order: 6 },
  ],
  rails: [
    { id: 'fashion-best', title: 'Most wanted', sortKey: 'BEST_SELLING', limit: 12 },
    { id: 'fashion-new', title: 'New arrivals', sortKey: 'CREATED_AT', reverse: true, limit: 12 },
  ],
  emptyStateCopy: 'Nothing in fashion matches that yet.',
};

const REGISTRY: Department[] = [fragrance, beauty, watches, handbags, fashion];

/** Every department, including disabled ones. Ordered for display. */
export const allDepartments: Department[] = [...REGISTRY].sort((a, b) => a.order - b.order);

/** Departments the app should show. */
export const departments: Department[] = allDepartments.filter((d) => d.enabled);

export function getDepartment(id: string | undefined | null): Department | undefined {
  if (!id) return undefined;
  return REGISTRY.find((d) => d.id === id);
}

/** The department the app opens on, and the fallback whenever none is chosen. */
export const primaryDepartment: Department = departments[0] ?? allDepartments[0]!;

/** Departments that expose a discovery quiz. */
export const departmentsWithFinder: Department[] = departments.filter((d) => d.finder != null);

/**
 * Best-effort guess of which department a product belongs to, used to pick the
 * right specs table on a product page reached from search or a deep link.
 */
export function inferDepartment(product: { productType: string; tags: string[] }): Department {
  const type = product.productType.trim().toLowerCase();
  const tags = product.tags.map((t) => t.trim().toLowerCase());

  for (const dept of departments) {
    const types = dept.scope.productTypes?.map((t) => t.toLowerCase()) ?? [];
    if (type && types.includes(type)) return dept;
  }
  for (const dept of departments) {
    const wanted = dept.scope.tags?.map((t) => t.toLowerCase()) ?? [];
    if (wanted.some((t) => tags.includes(t))) return dept;
  }
  return primaryDepartment;
}
