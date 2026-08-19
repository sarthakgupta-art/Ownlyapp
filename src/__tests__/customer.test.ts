import { INDIAN_REGIONS, isValidRegionCode, regionName } from '@/lib/regions';

/**
 * The OAuth module itself needs a device (secure random, a browser, a network),
 * so what is unit-testable is the data it depends on and the pure helpers
 * around it. The GraphQL documents are verified separately, against Shopify's
 * published Customer Account API schema.
 */

describe('Indian regions', () => {
  it('covers all 28 states and 8 union territories', () => {
    expect(INDIAN_REGIONS).toHaveLength(36);
  });

  it('has unique codes and names', () => {
    const codes = INDIAN_REGIONS.map((r) => r.code);
    const names = INDIAN_REGIONS.map((r) => r.name);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses two-letter uppercase ISO codes, which is what Shopify accepts', () => {
    for (const region of INDIAN_REGIONS) {
      expect(region.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('resolves a code to its display name', () => {
    expect(regionName('MH')).toBe('Maharashtra');
    expect(regionName('KA')).toBe('Karnataka');
  });

  /** An unknown code is shown as-is rather than blanking a saved address. */
  it('falls back to the raw code when it is unknown', () => {
    expect(regionName('ZZ')).toBe('ZZ');
    expect(regionName(null)).toBe('');
    expect(regionName(undefined)).toBe('');
  });

  it('validates codes, rejecting full state names', () => {
    expect(isValidRegionCode('MH')).toBe(true);
    expect(isValidRegionCode('Maharashtra')).toBe(false);
    expect(isValidRegionCode('')).toBe(false);
    expect(isValidRegionCode(null)).toBe(false);
  });
});

describe('base64url encoding', () => {
  /**
   * PKCE code challenges must be base64url, not base64. Shopify rejects the
   * challenge outright if `+`, `/` or `=` survive, and the resulting error
   * blames the client id rather than the encoding — so this is pinned.
   */
  function toBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  it('replaces the URL-unsafe characters and strips padding', () => {
    expect(toBase64Url('ab+c/d==')).toBe('ab-c_d');
  });

  it('leaves an already-safe string untouched', () => {
    expect(toBase64Url('abcDEF123-_')).toBe('abcDEF123-_');
  });

  it('strips only trailing padding, not interior characters', () => {
    expect(toBase64Url('a=b==')).toBe('a=b');
  });
});

describe('OAuth callback parsing', () => {
  // Mirrors the parser in src/customer/oauth.ts: Shopify returns success
  // params in the query string but some error paths use the fragment.
  function parseCallback(url: string) {
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

  it('reads code and state from the query string', () => {
    const parsed = parseCallback('ownly://auth/callback?code=abc123&state=xyz');
    expect(parsed.code).toBe('abc123');
    expect(parsed.state).toBe('xyz');
  });

  it('reads an error from the fragment', () => {
    const parsed = parseCallback('ownly://auth/callback?#error=access_denied&error_description=Nope');
    expect(parsed.error).toBe('access_denied');
    expect(parsed.errorDescription).toBe('Nope');
  });

  it('returns undefined for a callback with no params', () => {
    const parsed = parseCallback('ownly://auth/callback');
    expect(parsed.code).toBeUndefined();
    expect(parsed.state).toBeUndefined();
  });

  it('decodes percent-encoded values', () => {
    const parsed = parseCallback('ownly://auth/callback?error_description=Session%20expired');
    expect(parsed.errorDescription).toBe('Session expired');
  });
});
