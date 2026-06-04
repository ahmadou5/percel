import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

import { useReduceMotion } from "@/hooks/useReduceMotion";

type Props = {
  children: ReactNode;
  delay?: number;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedReveal({ children, delay = 0, index = 0, style }: Props) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 20)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const stagger = Math.min(index, 8) * 50;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: delay + stagger,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: delay + stagger,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
    ]).start();
  }, [delay, index, opacity, reduceMotion, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
