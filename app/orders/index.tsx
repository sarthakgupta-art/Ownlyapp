import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Badge, Divider, EmptyState, ErrorState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { fetchOrders } from '@/customer/api';
import { describeCustomerError } from '@/customer/client';
import type { Order } from '@/customer/types';
import { useAuth } from '@/store/auth';
import { formatDate, formatMoney, pluralise } from '@/lib/format';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Shopify's fulfilment enum is SCREAMING_SNAKE; buyers should not see that. */
function fulfilmentLabel(order: Order): { label: string; tone: 'accent' | 'neutral' } {
  switch (order.fulfillmentStatus) {
    case 'SUCCESS':
    case 'DELIVERED':
      return { label: 'Delivered', tone: 'neutral' };
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return { label: 'On its way', tone: 'accent' };
    case 'ATTEMPTED_DELIVERY':
      return { label: 'Delivery attempted', tone: 'accent' };
    case 'FAILURE':
    case 'ERROR':
      return { label: 'Delivery issue', tone: 'accent' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'neutral' };
    case null:
    case undefined:
      return { label: 'Preparing', tone: 'accent' };
    default:
      return { label: 'Processing', tone: 'accent' };
  }
}

function OrderCard({ order }: { order: Order }) {
  const status = fulfilmentLabel(order);
  const itemCount = order.lineItems.reduce((sum, line) => sum + line.quantity, 0);
  // Several parcels can carry the same tracking link; show each one once.
  const tracking = order.tracking.filter(
    (t, index, all) => t.url && all.findIndex((other) => other.url === t.url) === index,
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{order.name}</Text>
          <Text variant="micro" tone="muted">
            {formatDate(order.processedAt)} · {pluralise(itemCount, 'item')}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {order.estimatedDeliveryAt ? (
        <Text variant="caption" tone="accent">
          Estimated delivery {formatDate(order.estimatedDeliveryAt)}
        </Text>
      ) : null}

      <View style={styles.thumbs}>
        {order.lineItems.slice(0, 4).map((line, index) => (
          <Image
            key={`${order.id}-${index}`}
            source={line.image?.url}
            contentFit="cover"
            style={styles.thumb}
            alt={line.title}
          />
        ))}
        {order.lineItems.length > 4 ? (
          <View style={[styles.thumb, styles.thumbMore]}>
            <Text variant="micro" tone="muted">
              +{order.lineItems.length - 4}
            </Text>
          </View>
        ) : null}
      </View>

      <Divider />

      <View style={styles.cardFooter}>
        <Text variant="bodyStrong">{formatMoney(order.totalPrice)}</Text>
        <View style={styles.footerLinks}>
          {tracking.map((entry) => (
            <Pressable
              key={entry.url ?? entry.number ?? 'track'}
              accessibilityRole="button"
              accessibilityLabel={`Track parcel${entry.company ? ` with ${entry.company}` : ''}`}
              onPress={() => entry.url && void Linking.openURL(entry.url)}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <Text variant="caption" tone="accent">
                {entry.company ?? 'Track parcel'}
              </Text>
              <Icon name="external" size={14} color={colors.accent} />
            </Pressable>
          ))}
          {tracking.length === 0 && order.statusPageUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View status of order ${order.name}`}
              onPress={() => order.statusPageUrl && void Linking.openURL(order.statusPageUrl)}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <Text variant="caption" tone="accent">
                View status
              </Text>
              <Icon name="external" size={14} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const accessToken = useAuth((s) => s.accessToken);
  const getValidToken = useAuth((s) => s.getValidToken);
  const ready = useAuth((s) => s.ready);

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['customer-orders', accessToken],
      enabled: Boolean(accessToken),
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        // Resolve the token per request rather than closing over it, so a page
        // fetched an hour later refreshes instead of 401ing.
        const token = await getValidToken();
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        return fetchOrders({ accessToken: token, first: 15, after: pageParam });
      },
      getNextPageParam: (lastPage) =>
        lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined,
    });

  if (!ready) {
    return (
      <Screen>
        <AppHeader title="My orders" showBack />
        <Loading />
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen>
        <AppHeader title="My orders" showBack />
        <EmptyState
          title="Sign in to see your orders"
          body="Your order history and tracking live in your Ownly Club account."
          actionLabel="Sign in"
          onAction={() => router.push('/auth/sign-in')}
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <AppHeader title="My orders" showBack />
        <ErrorState message={describeCustomerError(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="My orders" showBack />
        <Loading />
      </Screen>
    );
  }

  const orders = data?.pages.flatMap((page) => page.items) ?? [];

  if (orders.length === 0) {
    return (
      <Screen>
        <AppHeader title="My orders" showBack />
        <EmptyState
          title="No orders yet"
          body="Once you place an order it will appear here with live tracking."
          actionLabel="Start shopping"
          onAction={() => router.push('/(tabs)/shop')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="My orders" showBack />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {hasNextPage ? (
          <Button
            label="Load older orders"
            variant="secondary"
            loading={isFetchingNextPage}
            onPress={() => void fetchNextPage()}
            style={styles.loadMore}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  thumbs: { flexDirection: 'row', gap: spacing.sm },
  thumb: { width: 52, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  thumbMore: { alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  footerLinks: { alignItems: 'flex-end', gap: spacing.xs },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loadMore: { marginTop: spacing.md },
  pressed: { opacity: 0.6 },
});
