import { env } from '@/config/env';
import { storageKeys, store } from '@/lib/storage';

/**
 * Endpoint discovery for the Customer Account API.
 *
 * Shopify publishes its OAuth and GraphQL endpoints at well-known URLs on the
 * storefront domain and explicitly recommends reading them rather than
 * hard-coding, so the integration survives changes to Shopify's own
 * infrastructure. Discovery is attempted first; the constants below are only a
 * fallback for the offline / first-run case.
 */

export interface CustomerEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  logoutEndpoint: string;
  graphqlEndpoint: string;
}

/**
 * Derived from the shop id. Used only when discovery fails — Shopify's docs
 * warn these can change, which is exactly why discovery is preferred.
 */
function fallbackEndpoints(): CustomerEndpoints | null {
  const shopId = env.shopId;
  if (!shopId) return null;
  return {
    authorizationEndpoint: `https://shopify.com/authentication/${shopId}/oauth/authorize`,
    tokenEndpoint: `https://shopify.com/authentication/${shopId}/oauth/token`,
    logoutEndpoint: `https://shopify.com/authentication/${shopId}/logout`,
    graphqlEndpoint: `https://shopify.com/${shopId}/account/customer/api/${env.customerApiVersion}/graphql`,
  };
}

interface OpenIdConfiguration {
  authorization_endpoint?: string;
  token_endpoint?: string;
  end_session_endpoint?: string;
}

interface CustomerAccountApiConfiguration {
  graphql_api?: string;
}

let cached: CustomerEndpoints | null = null;
let inflight: Promise<CustomerEndpoints | null> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function discover(): Promise<CustomerEndpoints | null> {
  const base = env.storefrontUrl;

  const [openId, accountApi] = await Promise.all([
    fetchJson<OpenIdConfiguration>(`${base}/.well-known/openid-configuration`),
    fetchJson<CustomerAccountApiConfiguration>(`${base}/.well-known/customer-account-api`),
  ]);

  const fallback = fallbackEndpoints();

  const authorizationEndpoint = openId?.authorization_endpoint ?? fallback?.authorizationEndpoint;
  const tokenEndpoint = openId?.token_endpoint ?? fallback?.tokenEndpoint;
  const logoutEndpoint = openId?.end_session_endpoint ?? fallback?.logoutEndpoint;
  const graphqlEndpoint = accountApi?.graphql_api ?? fallback?.graphqlEndpoint;

  if (!authorizationEndpoint || !tokenEndpoint || !logoutEndpoint || !graphqlEndpoint) return null;
  return { authorizationEndpoint, tokenEndpoint, logoutEndpoint, graphqlEndpoint };
}

/**
 * Resolves the endpoints, preferring a live discovery, then the last successful
 * discovery from disk, then the derived fallback. Concurrent callers share one
 * request.
 */
export async function getCustomerEndpoints(): Promise<CustomerEndpoints | null> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const persisted = await store.get<CustomerEndpoints>(storageKeys.customerEndpoints);
    const discovered = await discover();

    const resolved = discovered ?? persisted ?? fallbackEndpoints();
    if (discovered) await store.set(storageKeys.customerEndpoints, discovered);
    cached = resolved;
    return resolved;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Test seam and a way to force a re-discovery after a config change. */
export function resetEndpointCache(): void {
  cached = null;
  inflight = null;
}
