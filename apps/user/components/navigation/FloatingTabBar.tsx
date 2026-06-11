import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ClipboardList, House, Plus, UserRound, Wallet } from 'lucide-react-native';
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
import { usePathname, useRouter } from 'expo-router';

import { Typography } from '@/constants/typography';
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
  key: 'home' | 'orders' | 'wallet' | 'profile';
  label: string;
  Icon: IconComponent;
  routeName?: 'index' | 'orders' | 'profile';
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', Icon: House, routeName: 'index', href: '/' },
  { key: 'orders', label: 'Orders', Icon: ClipboardList, routeName: 'orders', href: '/orders' },
  { key: 'wallet', label: 'Wallet', Icon: Wallet, href: '/wallet/topup' },
  { key: 'profile', label: 'Profile', Icon: UserRound, routeName: 'profile', href: '/profile' },
];

const PILL_WIDTH = 92;
const PILL_COLLAPSED = 40;
const PILL_HEIGHT = 44;
const FAB_SIZE = 56;

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
  if (pathname.startsWith('/wallet')) return 'wallet';
  if (pathname.startsWith('/profile')) return 'profile';
  return null;
}

function isHiddenRoute(pathname: string) {
  return ['/auth-lock', '/notifications', '/settings'].some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function useThemeTokens() {
  const palette = useAppPalette();
  const dark = !isLight(palette.bg);

  return useMemo<ThemeTokens>(() => {
    const primary = palette.primary;
    const secondary = palette.primaryDark ?? palette.primary;

    return {
      shellBackground: dark ? 'rgba(16, 16, 20, 0.74)' : hexToRgba(palette.card, 0.92),
      shellBorder: dark ? 'rgba(255, 255, 255, 0.10)' : hexToRgba(palette.border, 0.9),
      shellShadow: dark ? 'rgba(0, 0, 0, 0.50)' : 'rgba(0, 0, 0, 0.16)',
      shellTint: dark ? 'rgba(139, 92, 246, 0.10)' : hexToRgba(primary, 0.08),
      activeFill: dark ? 'rgba(255, 255, 255, 0.95)' : hexToRgba(palette.card, 0.98),
      activeBorder: dark ? 'rgba(255, 255, 255, 0.14)' : hexToRgba(primary, 0.14),
      activeText: primary,
      inactiveText: hexToRgba(palette.text, dark ? 0.58 : 0.46),
      fabPrimary: primary,
      fabSecondary: secondary,
      fabShadow: dark ? 'rgba(139, 92, 246, 0.38)' : hexToRgba(primary, 0.28),
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
      stiffness: 180,
      mass: 0.8,
      overshootClamping: false,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
    });
  }, [focused, progress]);

  const containerStyle = useAnimatedStyle(() => {
    const width = interpolate(progress.value, [0, 1], [PILL_COLLAPSED, PILL_WIDTH]);
    const translateY = interpolate(progress.value, [0, 1], [0, -1]);

    return {
      width,
      backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', theme.activeFill]),
      borderColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', theme.activeBorder]),
      transform: [{ translateY }],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.64, 1]),
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.04]) }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.45, 1], [0, 0, 1]),
      transform: [{ translateX: interpolate(progress.value, [0, 1], [-4, 0]) }],
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => void haptics.tap()}
      style={({ pressed }) => [styles.tabPressable, pressed ? styles.pressed : null]}
    >
      <Animated.View style={[styles.tabPill, { shadowColor: theme.shellShadow }, containerStyle]}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <item.Icon
            color={focused ? theme.activeText : theme.inactiveText}
            size={item.key === 'wallet' ? 20 : 20}
            strokeWidth={focused ? 2.1 : 1.85}
          />
        </Animated.View>
        <Animated.Text numberOfLines={1} style={[styles.tabLabel, { color: theme.activeText }, labelStyle]}>
          {item.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function CreateOrderFab({ theme, onPress }: { theme: ThemeTokens; onPress: () => void }) {
  const progress = useSharedValue(0.15);

  useEffect(() => {
    progress.value = withSpring(1, {
      damping: 16,
      stiffness: 170,
      mass: 0.85,
    });
  }, [progress]);

  const fabStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
        { translateY: interpolate(progress.value, [0, 1], [4, 0]) },
      ],
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
    };
  });

  return (
    <Animated.View style={[styles.fabWrap, fabStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create Order"
        onPress={onPress}
        onPressIn={() => void haptics.press()}
        style={({ pressed }) => [styles.fab, { shadowColor: theme.fabShadow }, pressed ? styles.fabPressed : null]}
      >
        <View style={[styles.fabGlow, { backgroundColor: hexToRgba(theme.fabPrimary, 0.18) }]} />
        <View style={[styles.fabCore, { backgroundColor: theme.fabPrimary }]}>
          <View style={[styles.fabCoreInner, { backgroundColor: theme.fabSecondary }]} />
          <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
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
  const hidden = isHiddenRoute(pathname);
  const intro = useSharedValue(0);

  useEffect(() => {
    intro.value = withSpring(1, {
      damping: 18,
      stiffness: 150,
      mass: 0.9,
    });
  }, [intro]);

  const shellStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(intro.value, [0, 1], [0, 1]),
      transform: [{ translateY: interpolate(intro.value, [0, 1], [24, 0]) }],
    };
  });

  if (hidden) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.outer,
        {
          bottom: Math.max(insets.bottom, 8),
        },
        shellStyle,
      ]}
    >
      <View
        style={[
          styles.shell,
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

        <CreateOrderFab theme={theme} onPress={() => router.push('/send' as never)} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  shell: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    paddingRight: FAB_SIZE + 20,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
    elevation: 18,
  },
  shellTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    opacity: 1,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingRight: 10,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tabPill: {
    height: PILL_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Typography.family.semibold,
    letterSpacing: 0.1,
    marginLeft: 2,
    paddingRight: 12,
  },
  fabWrap: {
    position: 'absolute',
    right: 14,
    top: -10,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 16,
  },
  fabGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 999,
    opacity: 0.95,
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
    left: -14,
    width: 52,
    height: 52,
    borderRadius: 26,
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.92,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
});
