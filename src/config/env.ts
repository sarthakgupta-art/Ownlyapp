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
    EXPO_PUBLIC_SHOPIFY_SHOP_ID: process.env.EXPO_PUBLIC_SHOPIFY_SHOP_ID,
    EXPO_PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID: process.env.EXPO_PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID,
    EXPO_PUBLIC_CUSTOMER_ACCOUNT_REDIRECT_URI: process.env.EXPO_PUBLIC_CUSTOMER_ACCOUNT_REDIRECT_URI,
    EXPO_PUBLIC_CUSTOMER_API_VERSION: process.env.EXPO_PUBLIC_CUSTOMER_API_VERSION,
  };
  return (table[key] ?? '').trim();
}

const storeDomain = readEnv('EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN');
const storefrontToken = readEnv('EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN');
const customerClientId = readEnv('EXPO_PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID');

export const env = {
  storeDomain,
  storefrontToken,
  /**
   * Shopify supports roughly the last four quarterly versions. A request to a
   * retired version is silently served by the oldest supported one instead of
   * failing, so pinning a stale version here would quietly change behaviour
   * rather than error. Keep this within a year of the current release.
   */
  apiVersion: readEnv('EXPO_PUBLIC_SHOPIFY_API_VERSION') || '2026-07',
  storefrontUrl: (readEnv('EXPO_PUBLIC_STOREFRONT_URL') || 'https://ownlyclub.in').replace(/\/$/, ''),
  pushRegistrationUrl: readEnv('EXPO_PUBLIC_PUSH_REGISTRATION_URL'),

  /** Numeric shop id, used to derive Customer Account API endpoints if the
   *  well-known discovery documents cannot be reached. */
  shopId: readEnv('EXPO_PUBLIC_SHOPIFY_SHOP_ID'),
  /** Public OAuth client id from Shopify admin → Customer accounts → API. */
  customerClientId,
  /** Must exactly match a callback URI allow-listed in that same settings page. */
  customerRedirectUri:
    readEnv('EXPO_PUBLIC_CUSTOMER_ACCOUNT_REDIRECT_URI') || 'ownly://auth/callback',
  customerApiVersion: readEnv('EXPO_PUBLIC_CUSTOMER_API_VERSION') || '2026-07',
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

/**
 * Account features (sign in, orders, addresses, profile) need their own OAuth
 * client, separate from the Storefront token. When it is absent the app hides
 * those surfaces rather than showing a sign-in button that cannot work.
 */
export const isCustomerAccountsConfigured = customerClientId.length > 0;
