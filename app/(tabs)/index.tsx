import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ProductRail } from '@/components/ProductRail';
import { Chip, RefreshableScroll, Screen, SectionHeader, Spacer } from '@/components/Layout';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { SetupNotice } from '@/components/SetupNotice';
import { departments, getDepartment, primaryDepartment } from '@/catalog/departments';
import type { Department, HomeRail } from '@/catalog/types';
import { useProductsByIds, useRail } from '@/hooks/useCatalog';
import { usePreferences } from '@/store/preferences';
import { useWishlist } from '@/store/wishlist';
import { isShopifyConfigured } from '@/config/env';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** One configured rail. Rendering per-rail keeps each query independent. */
function Rail({ department, rail }: { department: Department; rail: HomeRail }) {
  const router = useRouter();
  const { data, isLoading } = useRail(department, rail);

  if (isLoading || !data || data.length === 0) return null;

  return (
    <ProductRail
      title={rail.title}
      subtitle={rail.subtitle}
      products={data}
      onSeeAll={() =>
        rail.collectionHandle
          ? router.push({ pathname: '/collection/[handle]', params: { handle: rail.collectionHandle } })
          : router.push({ pathname: '/(tabs)/shop', params: { department: department.id } })
      }
    />
  );
}

/** Continue-browsing rail built from locally stored recently-viewed ids. */
function RecentlyViewed() {
  const recentIds = useWishlist((s) => s.recentIds);
  const ids = recentIds.slice(0, 10);
  const { data } = useProductsByIds(ids);

  if (!data || data.length < 2) return null;
  return <ProductRail title="Pick up where you left off" products={data} />;
}

function FinderPromo({ department }: { department: Department }) {
  const router = useRouter();
  if (!department.finder) return null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(tabs)/finder', params: { department: department.id } })}
      style={({ pressed }) => [styles.promo, pressed && styles.pressed]}
    >
      <View style={styles.promoText}>
        <Text variant="eyebrow" tone="accent" uppercase>
          Not sure where to start
        </Text>
        <Text variant="title" tone="inverse" style={styles.promoTitle}>
          {department.finder.title}
        </Text>
        <Text variant="caption" tone="inverse" style={styles.promoBody}>
          {department.finder.subtitle}
        </Text>
        <View style={styles.promoCta}>
          <Text variant="caption" tone="inverse">
            {department.finder.ctaLabel}
          </Text>
          <Icon name="chevron-right" size={15} color={colors.textInverse} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const departmentId = usePreferences((s) => s.departmentId);
  const setDepartment = usePreferences((s) => s.setDepartment);
  const [refreshing, setRefreshing] = useState(false);

  const department = getDepartment(departmentId) ?? primaryDepartment;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['rail'] });
    setRefreshing(false);
  }, [queryClient]);

  if (!isShopifyConfigured) return <SetupNotice />;

  return (
    <Screen>
      <AppHeader brand showSearch />
      <RefreshableScroll refreshing={refreshing} onRefresh={onRefresh}>
        {departments.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.departmentBar}
          >
            {departments.map((dept) => (
              <Chip
                key={dept.id}
                label={dept.label}
                selected={dept.id === department.id}
                onPress={() => void setDepartment(dept.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.hero}>
          <Text variant="display">{department.label}</Text>
          <Text variant="body" tone="muted" style={styles.heroTagline}>
            {department.tagline}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/search')}
            style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
          >
            <Icon name="search" size={18} color={colors.textMuted} />
            <Text variant="body" tone="muted">
              Search brands and products
            </Text>
          </Pressable>
        </View>

        {department.rails.map((rail) => (
          <Rail key={rail.id} department={department} rail={rail} />
        ))}

        <Spacer size={spacing.xl} />
        <FinderPromo department={department} />

        <RecentlyViewed />

        <SectionHeader
          title="Browse by brand"
          subtitle="Every house Ownly stocks"
          actionLabel="See all"
          onAction={() => router.push({ pathname: '/(tabs)/shop', params: { department: department.id } })}
        />
        <Spacer size={spacing.xxl} />
      </RefreshableScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  departmentBar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  hero: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl, gap: spacing.xs },
  heroTagline: { maxWidth: 320 },
  searchBar: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  promo: {
    marginHorizontal: layout.screenPadding,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  promoText: { padding: spacing.xl, gap: spacing.xs },
  promoTitle: { marginTop: spacing.xs },
  promoBody: { opacity: 0.8, maxWidth: 300 },
  promoCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  pressed: { opacity: 0.85 },
});
