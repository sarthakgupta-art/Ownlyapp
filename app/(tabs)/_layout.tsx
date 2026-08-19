import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useCart } from '@/store/cart';
import { departmentsWithFinder } from '@/catalog/departments';
import { colors, layout, radius } from '@/theme/tokens';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon name={name} size={23} color={focused ? colors.text : colors.textFaint} strokeWidth={focused ? 1.9 : 1.5} />;
}

/** Cart tab icon with a live item count. */
function BagIcon({ focused }: { focused: boolean }) {
  const count = useCart((s) => s.cart?.totalQuantity ?? 0);
  return (
    <View>
      <TabIcon name="bag" focused={focused} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text variant="micro" tone="inverse" style={styles.badgeText}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  // The finder tab only exists while some department actually declares a quiz,
  // so disabling every finder removes the tab rather than leaving a dead one.
  const showFinder = departmentsWithFinder.length > 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: 'Shop', tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} /> }}
      />
      <Tabs.Screen
        name="finder"
        options={{
          title: 'Finder',
          href: showFinder ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name="sparkle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{ title: 'Saved', tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} /> }}
      />
      <Tabs.Screen
        name="bag"
        options={{ title: 'Bag', tabBarIcon: ({ focused }) => <BagIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: layout.tabBarHeight,
    paddingTop: 6,
  },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { lineHeight: 14 },
});
