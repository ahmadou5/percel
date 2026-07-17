import { ChevronRight, Loader2, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatHubLabel, formatHubLocation, formatHubType, listHubs } from '@/lib/hubs';
import { useAppPalette } from '@/lib/theme';
import type { Hub } from '@/types/hubs';
import { haptics } from '@/utils/haptics';

type Props = {
  label: string;
  value: Hub | null;
  onSelect: (hub: Hub) => void;
  placeholder?: string;
  helperText?: string;
  disabledHubId?: string;
  /** Live hubs from the API — falls back to static seed if empty */
  hubs?: Hub[];
  loading?: boolean;
};

function getTypeTone(type: Hub['type']) {
  switch (type) {
    case 'office':
      return { bg: 'rgba(10, 132, 255, 0.12)', text: '#0A84FF' };
    case 'agent':
      return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6' };
    case 'partner_park':
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' };
  }
}

export function HubPicker({ label, value, onSelect, placeholder = 'Select hub', helperText, disabledHubId, hubs: propHubs, loading = false }: Props) {
  const palette = useAppPalette();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const progress = useSharedValue(0);

  const hubs = useMemo(() => {
    const base = propHubs && propHubs.length > 0 ? propHubs : listHubs();
    const term = query.trim().toLowerCase();
    return base.filter((hub) => {
      if (!term) return true;
      return [hub.name, hub.city, hub.state, hub.address, formatHubType(hub)].some((field) => field.toLowerCase().includes(term));
    });
  }, [query, propHubs]);

  const groupedHubs = useMemo(() => {
    return hubs.reduce<Record<string, Hub[]>>((acc, hub) => {
      const key = hub.state;
      acc[key] = acc[key] ?? [];
      acc[key].push(hub);
      return acc;
    }, {});
  }, [hubs]);

  const stateKeys = Object.keys(groupedHubs).sort((a, b) => a.localeCompare(b));

  const openPicker = () => {
    setOpen(true);
    progress.value = withSpring(1, { damping: 18, stiffness: 180, mass: 0.85 });
  };

  const closePicker = () => {
    progress.value = withSpring(0, { damping: 18, stiffness: 180, mass: 0.85 });
    setTimeout(() => {
      setOpen(false);
      setQuery('');
    }, 180);
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [40, 0]) }],
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const selectedLabel = value ? formatHubLabel(value) : loading ? 'Loading hubs...' : placeholder;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <Pressable
        onPress={loading ? undefined : openPicker}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: palette.card,
            borderColor: value ? palette.primary : palette.border,
          },
          pressed && !loading ? { opacity: 0.92 } : null,
        ]}
      >
        <View style={styles.fieldCopy}>
          <Text style={[styles.fieldValue, { color: value ? palette.text : palette.textSecondary }]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          {value ? <Text style={[styles.fieldMeta, { color: palette.textSecondary }]} numberOfLines={1}>{formatHubLocation(value)}</Text> : null}
        </View>
        {loading ? (
          <ActivityIndicator size={16} color={palette.textSecondary} />
        ) : (
          <ChevronRight size={18} color={palette.primary} />
        )}
      </Pressable>
      {helperText ? <Text style={[styles.helper, { color: palette.textSecondary }]}>{helperText}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.backdrop} onPress={closePicker} />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.primary },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: palette.text }]}>Select hub</Text>
          <Text style={[styles.sheetSubtitle, { color: palette.textSecondary }]}>Choose the hub for this leg of the waybill.</Text>

          <View style={[styles.searchRow, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Search size={16} color={palette.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search city, state, or hub"
              placeholderTextColor={palette.textSecondary}
              style={[styles.searchInput, { color: palette.text }]}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {stateKeys.length ? (
              stateKeys.map((state) => (
                <View key={state} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: palette.textSecondary }]}>{state}</Text>
                  {groupedHubs[state].map((hub) => {
                    const disabled = Boolean(disabledHubId && hub.id === disabledHubId);
                    const selected = value?.id === hub.id;
                    const tone = getTypeTone(hub.type);

                    return (
                      <Pressable
                        key={hub.id}
                        disabled={disabled}
                        onPress={() => {
                          void haptics.tap();
                          onSelect(hub);
                          closePicker();
                        }}
                        style={({ pressed }) => [
                          styles.row,
                          {
                            backgroundColor: selected ? `${palette.primary}14` : palette.bg,
                            borderColor: selected ? palette.primary : palette.border,
                            opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
                          },
                        ]}
                      >
                        <View style={styles.rowCopy}>
                          <View style={styles.rowTitleLine}>
                            <Text style={[styles.rowTitle, { color: palette.text }]}>{hub.name}</Text>
                            {selected ? <Text style={[styles.selectedMark, { color: palette.primary }]}>Selected</Text> : null}
                          </View>
                          <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>{formatHubLocation(hub)}</Text>
                          <Text style={[styles.rowMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                            {hub.address}
                          </Text>
                        </View>
                        <View style={styles.rowAside}>
                          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                            <Text style={[styles.badgeText, { color: tone.text }]}>{formatHubType(hub)}</Text>
                          </View>
                          <ChevronRight size={18} color={palette.textSecondary} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: palette.text }]}>No hubs found</Text>
                <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>Try a different city, state, or hub name.</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  field: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fieldCopy: { flex: 1, gap: 3 },
  fieldValue: { fontSize: Typography.md, fontFamily: Typography.family.semibold },
  fieldMeta: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  helper: { fontSize: Typography.xs },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '82%',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 18,
  },
  handle: { width: 48, height: 5, borderRadius: 99, backgroundColor: 'rgba(148,163,184,0.35)', alignSelf: 'center' },
  sheetTitle: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  sheetSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },
  searchRow: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  listContent: { gap: Spacing.md, paddingBottom: Spacing.lg },
  group: { gap: Spacing.sm },
  groupTitle: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1.1, fontFamily: Typography.family.bold },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCopy: { flex: 1, gap: 4 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, flex: 1 },
  selectedMark: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  rowMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  rowAside: { alignItems: 'flex-end', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center' },
});
