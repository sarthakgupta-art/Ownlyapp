#!/usr/bin/env node
/**
 * Configuration check.
 *
 * Verifies that everything in `.env` actually works, before the app is run.
 * A wrong Storefront token surfaces inside the app as an empty catalogue and a
 * generic network error, which is a slow way to learn you pasted the Admin
 * token by mistake. This says so directly.
 *
 *   npm run doctor
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const C = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

let failures = 0;

const pass = (msg, detail) =>
  console.log(`${C.green}  ok  ${C.reset} ${msg}${detail ? ` ${C.dim}${detail}${C.reset}` : ''}`);

const fail = (msg, detail) => {
  failures += 1;
  console.log(`${C.red} FAIL ${C.reset} ${msg}${detail ? `\n        ${C.dim}${detail}${C.reset}` : ''}`);
};

const skip = (msg, detail) =>
  console.log(`${C.yellow} skip ${C.reset} ${msg}${detail ? `\n        ${C.dim}${detail}${C.reset}` : ''}`);

async function loadEnv() {
  let raw;
  try {
    raw = await readFile(resolve(ROOT, '.env'), 'utf8');
  } catch {
    console.log(`${C.red} FAIL ${C.reset} .env not found`);
    console.log(`        ${C.dim}Run: cp .env.example .env   then fill in the values.${C.reset}\n`);
    process.exit(1);
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

/** Every network call is bounded, so a blocked host cannot hang the check. */
async function withTimeout(url, options = {}, ms = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkStorefront(env) {
  const domain = env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  const version = env.EXPO_PUBLIC_SHOPIFY_API_VERSION || '2026-07';

  if (!domain) {
    fail('Store domain is not set', 'EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN');
    return;
  }
  if (!domain.endsWith('.myshopify.com')) {
    fail(
      'Store domain must be the myshopify domain',
      `Got "${domain}". The Storefront API does not answer on a custom domain.`,
    );
    return;
  }
  if (!token) {
    fail('Storefront token is not set', 'EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN');
    return;
  }
  // Pasting the Admin token here is the classic mistake, and it is recognisable.
  if (/^shp(at|ca|ss|pa)_/.test(token)) {
    fail(
      'That looks like an Admin API token, not a Storefront token',
      'Storefront tokens are a plain 32-character hex string and are safe to ship publicly.',
    );
    return;
  }

  const endpoint = `https://${domain}/api/${version}/graphql.json`;
  try {
    const response = await withTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({
        query: '{ shop { name } products(first: 1) { nodes { title } } }',
      }),
    });

    if (response.status === 401 || response.status === 403) {
      fail(
        `Storefront token rejected (${response.status})`,
        'Check the token, and that the app or Headless storefront is installed on the store.',
      );
      return;
    }
    if (!response.ok) {
      fail(`Storefront API returned ${response.status}`, `Endpoint: ${endpoint}`);
      return;
    }

    const json = await response.json();
    if (json.errors?.length) {
      fail('Storefront API error', json.errors[0].message);
      return;
    }

    pass('Storefront API', `${json.data.shop.name} - api ${version}`);

    const sample = json.data.products?.nodes?.[0];
    if (sample) {
      pass('Products readable', `e.g. "${sample.title}"`);
    } else {
      fail(
        'No products returned',
        'The token works but cannot read products. Add the unauthenticated_read_product_listings scope.',
      );
    }
  } catch (error) {
    fail('Could not reach the Storefront API', error.message);
  }
}

async function checkCustomerAccounts(env) {
  const clientId = env.EXPO_PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID;
  const redirect = env.EXPO_PUBLIC_CUSTOMER_ACCOUNT_REDIRECT_URI;
  const shopId = env.EXPO_PUBLIC_SHOPIFY_SHOP_ID;
  const storefrontUrl = (env.EXPO_PUBLIC_STOREFRONT_URL || '').replace(/\/$/, '');

  if (!clientId) {
    skip(
      'Customer accounts not configured',
      'Sign-in, orders and addresses stay hidden; everything else works. Set EXPO_PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID to enable them.',
    );
    return;
  }
  pass('Customer Account API client id', `${clientId.slice(0, 8)}...`);

  // Shopify requires mobile clients to use a shop-scoped custom scheme. A
  // mismatch fails at the redirect, long after the browser has already opened,
  // which is a confusing place to discover a typo.
  if (!redirect) {
    fail('Redirect URI is not set', 'EXPO_PUBLIC_CUSTOMER_ACCOUNT_REDIRECT_URI');
  } else if (!shopId) {
    fail('Shop id is not set', 'EXPO_PUBLIC_SHOPIFY_SHOP_ID is needed to validate the redirect URI.');
  } else if (!redirect.startsWith(`shop.${shopId}.`)) {
    fail(
      'Redirect URI is not shop-scoped',
      `Shopify requires mobile callbacks to start with "shop.${shopId}.". Got "${redirect}".`,
    );
  } else {
    pass('Redirect URI', redirect);

    // The scheme must also be claimed by the app, or the browser never hands
    // control back and sign-in hangs on the Shopify page.
    try {
      const appJson = JSON.parse(await readFile(resolve(ROOT, 'app.json'), 'utf8'));
      const schemes = [appJson.expo.scheme].flat().filter(Boolean);
      const scheme = redirect.split('://')[0];
      if (schemes.includes(scheme)) {
        pass('Scheme declared in app.json', scheme);
      } else {
        fail(
          'Scheme missing from app.json',
          `Add "${scheme}" to expo.scheme, or the browser cannot return to the app.`,
        );
      }
    } catch (error) {
      fail('Could not read app.json', error.message);
    }
  }

  if (!storefrontUrl) return;
  try {
    const response = await withTimeout(`${storefrontUrl}/.well-known/openid-configuration`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      skip(
        'OAuth discovery unavailable',
        `Returned ${response.status}. The app falls back to shop-id URLs, so this is not fatal.`,
      );
      return;
    }
    const config = await response.json();
    if (config.authorization_endpoint) {
      pass('OAuth discovery', new URL(config.authorization_endpoint).host);
    } else {
      skip('Discovery document has no authorization_endpoint', 'The app will use its fallback URLs.');
    }
  } catch (error) {
    skip('Could not reach the discovery endpoint', `${error.message}. The app falls back to shop-id URLs.`);
  }
}

function checkPush(env) {
  if (env.EXPO_PUBLIC_PUSH_REGISTRATION_URL) {
    pass('Push registration endpoint', env.EXPO_PUBLIC_PUSH_REGISTRATION_URL);
  } else {
    skip('Push registration endpoint not set', 'Remote push is disabled. See server/README.md.');
  }
}

const env = await loadEnv();

console.log('\nOwnly Club - configuration check\n');
await checkStorefront(env);
await checkCustomerAccounts(env);
checkPush(env);

if (failures > 0) {
  console.log(`\n${C.red}${failures} problem(s) found.${C.reset} Fix these before running the app.\n`);
  process.exit(1);
}
console.log(`\n${C.green}Ready.${C.reset} Run: npx expo start\n`);
