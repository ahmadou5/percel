import { useCallback, useEffect, useRef } from "react";
import { Animated, BackHandler, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors } from "@/constants/palette";


type FlowProgressDotsProps = {
  currentStep: number;
  totalSteps: number;
  onStepPress?: (step: number) => void;
};

export function FlowProgressDots({ currentStep, totalSteps, onStepPress }: FlowProgressDotsProps) {
  const scheme = (useColorScheme() ?? "light") as keyof typeof Colors;
  const palette = Colors[scheme];

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ now: currentStep, min: 1, max: totalSteps }}>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: palette.primary,
              width: `${Math.max(0, Math.min(1, currentStep / totalSteps)) * 100}%`,
            },
          ]}
        />
      </View>
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const complete = step < currentStep;
          const interactive = Boolean(onStepPress) && (active || complete);

          return (
            <Pressable
              key={step}
              disabled={!interactive}
              accessibilityRole={interactive ? "button" : "text"}
              accessibilityLabel={`Step ${step}${complete ? ", completed" : active ? ", current" : ""}`}
              onPress={() => onStepPress?.(step)}
              style={[
                styles.dot,
                {
                  backgroundColor: complete || active ? palette.primary : palette.card,
                  borderColor: complete || active ? palette.primary : palette.border,
                  opacity: active ? 1 : complete ? 0.95 : 0.8,
                  transform: [{ scale: active ? 1.08 : 1 }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export function useStepBackHandler(step: number, onPreviousStep: () => void) {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step <= 1) return false;
        onPreviousStep();
        return true;
      });

      return () => subscription.remove();
    }, [onPreviousStep, step]),
  );
}

export function useSlideStepTransition(step: number) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    translateX.setValue(24);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, step, translateX]);

  return { opacity, translateX };
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  dot: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
});
