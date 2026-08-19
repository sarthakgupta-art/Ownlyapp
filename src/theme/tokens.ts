/**
 * Design tokens for the Ownly Club app.
 *
 * The palette is deliberately restrained — near-black, warm ivory and a single
 * champagne accent — so that product photography carries the colour. Every
 * screen reads from these tokens; nothing hard-codes a hex value.
 */

export const palette = {
  ink: '#141414',
  inkSoft: '#3A3A3A',
  inkMuted: '#767676',
  inkFaint: '#A6A6A6',

  paper: '#FFFFFF',
  paperWarm: '#FAF8F5',
  paperSunk: '#F2EFEA',

  line: '#E6E1DA',
  lineStrong: '#D3CCC1',

  champagne: '#B08D57',
  champagneSoft: '#EFE3D2',

  success: '#1F7A44',
  danger: '#B3261E',
  dangerSoft: '#FBEAE8',
  info: '#2B5C8A',
} as const;

export const colors = {
  background: palette.paper,
  backgroundAlt: palette.paperWarm,
  surface: palette.paper,
  surfaceSunk: palette.paperSunk,

  text: palette.ink,
  textSecondary: palette.inkSoft,
  textMuted: palette.inkMuted,
  textFaint: palette.inkFaint,
  textInverse: palette.paper,

  border: palette.line,
  borderStrong: palette.lineStrong,

  accent: palette.champagne,
  accentSoft: palette.champagneSoft,

  primary: palette.ink,
  onPrimary: palette.paper,

  success: palette.success,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  info: palette.info,

  overlay: 'rgba(20, 20, 20, 0.45)',
} as const;

/** 4pt base scale. Use `spacing.md` rather than a bare number. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 14,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '600' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  /** Wide-tracked all-caps label used for section eyebrows and brand names. */
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1.4 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const layout = {
  screenPadding: spacing.lg,
  tabBarHeight: 58,
  minTapTarget: 44,
} as const;
