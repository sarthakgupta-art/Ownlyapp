import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import type { Image as ShopifyImage } from '@/shopify/types';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export function ProductGallery({ images, title }: { images: ShopifyImage[]; title: string }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<ShopifyImage>>(null);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex((current) => (current === next ? current : next));
    },
    [width],
  );

  // Portrait crop, matching the product grid, so the whole app shares one
  // image rhythm rather than switching to square on the detail page.
  const imageHeight = width / layout.productAspect;

  if (images.length === 0) {
    return <View style={[styles.placeholder, { width, height: imageHeight }]} />;
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={images}
        horizontal
        pagingEnabled
        keyExtractor={(item, i) => `${item.url}-${i}`}
        renderItem={({ item }) => (
          <Image
            source={item.url}
            contentFit="cover"
            transition={200}
            style={{ width, height: imageHeight }}
            alt={item.altText ?? title}
            accessibilityIgnoresInvertColors
          />
        )}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsHorizontalScrollIndicator={false}
      />
      {images.length > 1 ? (
        <View style={styles.counter}>
          <Text variant="micro" tone="inverse">
            {index + 1} / {images.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surfaceSunk },
  counter: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.scrim,
  },
});
