import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppPalette } from '@/lib/theme';

export interface TooltipProps {
  isFirstStep?: boolean;
  isLastStep?: boolean;
  handleNext?: () => void;
  handlePrev?: () => void;
  handleStop?: () => void;
  currentStep?: {
    name?: string;
    order?: number;
    text?: string;
    title?: string;
  };
  labels?: {
    skip?: string;
    previous?: string;
    next?: string;
    finish?: string;
  };
}

export const CustomTooltip: React.FC<TooltipProps> = ({
  isFirstStep,
  isLastStep,
  handleNext,
  handlePrev,
  handleStop,
  currentStep,
  labels,
}) => {
  const palette = useAppPalette();

  const title = currentStep?.title || currentStep?.name || 'Driver App Tour';
  const text = currentStep?.text || '';
  const order = currentStep?.order ?? 1;

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.stepBadge, { backgroundColor: palette.primary + '1F' }]}>
          <Text style={[styles.stepBadgeText, { color: palette.primary }]}>
            Step {order}
          </Text>
        </View>
        <TouchableOpacity onPress={handleStop} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.skipText, { color: palette.textSecondary }]}>
            {labels?.skip || 'Skip'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      {Boolean(text) && <Text style={[styles.description, { color: palette.textSecondary }]}>{text}</Text>}

      {/* Footer / Buttons */}
      <View style={styles.footer}>
        {!isFirstStep ? (
          <TouchableOpacity
            onPress={handlePrev}
            activeOpacity={0.8}
            style={[styles.btnSecondary, { borderColor: palette.border }]}
          >
            <Text style={[styles.btnSecondaryText, { color: palette.text }]}>
              {labels?.previous || 'Back'}
            </Text>
          </TouchableOpacity>
        ) : <View />}

        <TouchableOpacity
          onPress={isLastStep ? handleStop : handleNext}
          activeOpacity={0.85}
          style={[styles.btnPrimary, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.btnPrimaryText}>
            {isLastStep ? (labels?.finish || 'Got it!') : (labels?.next || 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 18,
    width: 290,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
  },
  skipText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 17,
    marginBottom: 6,
  },
  description: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  btnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    fontSize: 13,
  },
});
