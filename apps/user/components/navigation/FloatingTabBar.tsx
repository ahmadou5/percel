import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CirclePlus, ClipboardList, House, Settings } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';

type TabName = 'index' | 'send' | 'orders' | 'profile';

type IconProps = {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

type IconComponent = ComponentType<IconProps>;

const TAB_ORDER: TabName[] = ['index', 'send', 'orders', 'profile'];

const TAB_META: Record<
  TabName,
  {
    label: string;
    Icon: IconComponent;
    elevated?: boolean;
  }
> = {
  index: { label: 'Home', Icon: House },
  send: { label: 'Create', Icon: CirclePlus, elevated: true },
  orders: { label: 'Orders', Icon: ClipboardList },
  profile: { label: 'Settings', Icon: Settings },
};

type ThemeTokens = {
  background: string;
  border: string;
  shadow: string;
  active: string;
  inactive: string;
  activeBackdrop: string;
  primary: string;
};

const NAV_THEME: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    background: 'rgba(255, 255, 255, 0.94)',
    border: 'rgba(0, 0, 0, 0.06)',
    shadow: 'rgba(0, 0, 0, 0.14)',
    active: Colors.light.primary,
    inactive: 'rgba(0, 0, 0, 0.38)',
    activeBackdrop: 'rgba(10, 132, 255, 0.10)',
    primary: Colors.light.primary,
  },
  dark: {
    background: 'rgba(18, 18, 20, 0.94)',
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.46)',
    active: Colors.dark.primary,
    inactive: 'rgba(255, 255, 255, 0.38)',
    activeBackdrop: 'rgba(10, 132, 255, 0.16)',
    primary: Colors.dark.primary,
  },
};function TabGlyph({
  routeName,
  focused,
  theme,
}: {
  routeName: TabName;
  focused: boolean;
  theme: ThemeTokens;
}) {
  const meta = TAB_META[routeName];
  const motion = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(motion, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
      mass: 0.8,
    }).start();
  }, [focused, motion]);

  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const labelOpacity = motion.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });

  const iconScale = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [1.08, 1.0],
  });

  const iconColor = focused ? theme.active : theme.inactive;
  //const iconFill = focused ? theme.active : 'transparent';

  return (
    // Outer view is the full tab cell — icon always perfectly centered in it
    <View style={styles.tabInner}>

      {/* Icon animates up via translateY, independently of label */}
      <Animated.View
        style={{
          transform: [{ translateY }, { scale: iconScale }],
        }}
      >
        <View style={styles.iconSlot}>
          <meta.Icon
            color={iconColor}

            size={meta.elevated ? 26 : 23}
            strokeWidth={focused ? 2.0 : 1.7}
          />
        </View>
      </Animated.View>

      {/* Label is absolutely positioned — never affects icon centering */}
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            position: 'absolute',
            bottom: 0,             // anchored to bottom of the cell
            color: theme.active,
            opacity: labelOpacity,
            transform: [{ translateY: labelTranslateY }],
          },
        ]}
      >
        {meta.label}
      </Animated.Text>

    </View>
  );
}
function TabButton({
  routeName,
  focused,
  onPress,
  onLongPress,
  theme,
}: {
  routeName: TabName;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  theme: ThemeTokens;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onLongPress={onLongPress}
      onPress={onPress}
   style={({ pressed }) => [styles.tabButton, pressed ? styles.pressed : null]}
    >
      <TabGlyph focused={focused} routeName={routeName} theme={theme} />
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const theme = NAV_THEME[scheme];
  const insets = useSafeAreaInsets();
  const [mountReady, setMountReady] = useState(false);

  const hiddenRoutes = ['/wallet/airtime', '/wallet/data', '/wallet/tv', '/wallet/electricity', '/settings', '/auth-lock', '/referrals', '/notifications'];

  const visibleRoutes = useMemo(
    () => state.routes.filter((route): route is (typeof state.routes)[number] & { name: TabName } => TAB_ORDER.includes(route.name as TabName)),
    [state.routes]
  );

  useEffect(() => {
    const timer = setTimeout(() => setMountReady(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: mountReady ? 0 : 24,
      useNativeDriver: true,
      damping: 16,
      stiffness: 140,
      mass: 0.9,
    }).start();
  }, [mountReady, translateY]);
  const isHomePath = pathname === '/' || pathname === '/index';

  if (!isHomePath) return null;

  if (hiddenRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null;
  if (!visibleRoutes.length) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.outer,
        {
          paddingBottom: insets.bottom + 8,
          opacity: mountReady ? 1 : 0,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(10,132,255,0.08)',
          },
        ]}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        {visibleRoutes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;

          return (
            <TabButton
              key={route.key}
              focused={focused}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (route.name === 'profile') {
                  if (!event.defaultPrevented) {
                    router.push('/settings');
                  }
                  return;
                }

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              }}
              routeName={route.name}
              theme={theme}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
  halo: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 4,
    bottom: 0,
    borderRadius: 30,
    opacity: 0.75,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 0.5,           // was 1 — thinner border, more refined
    justifyContent: 'center',
    paddingHorizontal: 8,       // was 10
    paddingTop: 8,              // was 10
    paddingBottom: 8,           // was 7 — now symmetric
    minHeight: 58,              // was 66 — less chunky
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },   // was 10
    shadowOpacity: 0.9,
    shadowRadius: 20,           // was 24
    elevation: 14,              // was 18
  },
   tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,            // enough room for icon + label when active
  },
 tabInner: {
  alignItems: 'center',
  justifyContent: 'center',  // icon always vertically centered
  minWidth: 48,
  minHeight: 52,             // enough room: icon centered + label at bottom
  position: 'relative',     // needed for absolute label
},
iconSlot: {
  width: 28,
  height: 28,
  alignItems: 'center',
  justifyContent: 'center',
},
label: {
  fontSize: Typography.xs,
  fontFamily: Typography.family.semibold,
  letterSpacing: 0.2,
  lineHeight: 13,
},

  pressed: {
    transform: [{ scale: 0.94 }],  // was 0.96 — more tactile
    opacity: 0.9,               // was 0.96
  },
});