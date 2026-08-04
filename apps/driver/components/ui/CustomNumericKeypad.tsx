import React, { useRef } from 'react';
import { Delete, Fingerprint } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export type KeypadMode = 'pin' | 'currency' | 'number';

interface CustomNumericKeypadProps {
  onPressDigit: (digit: string) => void;
  onDelete: () => void;
  onClear?: () => void;
  mode?: KeypadMode;
  disabled?: boolean;
  leftAction?: '.' | '00' | 'bio' | 'none';
  onBiometricPress?: () => void;
}

export function CustomNumericKeypad({
  onPressDigit,
  onDelete,
  onClear,
  mode = 'number',
  disabled = false,
  leftAction,
  onBiometricPress,
}: CustomNumericKeypadProps) {
  const palette = useAppPalette();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressDigit = (digit: string) => {
    if (disabled) return;
    void haptics.tap();
    onPressDigit(digit);
  };

  const handleDeletePress = () => {
    if (disabled) return;
    void haptics.tap();
    onDelete();
  };

  const handleLongPressDelete = () => {
    if (disabled) return;
    void haptics.tap();
    if (onClear) {
      onClear();
    } else {
      onDelete();
    }
  };

  const handleBiometricPress = () => {
    if (disabled || !onBiometricPress) return;
    void haptics.tap();
    onBiometricPress();
  };

  const activeLeftAction = leftAction ?? (mode === 'currency' ? '.' : 'none');

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [activeLeftAction === 'none' ? '' : activeLeftAction, '0', 'DEL'],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key, keyIndex) => {
            if (key === '') {
              return <View key={`empty-${keyIndex}`} style={styles.keyPlaceholder} />;
            }

            if (key === 'bio') {
              return (
                <Pressable
                  key="bio-key"
                  onPress={handleBiometricPress}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: pressed ? palette.border : 'transparent',
                      opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
                    },
                  ]}
                  accessibilityLabel="Biometric Unlock"
                >
                  <Fingerprint size={24} color={palette.primary} />
                </Pressable>
              );
            }

            if (key === 'DEL') {
              return (
                <Pressable
                  key="del-key"
                  onPress={handleDeletePress}
                  onLongPress={handleLongPressDelete}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: pressed ? palette.border : 'transparent',
                      opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
                    },
                  ]}
                  accessibilityLabel="Delete"
                >
                  <Delete size={22} color={palette.text} />
                </Pressable>
              );
            }

            return (
              <Pressable
                key={`key-${key}`}
                onPress={() => handlePressDigit(key)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed ? palette.border : palette.card,
                    borderColor: palette.border,
                    opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityLabel={`Digit ${key}`}
              >
                <Text style={[styles.keyText, { color: palette.text }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 10,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  keyPlaceholder: {
    flex: 1,
    height: 52,
  },
  keyText: {
    fontSize: 22,
    fontFamily: Typography.family.bold,
  },
});
