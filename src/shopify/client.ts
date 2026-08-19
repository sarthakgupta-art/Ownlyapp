import { env, isShopifyConfigured, storefrontEndpoint } from '@/config/env';

/** A GraphQL error returned in the `errors` array of a Storefront response. */
interface GraphQLError {
  message: string;
  extensions?: { code?: string };
}

export class ShopifyError extends Error {
  readonly kind: 'network' | 'graphql' | 'userError' | 'config';
  readonly detail?: unknown;

  constructor(kind: ShopifyError['kind'], message: string, detail?: unknown) {
    super(message);
    this.name = 'ShopifyError';
    this.kind = kind;
    this.detail = detail;
  }
}

/**
 * Shopify returns `userErrors` on mutations for expected, user-facing problems
 * (wrong password, out of stock, invalid discount code). Those are surfaced as
 * a distinct error kind so the UI can show the message verbatim rather than a
 * generic "something went wrong".
 */
export interface UserError {
  field: string[] | null;
  message: string;
  code?: string | null;
}

export function assertNoUserErrors(errors: UserError[] | null | undefined): void {
  if (errors && errors.length > 0) {
    const first = errors[0]!;
    throw new ShopifyError('userError', first.message, errors);
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RequestOptions {
  /**
   * Set to `false` for mutations that must never be replayed. Retrying a
   * transport failure on e.g. `cartLinesAdd` could double a line the server
   * already accepted, so those callers opt out.
   */
  idempotent?: boolean;
}

/**
 * Executes a Storefront GraphQL operation.
 *
 * Retries only on transport failures and 429/5xx, never on a 4xx or a GraphQL
 * error, so a mutation that Shopify actually processed is not replayed.
 */
export async function storefront<TData>(
  query: string,
  variables: Record<string, unknown> = {},
  options: RequestOptions = {},
): Promise<TData> {
  if (!isShopifyConfigured) {
    throw new ShopifyError(
      'config',
      'Shopify is not configured. Set EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN and EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN.',
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Shopify-Storefront-Access-Token': env.storefrontToken,
  };
  const body = JSON.stringify({ query, variables });
  const maxAttempts = options.idempotent === false ? 1 : MAX_ATTEMPTS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(storefrontEndpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
          const retryAfter = Number(response.headers.get('Retry-After'));
          await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250);
          continue;
        }
        throw new ShopifyError('network', `Storefront request failed (${response.status}).`, response.status);
      }

      const json = (await response.json()) as { data?: TData; errors?: GraphQLError[] };

      if (json.errors && json.errors.length > 0) {
        const first = json.errors[0]!;
        throw new ShopifyError('graphql', first.message, json.errors);
      }
      if (!json.data) {
        throw new ShopifyError('graphql', 'Storefront returned no data.');
      }
      return json.data;
    } catch (error) {
      lastError = error;
      // A ShopifyError thrown above is already final — do not retry it.
      if (error instanceof ShopifyError) throw error;
      if (attempt < maxAttempts) {
        await delay(2 ** attempt * 250);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const message =
    lastError instanceof Error && lastError.name === 'AbortError'
      ? 'The request timed out. Check your connection and try again.'
      : 'Could not reach the store. Check your connection and try again.';
  throw new ShopifyError('network', message, lastError);
}

/** Human-readable message for any error thrown out of this module. */
export function describeError(error: unknown): string {
  if (error instanceof ShopifyError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
