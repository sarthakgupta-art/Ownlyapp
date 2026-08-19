import { andClauses, quote, scopeToQuery } from '@/catalog/query';
import type { Department, FinderConfig, FinderOption, FinderOptionMatch, FinderStep } from '@/catalog/types';
import type { ProductSummary } from '@/shopify/types';

/**
 * The discovery quiz.
 *
 * The engine is department-agnostic: it turns whatever `FinderConfig` a
 * department declares into a Storefront query plus a client-side ranking, so a
 * watch finder or a handbag finder needs no code here — only config.
 */

/** stepId -> selected option ids. */
export type FinderAnswers = Record<string, string[]>;

export function isStepAnswered(answers: FinderAnswers, step: FinderStep): boolean {
  return (answers[step.id] ?? []).length > 0;
}

export function canAdvance(answers: FinderAnswers, step: FinderStep): boolean {
  return step.optional === true || isStepAnswered(answers, step);
}

function selectedOptions(config: FinderConfig, answers: FinderAnswers): FinderOption[] {
  const out: FinderOption[] = [];
  for (const step of config.steps) {
    const ids = answers[step.id] ?? [];
    for (const id of ids) {
      const option = step.options.find((o) => o.id === id);
      if (option) out.push(option);
    }
  }
  return out;
}

/** Merges the price bounds implied by the answers. */
function priceBounds(options: FinderOption[]): { min?: number; max?: number } {
  let min: number | undefined;
  let max: number | undefined;
  for (const { match } of options) {
    if (match.priceMin != null) min = min == null ? match.priceMin : Math.min(min, match.priceMin);
    if (match.priceMax != null) max = max == null ? match.priceMax : Math.max(max, match.priceMax);
  }
  return { min, max };
}

/**
 * Builds the Storefront query used to pull the candidate pool.
 *
 * Deliberately loose: only the department scope and the price band are ANDed,
 * with the strongest single signal (the "wear" style answer) folded in when it
 * is unambiguous. Everything else is applied as *ranking*, not filtering,
 * because a hard AND across six answers on an unevenly-tagged catalogue
 * reliably returns nothing — which is a far worse result than an imperfectly
 * ordered list.
 */
export function buildFinderQuery(department: Department, answers: FinderAnswers): string {
  const config = department.finder;
  if (!config) return scopeToQuery(department.scope);

  const chosen = selectedOptions(config, answers);
  const { min, max } = priceBounds(chosen);

  const clauses: (string | null)[] = [scopeToQuery(department.scope)];

  // Fold in tag constraints only where a single value was chosen for a step,
  // so a decisive answer narrows and an exploratory one does not.
  for (const step of config.steps) {
    const ids = answers[step.id] ?? [];
    if (ids.length !== 1) continue;
    const option = step.options.find((o) => o.id === ids[0]);
    const tags = option?.match.tags ?? [];
    // Only structural tags ("Men", "Women", "Unisex") are safe to hard-filter;
    // namespaced taxonomy tags may simply not be applied to a given SKU yet.
    const structural = tags.filter((t) => !t.includes(':'));
    if (structural.length > 0) {
      clauses.push(`(${structural.map((t) => `tag:${quote(t)}`).join(' OR ')})`);
    }
  }

  if (min != null) clauses.push(`variants.price:>=${min}`);
  if (max != null) clauses.push(`variants.price:<=${max}`);
  clauses.push('available_for_sale:true');

  return andClauses(clauses);
}

function matchStrength(product: ProductSummary, match: FinderOptionMatch): number {
  let score = 0;
  const tags = product.tags.map((t) => t.toLowerCase());
  const haystack = `${product.title} ${product.vendor} ${product.productType} ${product.tags.join(' ')}`.toLowerCase();

  for (const tag of match.tags ?? []) {
    if (tags.includes(tag.toLowerCase())) score += 3;
  }
  for (const vendor of match.vendors ?? []) {
    if (product.vendor.toLowerCase() === vendor.toLowerCase()) score += 3;
  }
  for (const type of match.productTypes ?? []) {
    if (product.productType.toLowerCase() === type.toLowerCase()) score += 2;
  }
  // Free-text terms are the weakest signal — they catch "Oud Wood" for an oud
  // answer when no taxonomy tag exists, but should never outrank a real tag.
  for (const term of match.terms ?? []) {
    if (haystack.includes(term.toLowerCase())) score += 1;
  }

  const price = Number(product.priceRange.minVariantPrice.amount);
  if (Number.isFinite(price)) {
    if (match.priceMin != null && price < match.priceMin) score -= 2;
    if (match.priceMax != null && price > match.priceMax) score -= 2;
  }
  return score;
}

export interface FinderMatch {
  product: ProductSummary;
  score: number;
  /** Labels of the answers this product satisfied, shown as "why we picked it". */
  reasons: string[];
}

/**
 * Ranks the candidate pool against the answers.
 *
 * Results are always returned, even at score zero, so the quiz never dead-ends;
 * the score just decides the order and which reasons are shown.
 */
export function rankFinderResults(
  products: ProductSummary[],
  department: Department,
  answers: FinderAnswers,
): FinderMatch[] {
  const config = department.finder;
  if (!config) return products.map((product) => ({ product, score: 0, reasons: [] }));

  const chosen = selectedOptions(config, answers);
  if (chosen.length === 0) return products.map((product) => ({ product, score: 0, reasons: [] }));

  return products
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];
      for (const option of chosen) {
        const strength = matchStrength(product, option.match);
        score += strength;
        if (strength >= 2) reasons.push(option.label);
      }
      return { product, score, reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score);
}

/** Compact human summary of the answers, shown above the results. */
export function describeAnswers(config: FinderConfig, answers: FinderAnswers): string[] {
  const out: string[] = [];
  for (const step of config.steps) {
    const ids = answers[step.id] ?? [];
    for (const id of ids) {
      const option = step.options.find((o) => o.id === id);
      if (option) out.push(option.label);
    }
  }
  return out;
}
