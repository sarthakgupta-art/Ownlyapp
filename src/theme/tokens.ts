/**
 * Design tokens for the Ownly Club app.
 *
 * The direction is minimal luxury — the register of Net-a-Porter or Sephora
 * rather than a marketplace. That means three things, and every token below
 * serves one of them:
 *
 *   1. Photography carries the colour. The palette is near-achromatic so a
 *      bottle shot is never competing with the interface.
 *   2. A high-contrast serif does the talking. Display type is Cormorant
 *      Garamond; UI type is Jost. Mixing a bookish serif with a geometric sans
 *      is what separates "boutique" from "catalogue".
 *   3. Space is the luxury. Sizes below are deliberately generous; resist
 *      tightening them to fit more in.
 */

export const palette = {
  ink: '#111111',
  inkSoft: '#3D3A36',
  inkMuted: '#7A756E',
  inkFaint: '#ADA79E',

  paper: '#FFFFFF',
  /** Warm off-white used for whole screens, not just cards. */
  paperWarm: '#FBF9F6',
  paperSunk: '#F1EDE7',

  line: '#E8E3DB',
  lineStrong: '#D6CFC4',

  champagne: '#9A7B4F',
  champagneSoft: '#F0E7D9',

  success: '#2F6B4F',
  danger: '#9B2C2C',
  dangerSoft: '#F7ECEC',
  info: '#2B5C8A',
} as const;

export const colors = {
  background: palette.paperWarm,
  backgroundAlt: palette.paper,
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

  overlay: 'rgba(17, 17, 17, 0.32)',
  /** Sits under text laid over photography. */
  scrim: 'rgba(17, 17, 17, 0.45)',
} as const;

export const fonts = {
  display: 'CormorantGaramond_500Medium',
  displayLight: 'CormorantGaramond_300Light',
  displaySemi: 'CormorantGaramond_600SemiBold',
  body: 'Jost_400Regular',
  bodyMedium: 'Jost_500Medium',
  bodySemi: 'Jost_600SemiBold',
} as const;

/** 4pt base scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
  xxxl: 56,
} as const;

export const radius = {
  none: 0,
  /** Luxury retail is squared off; rounding reads as consumer-tech. */
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
  pill: 999,
} as const;

/**
 * Cormorant runs small for its point size, hence the large display values.
 * Letter-spacing on caps labels is doing a lot of the editorial work.
 */
export const typography = {
  hero: { fontFamily: fonts.displayLight, fontSize: 46, lineHeight: 52, letterSpacing: 0.5 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: 0.3 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: 0.2 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 25 },

  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 18 },
  micro: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15 },

  /** Wide-tracked caps for eyebrows, brand names and section labels. */
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 14, letterSpacing: 1.8 },
  /** The wordmark, and buttons. */
  wordmark: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 16, letterSpacing: 4.5 },
  button: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 16, letterSpacing: 1.4 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 60,
  minTapTarget: 44,
  /** Product imagery is portrait throughout; consistency matters more than fit. */
  productAspect: 0.78,
} as const;
