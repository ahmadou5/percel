import { useMemo, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, MoonStar, Palette, Smartphone, SunMedium, Check } from 'lucide-react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette, getThemeLabel } from '@/lib/theme';
import { usePreferencesStore, type CustomTheme, type ThemeMode } from '@/store/preferences.store';

const THEME_OPTIONS: Array<{
  key: ThemeMode;
  label: string;
  description: string;
  Icon: typeof SunMedium;
}> = [
  { key: 'light', label: 'Light', description: 'Bright surfaces and crisp contrast for daytime use.', Icon: SunMedium },
  { key: 'dark', label: 'Dark', description: 'Deep surfaces with softer contrast for low-light use.', Icon: MoonStar },
  { key: 'system', label: 'System', description: 'Follow the device setting. This is the default.', Icon: Smartphone },
];

const ACCENT_SWATCHES = ['#14B8A6', '#0EA5E9', '#6366F1', '#F59E0B', '#EF4444', '#22C55E'] as const;
const BACKGROUND_SWATCHES = ['#06161A', '#0F172A', '#0A0F1D', '#F8FAFC', '#F3F4F6', '#FAF7F0'] as const;

export default function DriverPreferencesScreen() {
  const back = useSafeBack('/(tabs)/settings');
  const palette = useAppPalette();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const deviceScheme = (useDeviceColorScheme() ?? 'dark') as 'light' | 'dark';
  const customTheme = usePreferencesStore((state) => state.customTheme);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
  const setCustomTheme = usePreferencesStore((state) => state.setCustomTheme);
  const [customVisible, setCustomVisible] = useState(false);
  const [draftTheme, setDraftTheme] = useState<CustomTheme>(customTheme);

  const currentThemeLabel = useMemo(() => getThemeLabel(themeMode, deviceScheme), [deviceScheme, themeMode]);
  const activeTheme = themeMode === 'custom' ? 'Custom' : currentThemeLabel;
  const selectedTheme = themeMode === 'custom' ? 'custom' : themeMode;

  const openCustomTheme = () => {
    setDraftTheme(customTheme);
    setCustomVisible(true);
  };

  const applyCustomTheme = async () => {
    await setCustomTheme(draftTheme);
    await setThemeMode('custom');
    setCustomVisible(false);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => back()}
          style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Hero card */}
      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.heroLabel, { color: palette.textSecondary }]}>Appearance</Text>
        <Text style={[styles.heroTitle, { color: palette.text }]}>
          Pick a theme that matches how you like to drive.
        </Text>
      </View>

      {/* Theme picker card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.activeRow}>
          <View style={styles.activeCopy}>
            <View style={[styles.activeDot, { backgroundColor: palette.success }]} />
            <Text style={[styles.activeLabel, { color: palette.textSecondary }]}>Active: {activeTheme}</Text>
          </View>
          <Text style={[styles.activeHint, { color: palette.textSecondary }]}>Syncs across the app</Text>
        </View>

        <View style={styles.themeList}>
          {THEME_OPTIONS.map((item) => {
            const isActive = selectedTheme === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => void setThemeMode(item.key)}
                style={({ pressed }) => [
                  styles.themeRow,
                  {
                    backgroundColor: palette.bg,
                    borderColor: isActive ? palette.primary : palette.border,
                    opacity: pressed ? 0.96 : 1,
                  },
                ]}
              >
                <View style={[styles.themeIcon, { backgroundColor: isActive ? 'rgba(20,184,166,0.14)' : 'rgba(148,163,184,0.10)' }]}>
                  <item.Icon size={18} color={isActive ? palette.primary : palette.textSecondary} />
                </View>
                <View style={styles.themeCopy}>
                  <Text style={[styles.themeTitle, { color: palette.text }]}>{item.label}</Text>
                  <Text style={[styles.themeSubtitle, { color: palette.textSecondary }]}>{item.description}</Text>
                </View>
                <View style={[styles.selectionDot, { borderColor: isActive ? palette.primary : palette.border, backgroundColor: isActive ? palette.primary : 'transparent' }]}>
                  {isActive ? <Check size={11} color={palette.card} /> : null}
                </View>
              </Pressable>
            );
          })}

          {/* Custom theme row */}
          <Pressable
            onPress={openCustomTheme}
            style={({ pressed }) => [
              styles.themeRow,
              {
                backgroundColor: palette.bg,
                borderColor: themeMode === 'custom' ? palette.primary : palette.border,
                opacity: pressed ? 0.96 : 1,
              },
            ]}
          >
            <View style={[styles.themeIcon, { backgroundColor: themeMode === 'custom' ? 'rgba(20,184,166,0.14)' : 'rgba(148,163,184,0.10)' }]}>
              <Palette size={18} color={themeMode === 'custom' ? palette.primary : palette.textSecondary} />
            </View>
            <View style={styles.themeCopy}>
              <Text style={[styles.themeTitle, { color: palette.text }]}>Custom</Text>
              <Text style={[styles.themeSubtitle, { color: palette.textSecondary }]}>
                Build a palette with your own accent and background colors.
              </Text>
            </View>
            <View style={[styles.selectionDot, { borderColor: themeMode === 'custom' ? palette.primary : palette.border, backgroundColor: themeMode === 'custom' ? palette.primary : 'transparent' }]}>
              {themeMode === 'custom' ? <Check size={11} color={palette.card} /> : null}
            </View>
          </Pressable>
        </View>
      </View>

      {/* Custom theme modal */}
      <Modal visible={customVisible} transparent animationType="fade" onRequestClose={() => setCustomVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCustomVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: palette.text }]}>Custom theme</Text>
              <Text style={[styles.sheetCopy, { color: palette.textSecondary }]}>
                Pick an accent and background, then preview the palette before applying it.
              </Text>
            </View>

            {/* Live preview */}
            <View style={styles.previewCard}>
              <View style={[styles.previewScreen, { backgroundColor: draftTheme.background }]}>
                <View style={styles.previewTopRow}>
                  <View style={[styles.previewPill, { backgroundColor: draftTheme.accent }]} />
                  <View style={[styles.previewPillSmall, { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
                </View>
                <View style={[styles.previewPanel, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <Text style={styles.previewTitle}>Status • Earnings • Trips</Text>
                  <View style={styles.previewRow}>
                    <View style={[styles.previewChip, { backgroundColor: draftTheme.accent }]} />
                    <View style={[styles.previewChip, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Accent swatches */}
            <View style={styles.optionGroup}>
              <Text style={[styles.optionLabel, { color: palette.textSecondary }]}>Primary accent</Text>
              <View style={styles.swatchRow}>
                {ACCENT_SWATCHES.map((color) => {
                  const active = draftTheme.accent === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => setDraftTheme((current) => ({ ...current, accent: color }))}
                      style={[styles.swatch, { backgroundColor: color, borderColor: active ? palette.text : 'transparent' }]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Background swatches */}
            <View style={styles.optionGroup}>
              <Text style={[styles.optionLabel, { color: palette.textSecondary }]}>Background</Text>
              <View style={styles.swatchRow}>
                {BACKGROUND_SWATCHES.map((color) => {
                  const active = draftTheme.background === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => setDraftTheme((current) => ({ ...current, background: color }))}
                      style={[styles.swatch, { backgroundColor: color, borderColor: active ? palette.text : palette.border }]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setCustomVisible(false)}
                style={[styles.sheetButton, { backgroundColor: palette.bg, borderColor: palette.border }]}
              >
                <Text style={[styles.sheetButtonText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void applyCustomTheme()}
                style={[styles.sheetButton, { backgroundColor: palette.primary, borderColor: palette.primary }]}
              >
                <Text style={[styles.sheetButtonText, { color: palette.card }]}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 8 },
  heroLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.family.bold },
  heroTitle: { fontSize: Typography.lg, lineHeight: 26, fontFamily: Typography.family.bold },
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeCopy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 9, height: 9, borderRadius: 4.5 },
  activeLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  activeHint: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  themeList: { gap: 10 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 1, padding: Spacing.md },
  themeIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  themeCopy: { flex: 1, gap: 2 },
  themeTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  themeSubtitle: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  selectionDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, padding: Spacing.lg, gap: 16 },
  sheetHandle: { width: 48, height: 5, borderRadius: 99, backgroundColor: 'rgba(148,163,184,0.35)', alignSelf: 'center' },
  sheetHeader: { gap: 6 },
  sheetTitle: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  sheetCopy: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  previewCard: { borderRadius: 24, overflow: 'hidden' },
  previewScreen: { minHeight: 190, padding: 16, gap: 12 },
  previewTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewPill: { width: 68, height: 14, borderRadius: 999 },
  previewPillSmall: { width: 32, height: 14, borderRadius: 999 },
  previewPanel: { borderRadius: 22, padding: 14, gap: 10 },
  previewLabel: { color: '#fff', fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1 },
  previewTitle: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  previewRow: { flexDirection: 'row', gap: 8 },
  previewChip: { height: 18, flex: 1, borderRadius: 9 },
  optionGroup: { gap: 10 },
  optionLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.family.bold },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 40, height: 40, borderRadius: 14, borderWidth: 2 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetButton: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
