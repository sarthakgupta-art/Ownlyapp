import type { Money } from '@/shopify/types';

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  const cached = formatterCache.get(currency);
  if (cached) return cached;
  // `en-IN` gives the lakh/crore grouping Indian buyers expect (₹1,20,000).
  const created = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  formatterCache.set(currency, created);
  return created;
}

export function formatMoney(money: Money | null | undefined): string {
  if (!money) return '';
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  try {
    return formatter(money.currencyCode).format(amount);
  } catch {
    return `${money.currencyCode} ${Math.round(amount)}`;
  }
}

export function formatPriceRange(min: Money, max: Money): string {
  if (min.amount === max.amount) return formatMoney(min);
  return `${formatMoney(min)} – ${formatMoney(max)}`;
}

/** Percentage saved, or null when there is no genuine markdown. */
export function discountPercent(price: Money, compareAt: Money | null | undefined): number | null {
  if (!compareAt) return null;
  const now = Number(price.amount);
  const was = Number(compareAt.amount);
  if (!Number.isFinite(now) || !Number.isFinite(was) || was <= now || was <= 0) return null;
  return Math.round(((was - now) / was) * 100);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/**
 * Shopify descriptions arrive as HTML. The PDP renders the plain-text form,
 * which keeps typography consistent and avoids shipping a WebView per product.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    // Paragraph-level tags get a blank line; without it a multi-paragraph
    // Shopify description renders as one run-on block.
    .replace(/<\/\s*(p|div|h[1-6])\s*>/gi, '\n\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Turns `gid://shopify/Product/123` into `123`. */
export function gidToId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] ?? gid;
}
