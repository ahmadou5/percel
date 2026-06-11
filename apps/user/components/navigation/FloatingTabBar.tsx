import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePathname, useRouter } from 'expo-router';
import { ClipboardList, House, Plus, Settings } from 'lucide-react-native';
import { type ComponentType, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppPalette, isLight } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type IconComponent = ComponentType<IconProps>;

type ThemeTokens = {
  shellBackground: string;
  shellBorder: string;
  shellShadow: string;
  shellTint: string;
  activeFill: string;
  activeBorder: string;
  activeText: string;
  inactiveText: string;
  fabPrimary: string;
  fabSecondary: string;
  fabShadow: string;
};

type NavItem = {
  key: 'home' | 'orders' | 'settings';
  label: string;
  Icon: IconComponent;
  routeName?: 'index' | 'orders';
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', Icon: House, routeName: 'index', href: '/' },
  { key: 'orders', label: 'Orders', Icon: ClipboardList, routeName: 'orders', href: '/orders' },
  { key: 'settings', label: 'Settings', Icon: Settings, href: '/settings' },
];

// Structural Geometry Configurations
const PILL_HEIGHT = 56;         // Height of the navigation pill container
const ACTIVE_PILL_WIDTH = 116;   // Expanded width for the active item view
const INACTIVE_ICON_SIZE = 44;   // Tap target diameter for standard inactive icons
const FAB_SIZE = 56;            // Matching height actions boundary

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getFocusKey(pathname: string) {
  if (pathname === '/' || pathname === '/index') return 'home';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/profile')) return 'settings';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

function shouldShowDock(pathname: string) {
  return pathname === '/' || pathname === '/index' || pathname.startsWith('/orders');
}

function useThemeTokens() {
  const palette = useAppPalette();
  const dark = !isLight(palette.bg);

  return useMemo<ThemeTokens>(() => {
    const primary = palette.primary;
    const secondary = palette.primaryDark ?? palette.primary;

    return {
      shellBackground: palette.card,
      shellBorder:palette.border,
      shellShadow: dark ? 'rgba(0, 0, 0, 0.48)' : 'rgba(0, 0, 0, 0.12)',
      shellTint: dark ? 'rgba(255, 255, 255, 0.02)' : hexToRgba(primary, 0.04),
      activeFill: dark ? 'rgba(255, 255, 255, 0.96)' : hexToRgba(palette.card, 0.98),
      activeBorder: dark ? 'rgba(255, 255, 255, 0.15)' : hexToRgba(primary, 0.15),
      activeText: primary,
      inactiveText: hexToRgba(palette.text, dark ? 0.55 : 0.45),
      fabPrimary: primary,
      fabSecondary: secondary,
      fabShadow: dark ? hexToRgba(primary, 0.3) : hexToRgba(primary, 0.22),
    };
  }, [dark, palette]);
}

function TabPill({
  item,
  focused,
  onPress,
  onLongPress,
  theme,
}: {
  item: NavItem;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  theme: ThemeTokens;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 170,
      mass: 0.85,
    });
  }, [focused, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [INACTIVE_ICON_SIZE, ACTIVE_PILL_WIDTH]),
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', theme.activeFill]),
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', theme.activeBorder]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.65, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.04]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => void haptics.tap()}
      style={({ pressed }) => [styles.tabPressable, pressed ? styles.pressed : null]}
    >
      <Animated.View style={[styles.tabPill, containerStyle]}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <item.Icon color={focused ? theme.activeText : theme.inactiveText} size={22} strokeWidth={focused ? 2.2 : 1.9} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function CreateOrderFab({ theme, onPress }: { theme: ThemeTokens; onPress: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, {
      damping: 16,
      stiffness: 160,
      mass: 0.9,
    });
  }, [progress]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [4, 0]) },
    ],
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  return (
    <Animated.View style={[styles.fabWrap, fabStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create Order"
        onPress={onPress}
        onPressIn={() => void haptics.press()}
        style={({ pressed }) => [styles.fab, { shadowColor: theme.fabShadow }, pressed ? styles.fabPressed : null]}
      >
        <View style={[styles.fabGlow, { backgroundColor: hexToRgba(theme.fabPrimary, 0.16) }]} />
        <View style={[styles.fabCore, { backgroundColor: theme.fabPrimary }]}>
          <View style={[styles.fabCoreInner, { backgroundColor: theme.fabSecondary }]} />
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeTokens();
  const focusedKey = getFocusKey(pathname);
  const visible = shouldShowDock(pathname);
  const intro = useSharedValue(0);

  useEffect(() => {
    intro.value = withSpring(1, {
      damping: 18,
      stiffness: 145,
      mass: 0.9,
    });
  }, [intro]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(intro.value, [0, 1], [20, 0]) }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.masterContainer,
        {
          bottom: Math.max(insets.bottom, 14),
        },
        containerStyle,
      ]}
    >
      {/* 1. Isolated Navigation Bar Pill Shape */}
      <View
        style={[
          styles.navPillShell,
          {
            backgroundColor: theme.shellBackground,
            borderColor: theme.shellBorder,
            shadowColor: theme.shellShadow,
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.shellTint, { backgroundColor: theme.shellTint }]} />

        <View style={styles.tabRow}>
          {NAV_ITEMS.map((item) => {
            const focused = focusedKey === item.key;
            
            const onPress = () => {
              if (item.routeName) {
                const route = state.routes.find((candidate) => candidate.name === item.routeName);
                if (!route) return;

                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(item.routeName as never);
                }
                return;
              }
              router.push(item.href as never);
            };

            const onLongPress = () => {
              if (!item.routeName) return;
              const route = state.routes.find((candidate) => candidate.name === item.routeName);
              if (!route) return;
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <TabPill
                key={item.key}
                focused={focused}
                item={item}
                onLongPress={onLongPress}
                onPress={onPress}
                theme={theme}
              />
            );
          })}
        </View>
      </View>

      {/* 2. Standalone Floating Action Button Layout */}
      <CreateOrderFab theme={theme} onPress={() => router.push('/send' as never)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  masterContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    justifyContent: 'space-between',
    gap: 16, // Spacing between the navigation shell and the plus action button
  },
  navPillShell: {
    flex: 1,
    position: 'relative',
    height: PILL_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12, // More padding left and right inside the shell
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  shellTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    height: PILL_HEIGHT - 16, // Balanced vertical clearance padding top/bottom
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrap: {
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  fabGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    opacity: 0.9,
  },
  fabCore: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fabCoreInner: {
    position: 'absolute',
    top: -10,
    left: -12,
    width: 52,
    height: 52,
    borderRadius: 26,
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.85,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
});