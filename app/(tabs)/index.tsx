import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Hero } from '@/components/Hero';
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
import { colors, layout, spacing } from '@/theme/tokens';

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

function RecentlyViewed() {
  const recentIds = useWishlist((s) => s.recentIds);
  const { data } = useProductsByIds(recentIds.slice(0, 10));
  if (!data || data.length < 2) return null;
  return <ProductRail title="Recently viewed" products={data} />;
}

/** Quiet, full-width invitation to the quiz — a rule and a line of serif, no card. */
function FinderInvite({ department }: { department: Department }) {
  const router = useRouter();
  if (!department.finder) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={department.finder.ctaLabel}
      onPress={() => router.push({ pathname: '/(tabs)/finder', params: { department: department.id } })}
      style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
    >
      <Text variant="eyebrow" tone="accent" uppercase>
        Not sure where to start
      </Text>
      <Text variant="title" style={styles.inviteTitle}>
        {department.finder.title}
      </Text>
      <Text variant="caption" tone="muted" style={styles.inviteBody}>
        {department.finder.subtitle}
      </Text>
      <View style={styles.inviteCta}>
        <Text variant="button" uppercase>
          {department.finder.ctaLabel}
        </Text>
        <Icon name="chevron-right" size={14} strokeWidth={1.2} />
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

  // The hero borrows the first product of the department's lead rail, so it
  // always shows something real and in stock.
  const leadRail = department.rails[0];
  const { data: leadProducts } = useRail(department, leadRail ?? { id: 'hero', title: '', limit: 1 });

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
        <Hero
          eyebrow="Sourced worldwide"
          title={department.id === 'fragrance' ? 'The\nfragrance\nedit' : department.label}
          subtitle={department.tagline}
          ctaLabel="Shop the edit"
          product={leadProducts?.[0]}
          onPress={() => router.push({ pathname: '/(tabs)/shop', params: { department: department.id } })}
        />

        {departments.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.departmentBar}>
            {departments.map((dept) => (
              <Chip
                key={dept.id}
                label={dept.label}
                selected={dept.id === department.id}
                onPress={() => void setDepartment(dept.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <Spacer size={spacing.sm} />
        )}

        {department.rails.map((rail) => (
          <Rail key={rail.id} department={department} rail={rail} />
        ))}

        <FinderInvite department={department} />
        <RecentlyViewed />

        <SectionHeader
          title="Browse by house"
          subtitle="Every brand Ownly stocks"
          actionLabel="View all"
          onAction={() => router.push({ pathname: '/(tabs)/shop', params: { department: department.id } })}
        />

        <View style={styles.footer}>
          <Text variant="eyebrow" tone="faint" uppercase center>
            Ownly Club
          </Text>
          <Text variant="micro" tone="faint" center style={styles.footerLine}>
            Authenticated luxury fragrance and beauty, shipped across India.
          </Text>
        </View>
      </RefreshableScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  departmentBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
  },
  invite: {
    marginTop: spacing.xxl,
    marginHorizontal: layout.screenPadding,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  inviteTitle: { marginTop: spacing.sm },
  inviteBody: { marginTop: spacing.sm, maxWidth: 320 },
  inviteCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  footer: { paddingVertical: spacing.xxxl, paddingHorizontal: layout.screenPadding, gap: spacing.sm },
  footerLine: { maxWidth: 280, alignSelf: 'center' },
  pressed: { opacity: 0.7 },
});
