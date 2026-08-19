import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import type { Image as ShopifyImage } from '@/shopify/types';
import { colors, radius, spacing } from '@/theme/tokens';

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

  if (images.length === 0) {
    return <View style={[styles.placeholder, { width, height: width }]} />;
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
            style={{ width, height: width }}
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
    bottom: spacing.md,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
});
