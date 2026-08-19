import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Button } from './Button';
import type { ProductSummary } from '@/shopify/types';
import { colors, layout, spacing } from '@/theme/tokens';

export interface HeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  onPress: () => void;
  /** Drawn from the catalogue, so the hero is never a stale hard-coded asset. */
  product?: ProductSummary;
}

/**
 * Full-bleed editorial hero.
 *
 * The image is pulled from live catalogue data rather than shipped as an asset,
 * so the home screen re-dresses itself as stock changes and nobody has to
 * remember to swap a banner. The gradient exists only to keep type legible over
 * an unpredictable photograph.
 */
export function Hero({ eyebrow, title, subtitle, ctaLabel, onPress, product }: HeroProps) {
  const { height } = useWindowDimensions();
  // Tall enough to feel like a cover, short enough that the first rail peeks
  // above the fold and invites a scroll.
  const heroHeight = Math.min(Math.max(height * 0.56, 420), 620);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${ctaLabel}`}
      onPress={onPress}
      style={[styles.container, { height: heroHeight }]}
    >
      <Image
        source={product?.featuredImage?.url}
        contentFit="cover"
        transition={400}
        style={styles.image}
        accessibilityIgnoresInvertColors
        alt={product?.title ?? title}
      />
      <LinearGradient
        colors={['rgba(17,17,17,0.05)', 'rgba(17,17,17,0.30)', 'rgba(17,17,17,0.72)']}
        locations={[0, 0.45, 1]}
        style={styles.scrim}
      />

      <View style={styles.content}>
        <Text variant="eyebrow" tone="inverse" uppercase style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text variant="hero" tone="inverse" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="inverse" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        <Button label={ctaLabel} variant="onImage" onPress={onPress} style={styles.cta} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: colors.surfaceSunk },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    bottom: spacing.xxl,
  },
  eyebrow: { opacity: 0.85 },
  title: { marginTop: spacing.md },
  subtitle: { marginTop: spacing.sm, opacity: 0.9, maxWidth: 300 },
  cta: { marginTop: spacing.xl, alignSelf: 'flex-start' },
});
