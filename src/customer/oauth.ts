import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/config/env';
import { getCustomerEndpoints } from './discovery';

/**
 * OAuth 2.0 authorization-code flow with PKCE against Shopify's Customer
 * Account API.
 *
 * A mobile app cannot keep a client secret, so it authenticates as a *public*
 * client: a one-time `code_verifier` is generated locally, its SHA-256 hash is
 * sent up front as the `code_challenge`, and the verifier itself is only
 * revealed when redeeming the code. An attacker who intercepts the redirect
 * therefore cannot exchange the code.
 */

export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  /** Absolute epoch milliseconds. */
  expiresAt: number;
}

const SCOPES = 'openid email customer-account-api:full';

/** base64url per RFC 7636 — standard base64 with the URL-unsafe chars swapped. */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomUrlSafe(byteLength: number): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return toBase64Url(globalThis.btoa(binary));
}

async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return toBase64Url(digest);
}

/**
 * Shopify rejects requests without a User-Agent with a 403 that reads like a
 * permissions problem rather than a missing header, so it is always sent.
 */
const COMMON_HEADERS = {
  'User-Agent': 'OwnlyClub/1.0 (Expo; React Native)',
} as const;

function parseCallback(url: string): { code?: string; state?: string; error?: string; errorDescription?: string } {
  // The callback may put params in the query or, for some error paths, the
  // fragment — check both rather than assuming.
  const [, queryAndHash = ''] = url.split('?');
  const [query = '', hash = ''] = queryAndHash.split('#');
  const params = new URLSearchParams(query);
  const hashParams = new URLSearchParams(hash);
  const pick = (key: string) => params.get(key) ?? hashParams.get(key) ?? undefined;
  return {
    code: pick('code'),
    state: pick('state'),
    error: pick('error'),
    errorDescription: pick('error_description'),
  };
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

function toTokenSet(payload: TokenResponse): TokenSet {
  if (!payload.access_token) {
    throw new AuthError(payload.error ?? 'no_token', payload.error_description ?? 'Shopify did not return an access token.');
  }
  // Renew a minute early so a request cannot start with a token that expires
  // while it is in flight.
  const lifetimeSeconds = payload.expires_in ?? 7200;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    idToken: payload.id_token ?? null,
    expiresAt: Date.now() + Math.max(0, lifetimeSeconds - 60) * 1000,
  };
}

/**
 * Opens Shopify's hosted login and returns a token set.
 *
 * Uses an ephemeral auth session so the login page runs in a real browser
 * context (which is what makes passkeys and password managers work) while
 * still returning control to the app on redirect.
 */
export async function signIn(): Promise<TokenSet> {
  if (!env.customerClientId) {
    throw new AuthError('not_configured', 'Customer accounts are not configured in this build.');
  }
  const endpoints = await getCustomerEndpoints();
  if (!endpoints) {
    throw new AuthError('no_endpoints', 'Could not reach Shopify to start sign-in. Check your connection.');
  }

  const verifier = randomUrlSafe(32);
  const challenge = await codeChallengeFor(verifier);
  const state = randomUrlSafe(16);
  const nonce = randomUrlSafe(16);

  const authUrl = new URL(endpoints.authorizationEndpoint);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('client_id', env.customerClientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', env.customerRedirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), env.customerRedirectUri, {
    preferEphemeralSession: false,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new AuthError('cancelled', 'Sign-in was cancelled.');
  }
  if (result.type !== 'success') {
    throw new AuthError('failed', 'Sign-in did not complete.');
  }

  const callback = parseCallback(result.url);
  if (callback.error) {
    throw new AuthError(callback.error, callback.errorDescription ?? 'Shopify rejected the sign-in request.');
  }
  // A mismatched state means the response is not the one this app asked for.
  if (callback.state !== state) {
    throw new AuthError('state_mismatch', 'Sign-in could not be verified. Please try again.');
  }
  if (!callback.code) {
    throw new AuthError('no_code', 'Shopify did not return an authorization code.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.customerClientId,
    redirect_uri: env.customerRedirectUri,
    code: callback.code,
    code_verifier: verifier,
  });

  const response = await fetch(endpoints.tokenEndpoint, {
    method: 'POST',
    headers: { ...COMMON_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const payload = (await response.json()) as TokenResponse;

  if (!response.ok) {
    throw new AuthError(payload.error ?? String(response.status), payload.error_description ?? 'Could not complete sign-in.');
  }
  return toTokenSet(payload);
}

/** Exchanges a refresh token for a new access token. */
export async function refresh(refreshToken: string): Promise<TokenSet> {
  if (!env.customerClientId) throw new AuthError('not_configured', 'Customer accounts are not configured.');
  const endpoints = await getCustomerEndpoints();
  if (!endpoints) throw new AuthError('no_endpoints', 'Could not reach Shopify.');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.customerClientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(endpoints.tokenEndpoint, {
    method: 'POST',
    headers: { ...COMMON_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const payload = (await response.json()) as TokenResponse;

  if (!response.ok) {
    throw new AuthError(payload.error ?? String(response.status), payload.error_description ?? 'Session expired.');
  }
  const next = toTokenSet(payload);
  // Shopify may omit the refresh token on renewal; keep the existing one.
  return { ...next, refreshToken: next.refreshToken ?? refreshToken };
}

/**
 * Ends the Shopify-side session too. Without this, the next sign-in silently
 * reuses the browser session and the buyer cannot switch accounts.
 */
export async function signOutRemote(idToken: string | null): Promise<void> {
  const endpoints = await getCustomerEndpoints();
  if (!endpoints) return;
  try {
    const url = new URL(endpoints.logoutEndpoint);
    if (idToken) url.searchParams.set('id_token_hint', idToken);
    url.searchParams.set('post_logout_redirect_uri', env.customerRedirectUri);
    await WebBrowser.openAuthSessionAsync(url.toString(), env.customerRedirectUri);
  } catch {
    // The local session is already cleared; a failed remote logout is not worth
    // blocking the UI over.
  }
}
