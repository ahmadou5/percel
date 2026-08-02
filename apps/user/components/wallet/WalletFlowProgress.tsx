import { useCallback, useEffect, useRef } from 'react';
import { Animated, BackHandler, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { haptics } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type FlowProgressDotsProps = {
  currentStep: number;
  totalSteps: number;
  onStepPress?: (step: number) => void;
};

/**
 * Expanding-pill step tracker.
 *
 * - Active step: wide bright pill (width springs to ~24)
 * - Completed step: narrower, 65 % opacity
 * - Future step: narrowest, 25 % opacity
 *
 * All transitions use a native-driver `Animated.spring` so they stay at
 * 60 fps even on the JS thread. Accessibility role / labels are preserved.
 */
export function FlowProgressDots({ currentStep, totalSteps, onStepPress }: FlowProgressDotsProps) {
  const reduceMotion = useReduceMotion();

  // One animated width value per dot
  const widths = useRef(
    Array.from({ length: totalSteps }, (_, i) =>
      new Animated.Value(i + 1 === currentStep ? 24 : 8),
    ),
  ).current;

  // One animated opacity value per dot
  const opacities = useRef(
    Array.from({ length: totalSteps }, (_, i) => {
      const s = i + 1;
      return new Animated.Value(s === currentStep ? 1 : s < currentStep ? 0.65 : 0.25);
    }),
  ).current;

  const prevStep = useRef(currentStep);

  useEffect(() => {
    if (currentStep > prevStep.current) {
      void haptics.success();
    }
    prevStep.current = currentStep;

    const springs = Array.from({ length: totalSteps }, (_, i) => {
      const s = i + 1;
      const targetW = s === currentStep ? 24 : 8;
      const targetO = s === currentStep ? 1 : s < currentStep ? 0.65 : 0.25;

      if (reduceMotion) {
        widths[i].setValue(targetW);
        opacities[i].setValue(targetO);
        return null;
      }

      return Animated.parallel([
        Animated.spring(widths[i], {
          toValue: targetW,
          damping: 18,
          stiffness: 200,
          useNativeDriver: false, // width can't use native driver
        }),
        Animated.spring(opacities[i], {
          toValue: targetO,
          damping: 20,
          stiffness: 180,
          useNativeDriver: false, // matches JS driver of width on the same animated node
        }),
      ]);
    }).filter(Boolean) as Animated.CompositeAnimation[];

    if (springs.length) {
      Animated.parallel(springs).start();
    }
  }, [currentStep, opacities, reduceMotion, totalSteps, widths]);

  return (
    <View
      style={{ flexDirection: 'row', gap: 6 }}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: currentStep, min: 1, max: totalSteps }}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const active = step === currentStep;
        const complete = step < currentStep;
        const interactive = Boolean(onStepPress) && (active || complete);
        const label = `Step ${step}${complete ? ', completed' : active ? ', current' : ''}`;

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
          >
            <Animated.View
              style={{
                height: 6,
                borderRadius: 999,
                backgroundColor: '#ffffff',
                width: widths[i],
                opacity: opacities[i],
              }}
            />
          </Pressable>
        );
      })}
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
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Animation intentionally disabled — cards stay in place across steps.
  useEffect(() => {
    translateX.setValue(0);
    opacity.setValue(1);
  }, [step, opacity, translateX]);

  return { opacity, translateX };
}
