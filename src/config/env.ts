/**
 * Runtime configuration, read once from the Expo public env vars.
 *
 * Anything in here ships inside the JS bundle and is therefore public. The
 * Storefront API token is explicitly designed for that; an Admin API token
 * never belongs in this file.
 */

function readEnv(key: string): string {
  // `process.env.EXPO_PUBLIC_*` is statically inlined by Metro, so it must be
  // referenced with a literal member expression rather than a dynamic lookup.
  const table: Record<string, string | undefined> = {
    EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN: process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN,
    EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN: process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN,
    EXPO_PUBLIC_SHOPIFY_API_VERSION: process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION,
    EXPO_PUBLIC_STOREFRONT_URL: process.env.EXPO_PUBLIC_STOREFRONT_URL,
    EXPO_PUBLIC_PUSH_REGISTRATION_URL: process.env.EXPO_PUBLIC_PUSH_REGISTRATION_URL,
  };
  return (table[key] ?? '').trim();
}

const storeDomain = readEnv('EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN');
const storefrontToken = readEnv('EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN');

export const env = {
  storeDomain,
  storefrontToken,
  apiVersion: readEnv('EXPO_PUBLIC_SHOPIFY_API_VERSION') || '2025-07',
  storefrontUrl: (readEnv('EXPO_PUBLIC_STOREFRONT_URL') || 'https://ownlyclub.in').replace(/\/$/, ''),
  pushRegistrationUrl: readEnv('EXPO_PUBLIC_PUSH_REGISTRATION_URL'),
  /** Currency the storefront prices in. Shopify still returns the real code per price. */
  fallbackCurrency: 'INR',
  supportEmail: 'support@ownlyclub.in',
} as const;

/**
 * True when the app has everything it needs to talk to Shopify. The UI shows a
 * setup screen instead of a blank catalogue when this is false, which is a much
 * better first-run experience than a wall of network errors.
 */
export const isShopifyConfigured = storeDomain.length > 0 && storefrontToken.length > 0;

export const storefrontEndpoint = `https://${storeDomain}/api/${env.apiVersion}/graphql.json`;
