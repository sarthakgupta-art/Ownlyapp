import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Badge, Divider, EmptyState, ErrorState, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { fetchOrders } from '@/shopify/api';
import { describeError } from '@/shopify/client';
import { useAuth } from '@/store/auth';
import { formatDate, formatMoney, pluralise } from '@/lib/format';
import type { Order } from '@/shopify/types';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Shopify's fulfilment enum is SCREAMING_SNAKE; buyers should not see that. */
function fulfilmentLabel(order: Order): { label: string; tone: 'accent' | 'neutral' } {
  switch (order.fulfillmentStatus) {
    case 'FULFILLED':
      return { label: 'Delivered', tone: 'neutral' };
    case 'PARTIALLY_FULFILLED':
      return { label: 'Partly shipped', tone: 'accent' };
    case 'IN_PROGRESS':
    case 'OPEN':
      return { label: 'Preparing', tone: 'accent' };
    case 'ON_HOLD':
      return { label: 'On hold', tone: 'accent' };
    case 'RESTOCKED':
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return { label: 'Processing', tone: 'accent' };
  }
}

function OrderCard({ order }: { order: Order }) {
  const status = fulfilmentLabel(order);
  const itemCount = order.lineItems.reduce((sum, line) => sum + line.quantity, 0);

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
        <Text variant="bodyStrong">{formatMoney(order.currentTotalPrice)}</Text>
        {order.statusUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Track order ${order.name}`}
            onPress={() => void Linking.openURL(order.statusUrl)}
            style={({ pressed }) => [styles.trackButton, pressed && styles.pressed]}
          >
            <Text variant="caption" tone="accent">
              Track order
            </Text>
            <Icon name="external" size={14} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const ready = useAuth((s) => s.ready);

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['orders', token],
      enabled: Boolean(token),
      initialPageParam: null as string | null,
      queryFn: ({ pageParam }) => fetchOrders({ token: token!, first: 15, after: pageParam }),
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

  if (!token) {
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
        <ErrorState message={describeError(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const orders = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="My orders" showBack />
        <Loading />
      </Screen>
    );
  }

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
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loadMore: { marginTop: spacing.md },
  pressed: { opacity: 0.6 },
});
