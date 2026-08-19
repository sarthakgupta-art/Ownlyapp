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
  const cardWidth = Math.min(190, Math.max(150, (width - layout.screenPadding * 2 - spacing.md) / 2.35));

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
        snapToInterval={cardWidth + spacing.md}
        decelerationRate="fast"
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.sm },
  separator: { width: spacing.md },
});
