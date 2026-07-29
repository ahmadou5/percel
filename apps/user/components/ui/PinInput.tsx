import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from "react-native";

import { Typography } from "@/constants/typography";
import { useAppPalette } from "@/lib/theme";
import { haptics } from "@/utils/haptics";

interface PinInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  secureTextEntry?: boolean;
  loading?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function PinInput({
  value,
  onChangeText,
  length = 4,
  secureTextEntry = true,
  loading = false,
  error,
  autoFocus = true,
}: PinInputProps) {
  const palette = useAppPalette();

  // Split value into an array of characters
  const code = Array.from({ length }).map((_, i) => value[i] ?? '');

  // Ref array for input boxes
  const refs = useRef<(TextInput | null)[]>([]);

  // State to track which digit input is currently focused
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0].focus();
    }
  }, [autoFocus]);

  // Keep focus in sync when loading becomes false
  useEffect(() => {
    if (!loading && value.length < length) {
      const nextIndex = value.length;
      refs.current[nextIndex]?.focus();
    }
  }, [loading, value.length, length]);

  const handleChangeText = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      // If we cleared a digit
      const nextCode = [...code];
      nextCode[index] = '';
      onChangeText(nextCode.join(''));
      return;
    }

    if (cleaned.length > 1) {
      // Auto-paste full or partial OTP code
      const nextCode = [...code];
      const chars = cleaned.slice(0, length - index).split('');
      chars.forEach((char, i) => {
        if (index + i < length) {
          nextCode[index + i] = char;
        }
      });
      const newValue = nextCode.join('');
      onChangeText(newValue);
      void haptics.tap();

      const nextFocus = Math.min(index + chars.length, length - 1);
      refs.current[nextFocus]?.focus();
      return;
    }

    const digit = cleaned[0];
    const nextCode = [...code];
    nextCode[index] = digit;
    const newValue = nextCode.join('');
    onChangeText(newValue);

    void haptics.tap();

    // Auto-advance focus
    if (index < length - 1 && digit) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (code[index] === '') {
        if (index > 0) {
          const nextCode = [...code];
          nextCode[index - 1] = '';
          onChangeText(nextCode.join(''));
          refs.current[index - 1]?.focus();
          void haptics.tap();
        }
      } else {
        const nextCode = [...code];
        nextCode[index] = '';
        onChangeText(nextCode.join(''));
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.boxContainer, { gap: length > 4 ? 8 : 14 }]}>
        {Array.from({ length }).map((_, index) => {
          const isFocused = focusedIndex === index;
          const hasValue = !!code[index];

          return (
            <Pressable
              key={index}
              onPress={() => refs.current[index]?.focus()}
              style={[
                styles.pinBox,
                {
                  width: length > 4 ? 44 : 52,
                  height: length > 4 ? 48 : 52,
                  borderColor: error
                    ? palette.error
                    : isFocused
                    ? palette.primary
                    : palette.border,
                  backgroundColor: isFocused
                    ? 'rgba(10, 132, 255, 0.04)'
                    : palette.card,
                },
                isFocused && styles.pinBoxFocused,
              ]}
            >
              {hasValue ? (
                secureTextEntry ? (
                  <View
                    style={[
                      styles.secureDot,
                      { backgroundColor: palette.text },
                    ]}
                  />
                ) : (
                  <Text style={[styles.pinText, { color: palette.text }]}>
                    {code[index]}
                  </Text>
                )
              ) : null}
              <TextInput
                ref={(ref) => {
                  refs.current[index] = ref;
                }}
                value={code[index]}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                keyboardType="number-pad"
                maxLength={length}
                style={styles.hiddenInput}
                caretHidden
                selectTextOnFocus
              />
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  boxContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  pinBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pinBoxFocused: {
    borderWidth: 2,
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pinText: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  secureDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    textAlign: 'center',
  },
  loadingContainer: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  errorText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.semibold,
    marginTop: 8,
    textAlign: 'center',
  },
});
