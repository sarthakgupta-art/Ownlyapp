import { discountPercent, formatMoney, formatPriceRange, gidToId, htmlToPlainText, pluralise } from '@/lib/format';
import { validateEmail, validatePassword, validatePhone, validatePincode } from '@/lib/validate';

const inr = (amount: string) => ({ amount, currencyCode: 'INR' });

describe('formatMoney', () => {
  it('formats with the Indian lakh grouping and no decimals', () => {
    // Node's ICU renders the INR symbol; assert on the grouping, not the glyph.
    expect(formatMoney(inr('120000'))).toContain('1,20,000');
  });

  it('returns an empty string for null or a non-numeric amount', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(inr('abc'))).toBe('');
  });

  it('falls back to a plain code for an unknown currency', () => {
    expect(formatMoney({ amount: '10', currencyCode: 'XYZ!' })).toBe('XYZ! 10');
  });
});

describe('formatPriceRange', () => {
  it('collapses to a single price when both ends match', () => {
    expect(formatPriceRange(inr('5000'), inr('5000'))).toBe(formatMoney(inr('5000')));
  });

  it('renders both ends when they differ', () => {
    expect(formatPriceRange(inr('5000'), inr('9000'))).toContain('–');
  });
});

describe('discountPercent', () => {
  it('rounds the saving', () => {
    expect(discountPercent(inr('7500'), inr('10000'))).toBe(25);
  });

  it('returns null when there is no genuine markdown', () => {
    expect(discountPercent(inr('10000'), inr('10000'))).toBeNull();
    expect(discountPercent(inr('10000'), inr('9000'))).toBeNull();
    expect(discountPercent(inr('10000'), null)).toBeNull();
    expect(discountPercent(inr('10000'), inr('0'))).toBeNull();
  });
});

describe('htmlToPlainText', () => {
  it('turns block tags into line breaks', () => {
    expect(htmlToPlainText('<p>One</p><p>Two</p>')).toBe('One\n\nTwo');
  });

  it('bullets list items', () => {
    expect(htmlToPlainText('<ul><li>A</li><li>B</li></ul>')).toBe('• A\n• B');
  });

  it('decodes the common entities', () => {
    expect(htmlToPlainText('Dolce &amp; Gabbana &quot;Light&quot; &#39;Blue&#39;')).toBe(
      'Dolce & Gabbana "Light" \'Blue\'',
    );
  });

  it('strips tags without leaving markup behind', () => {
    expect(htmlToPlainText('<span class="x">Hi</span>')).toBe('Hi');
  });

  it('collapses runs of blank lines', () => {
    expect(htmlToPlainText('<p>A</p><br><br><br><p>B</p>')).toBe('A\n\nB');
  });
});

describe('gidToId', () => {
  it('extracts the numeric id from a Shopify GID', () => {
    expect(gidToId('gid://shopify/Product/10005792325913')).toBe('10005792325913');
  });
});

describe('pluralise', () => {
  it('uses the singular for one', () => {
    expect(pluralise(1, 'item')).toBe('1 item');
    expect(pluralise(2, 'item')).toBe('2 items');
  });
});

describe('validators', () => {
  it('accepts a valid email and rejects malformed ones', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('a@b')).not.toBeNull();
    expect(validateEmail('a b@c.com')).not.toBeNull();
  });

  it('matches Shopify’s own 5-character password floor', () => {
    expect(validatePassword('abcde')).toBeNull();
    expect(validatePassword('abcd')).not.toBeNull();
  });

  it('accepts a real Indian PIN code and rejects a leading zero', () => {
    expect(validatePincode('110001')).toBeNull();
    expect(validatePincode('011000')).not.toBeNull();
    expect(validatePincode('11000')).not.toBeNull();
  });

  it('accepts a 10-digit mobile with or without the country code', () => {
    expect(validatePhone('9876543210')).toBeNull();
    expect(validatePhone('+91 98765 43210')).toBeNull();
    expect(validatePhone('1234567890')).not.toBeNull();
    expect(validatePhone('98765')).not.toBeNull();
  });
});
