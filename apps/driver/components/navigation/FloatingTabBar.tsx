import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePathname, useRouter } from 'expo-router';
import {
  House,
  MapPin,
  ClipboardList,
  TrendingUp,
  User,
  Settings,
} from 'lucide-react-native';
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

import { useAppPalette, isLight, hexToRgba } from '@/lib/theme';

type IconProps = {
  color?: string;
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
};

type NavItem = {
  key: string;
  label: string;
  Icon: IconComponent;
  routeName?: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home',     label: 'Home',     Icon: House,          routeName: 'home',     href: '/(tabs)/home' },
  { key: 'active',   label: 'Active',   Icon: MapPin,         routeName: 'active',   href: '/(tabs)/active' },
  { key: 'history',  label: 'History',  Icon: ClipboardList,  routeName: 'history',  href: '/(tabs)/history' },
  { key: 'earnings', label: 'Earnings', Icon: TrendingUp,     routeName: 'earnings', href: '/(tabs)/earnings' },
  { key: 'profile',  label: 'Profile',  Icon: User,           routeName: 'profile',  href: '/(tabs)/profile' },
  { key: 'settings', label: 'Settings', Icon: Settings,       routeName: 'settings', href: '/(tabs)/settings' },
];

const PILL_HEIGHT = 56;
const ACTIVE_PILL_WIDTH = 56; // icon-only pill, expands slightly
const INACTIVE_ICON_SIZE = 44;

function getFocusKey(pathname: string) {
  if (pathname === '/(tabs)/home' || pathname === '/home' || pathname === '/') return 'home';
  if (pathname.startsWith('/(tabs)/active') || pathname.startsWith('/active')) return 'active';
  if (pathname.startsWith('/(tabs)/history') || pathname.startsWith('/history')) return 'history';
  if (pathname.startsWith('/(tabs)/earnings') || pathname.startsWith('/earnings')) return 'earnings';
  if (pathname.startsWith('/(tabs)/profile') || pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/(tabs)/settings') || pathname.startsWith('/settings')) return 'settings';
  return null;
}

function shouldShowDock(pathname: string) {
  const base = pathname.replace('/(tabs)', '').replace(/^\//, '');
  return ['home', 'active', 'history', 'earnings', 'profile', 'settings', ''].some(
    (seg) => base === seg || base.startsWith(seg + '/'),
  );
}

function useThemeTokens(): ThemeTokens {
  const palette = useAppPalette();
  const dark = !isLight(palette.bg);

  return useMemo<ThemeTokens>(() => ({
    shellBackground: palette.card,
    shellBorder: palette.border,
    shellShadow: dark ? 'rgba(0,0,0,0.56)' : 'rgba(0,0,0,0.12)',
    shellTint: dark ? 'rgba(255,255,255,0.02)' : hexToRgba(palette.primary, 0.04),
    activeFill: palette.primary,
    activeBorder: palette.border,
    activeText: palette.text,
    inactiveText: hexToRgba(palette.text, dark ? 0.45 : 0.4),
  }), [dark, palette]);
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
    progress.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 170, mass: 0.85 });
  }, [focused, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [INACTIVE_ICON_SIZE, ACTIVE_PILL_WIDTH]),
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', theme.activeFill]),
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', theme.activeBorder]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.05]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.tabPressable, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.tabPill, containerStyle]}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <item.Icon
            color={focused ? '#FFFFFF' : theme.inactiveText}
            size={21}
            strokeWidth={focused ? 2.2 : 1.8}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
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
    intro.value = withSpring(1, { damping: 18, stiffness: 145, mass: 0.9 });
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
        { bottom: Math.max(insets.bottom, 14) },
        containerStyle,
      ]}
    >
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
                const route = state.routes.find((r) => r.name === item.routeName);
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
              const route = state.routes.find((r) => r.name === item.routeName);
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
    justifyContent: 'center',
  },
  navPillShell: {
    flex: 1,
    position: 'relative',
    height: PILL_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
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
    height: PILL_HEIGHT - 16,
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
  pressed: {
    opacity: 0.8,
  },
});
