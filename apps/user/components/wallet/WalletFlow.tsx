import { Image, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';


type StepItem = {
  key: number;
  label: string;
  hint?: string;
};

type WalletStepperProps = {
  currentStep: number;
  steps: StepItem[];
};

type ProviderBadgeProps = {
  serviceID: string;
  name: string;
  logoUrl?: string | null;
  logo?: string | null;
  size?: number;
};

function providerTone(serviceID: string) {
  const id = serviceID.toLowerCase();
  if (id.includes('mtn')) {
    return { backgroundColor: '#FFD200', textColor: '#111827', label: 'MTN' };
  }
  if (id.includes('airtel')) {
    return { backgroundColor: '#E10000', textColor: '#FFFFFF', label: 'Airtel' };
  }
  if (id.includes('glo')) {
    return { backgroundColor: '#2E7D32', textColor: '#FFFFFF', label: 'Glo' };
  }
  if (id.includes('9mobile') || id.includes('etisalat') || id.includes('t2')) {
    return { backgroundColor: '#005A36', textColor: '#FFFFFF', label: 'T2 Mobile' };
  }
  if (id.includes('dstv')) {
    return { backgroundColor: '#009FE3', textColor: '#FFFFFF', label: 'DStv' };
  }
  if (id.includes('gotv')) {
    return { backgroundColor: '#E31B23', textColor: '#FFFFFF', label: 'GOtv' };
  }
  if (id.includes('startimes')) {
    return { backgroundColor: '#FF6600', textColor: '#FFFFFF', label: 'StarTimes' };
  }
  if (id.includes('showmax')) {
    return { backgroundColor: '#111111', textColor: '#E50914', label: 'Showmax' };
  }
  if (id.includes('ikeja')) {
    return { backgroundColor: '#E31C24', textColor: '#FFFFFF', label: 'IKEDC' };
  }
  if (id.includes('eko')) {
    return { backgroundColor: '#0066B2', textColor: '#FFFFFF', label: 'EKEDP' };
  }
  if (id.includes('abuja') || id.includes('aedc')) {
    return { backgroundColor: '#009639', textColor: '#FFFFFF', label: 'AEDC' };
  }
  if (id.includes('phed')) {
    return { backgroundColor: '#FF8C00', textColor: '#FFFFFF', label: 'PHED' };
  }
  if (id.includes('jos')) {
    return { backgroundColor: '#008080', textColor: '#FFFFFF', label: 'JEDC' };
  }
  if (id.includes('kano')) {
    return { backgroundColor: '#D21F3C', textColor: '#FFFFFF', label: 'KEDCO' };
  }
  if (id.includes('kaduna')) {
    return { backgroundColor: '#004F9F', textColor: '#FFFFFF', label: 'KAEDCO' };
  }

  return {
    backgroundColor: '#334155',
    textColor: '#FFFFFF',
    label: name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase(),
  };
}

export function normalizeNigerianPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (trimmed.startsWith('+234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;

  return trimmed;
}

export function providerLabelFromService(serviceID: string, name: string) {
  const tone = providerTone(serviceID);
  if (tone.label) return tone.label;
  return name;
}

export function WalletStepper({ currentStep, steps }: WalletStepperProps) {
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];

  return (
    <View style={styles.stepper}>
      {steps.map((step, index) => {
        const active = currentStep === step.key;
        const complete = currentStep > step.key;
        const tone = complete
          ? { backgroundColor: palette.primary, borderColor: palette.primary, textColor: palette.card }
          : active
            ? { backgroundColor: 'rgba(10,132,255,0.12)', borderColor: palette.primary, textColor: palette.primary }
            : { backgroundColor: palette.bg, borderColor: palette.border, textColor: palette.textSecondary };

        return (
          <View key={step.key} style={styles.stepItem}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepDot, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
                <Text style={[styles.stepDotText, { color: tone.textColor }]}>{step.key}</Text>
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.stepLine, { backgroundColor: complete ? palette.primary : palette.border }]} />
              ) : null}
            </View>
            <Text style={[styles.stepLabel, { color: active || complete ? palette.text : palette.textSecondary }]}>{step.label}</Text>
            {step.hint ? (
              <Text style={[styles.stepHint, { color: palette.textSecondary }]} numberOfLines={2}>
                {step.hint}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function ProviderBadge({ serviceID, logoUrl, logo, size = 32 }: ProviderBadgeProps) {
  const tone = providerTone(serviceID);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.backgroundColor,
        },
      ]}
    >
      {logoUrl || logo ? (
        <Image source={{ uri: logoUrl ?? logo ?? "" }} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" />
      ) : (
        <Text style={[styles.badgeText, { color: tone.textColor, fontSize: Math.max(10, size * 0.28) }]}>{tone.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  stepItem: {
    flex: 1,
    gap: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
  },
  stepLabel: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepHint: {
    fontSize: Typography.xs,
    lineHeight: 14,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  badgeText: {
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
});
