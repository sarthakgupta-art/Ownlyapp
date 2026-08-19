import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ProductGrid } from '@/components/ProductGrid';
import { ErrorState, Screen } from '@/components/Layout';
import { SetupNotice } from '@/components/SetupNotice';
import { useProductsByIds } from '@/hooks/useCatalog';
import { useWishlist } from '@/store/wishlist';
import { describeError } from '@/shopify/client';
import { isShopifyConfigured } from '@/config/env';

export default function WishlistScreen() {
  const router = useRouter();
  const ids = useWishlist((s) => s.ids);
  const ready = useWishlist((s) => s.ready);

  // Ids are stored locally but prices and stock come from Shopify on every
  // visit, so a saved product never shows a stale price.
  const { data, isLoading, error, refetch } = useProductsByIds(ids);

  if (!isShopifyConfigured) return <SetupNotice />;

  if (error) {
    return (
      <Screen>
        <AppHeader title="Saved" />
        <ErrorState message={describeError(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Saved" showSearch />
      <ProductGrid
        products={data ?? []}
        loading={!ready || (isLoading && ids.length > 0)}
        emptyTitle="Nothing saved yet"
        emptyBody="Tap the heart on any product to keep it here. Saved items always show their current price."
        emptyAction={{ label: 'Browse the shop', onPress: () => router.push('/(tabs)/shop') }}
      />
    </Screen>
  );
}
