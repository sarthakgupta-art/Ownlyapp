/** Small form validators, kept together so messages stay consistent. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'That does not look like a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  // Shopify itself rejects anything under 5 characters, so this matches rather
  // than inventing a stricter rule the server would not enforce.
  if (!value) return 'Enter a password.';
  if (value.length < 5) return 'Passwords must be at least 5 characters.';
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`;
}

/** Indian PIN codes are exactly six digits and never start with zero. */
export function validatePincode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'PIN code is required.';
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) return 'Enter a valid 6-digit PIN code.';
  return null;
}

export function validatePhone(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return 'Phone number is required.';
  // Accept a bare 10-digit Indian number or one carrying the 91 country code.
  if (digits.length === 10 && /^[6-9]/.test(digits)) return null;
  if (digits.length === 12 && digits.startsWith('91')) return null;
  return 'Enter a valid 10-digit mobile number.';
}
