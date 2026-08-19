import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ProductCard } from './ProductCard';
import { SectionHeader } from './Layout';
import type { ProductSummary } from '@/shopify/types';
import { layout, spacing } from '@/theme/tokens';

export interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: ProductSummary[];
  onSeeAll?: () => void;
}

function Separator() {
  return <View style={styles.separator} />;
}

/** Horizontal carousel used on the home and department screens. */
export function ProductRail({ title, subtitle, products, onSeeAll }: ProductRailProps) {
  const { width } = useWindowDimensions();
  // Two-and-a-bit cards visible, which reads as "there is more to the right".
  // Roughly 1.8 cards in view: large enough to read as editorial, still
  // clearly scrollable.
  const cardWidth = Math.min(260, Math.max(180, (width - layout.screenPadding * 2 - spacing.lg) / 1.8));

  if (products.length === 0) return null;

  return (
    <>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={onSeeAll ? 'See all' : undefined}
        onAction={onSeeAll}
      />
      <FlatList
        data={products}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing.lg}
        decelerationRate="fast"
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.sm },
  separator: { width: spacing.lg },
});
