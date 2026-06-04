import { useCallback, useEffect, useRef } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type FlowProgressDotsProps = {
  currentStep: number;
  totalSteps: number;
  onStepPress?: (step: number) => void;
};

export function FlowProgressDots({ currentStep, totalSteps, onStepPress }: FlowProgressDotsProps) {
  const palette = useAppPalette();
  const reduceMotion = useReduceMotion();
  const fill = useRef(new Animated.Value(currentStep / totalSteps)).current;
  const prevStep = useRef(currentStep);

  useEffect(() => {
    const next = Math.max(0, Math.min(1, currentStep / totalSteps));
    if (currentStep > prevStep.current) {
      void haptics.success();
    }
    prevStep.current = currentStep;

    if (reduceMotion) {
      fill.setValue(next);
      return;
    }

    Animated.spring(fill, {
      toValue: next,
      damping: 20,
      stiffness: 150,
      useNativeDriver: false,
    }).start();
  }, [currentStep, fill, reduceMotion, totalSteps]);

  const fillWidth = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ now: currentStep, min: 1, max: totalSteps }}>
      <View style={[styles.track, { backgroundColor: palette.border }]}> 
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: palette.primary,
              width: fillWidth,
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
          const label = 'Step ' + step + (complete ? ', completed' : active ? ', current' : '');

          return (
            <Pressable
              key={step}
              disabled={!interactive}
              accessibilityRole={interactive ? 'button' : 'text'}
              accessibilityLabel={label}
              onPress={() => {
                void haptics.tap();
                onStepPress?.(step);
              }}
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
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step <= 1) return false;
        onPreviousStep();
        return true;
      });

      return () => subscription.remove();
    }, [onPreviousStep, step]),
  );
}

export function useSlideStepTransition(step: number) {
  const reduceMotion = useReduceMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;

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
  }, [opacity, reduceMotion, step, translateX]);

  return { opacity, translateX };
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dot: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
});
