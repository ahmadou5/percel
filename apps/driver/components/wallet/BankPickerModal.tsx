import { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckCircle2, Search } from 'lucide-react-native';
import { getBankLogoUrl } from '@percel/shared';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { hexToRgba, useAppPalette } from '@/lib/theme';

export type BankItem = {
  name: string;
  code: string;
  slug?: string | null;
  longcode?: string | null;
};

type BankPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (bank: BankItem) => void;
  selectedBankCode?: string;
  banks: BankItem[];
  banksLoading?: boolean;
};

const BANK_PALETTE = [
  "#0A84FF", "#30D158", "#FF9F0A", "#FF375F", "#BF5AF2",
  "#32ADE6", "#FF6961", "#5AC8FA", "#AC8E68", "#34C759",
];

function bankInitialColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BANK_PALETTE[Math.abs(hash) % BANK_PALETTE.length];
}

function BankAvatar({ name, size = 38 }: { name: string; size?: number }) {
  const color = bankInitialColor(name);
  const initial = name.trim().charAt(0).toUpperCase() || 'B';
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 4,
      backgroundColor: hexToRgba(color ?? '#888888', 0.14),
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.4, fontWeight: '700' }}>
        {initial}
      </Text>
    </View>
  );
}

export function BankLogo({
  name,
  slug,
  bankCode,
  size = 38,
}: {
  name: string;
  slug?: string | null;
  bankCode?: string | null;
  size?: number;
}) {
  const palette = useAppPalette();
  const url = getBankLogoUrl(bankCode || undefined, name, slug);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (failed) {
    return <BankAvatar name={name} size={size} />;
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        overflow: 'hidden',
        backgroundColor: palette.card,
        borderColor: palette.border,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
        }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

export function BankPickerModal({
  visible,
  onClose,
  onSelect,
  selectedBankCode,
  banks,
  banksLoading = false,
}: BankPickerModalProps) {
  const palette = useAppPalette();
  const [search, setSearch] = useState('');

  const filteredBanks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((bank) =>
      `${bank.name} ${bank.code} ${bank.slug ?? ''}`.toLowerCase().includes(term)
    );
  }, [search, banks]);

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Select Bank</Text>
              <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Choose your bank for NUBAN account lookup</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
              <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
            </Pressable>
          </View>

          <View style={[styles.searchBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Search size={16} color={palette.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search bank name..."
              placeholderTextColor={palette.textSecondary}
            />
          </View>

          {banksLoading ? (
            <View style={styles.bankLoading}>
              <Text style={{ color: palette.textSecondary }}>Loading bank list…</Text>
            </View>
          ) : filteredBanks.length === 0 ? (
            <View style={styles.bankLoading}>
              <Text style={{ color: palette.textSecondary }}>
                {search ? 'No banks matched your search.' : 'No banks available.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              style={styles.bankList}
              contentContainerStyle={styles.bankListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.code === selectedBankCode;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    style={[
                      styles.bankRow,
                      {
                        backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg,
                        borderColor: active ? palette.primary : palette.border,
                      },
                    ]}
                  >
                    <BankLogo name={item.name} slug={item.slug} bankCode={item.code} size={40} />
                    <Text
                      style={[styles.bankRowName, { color: palette.text, flex: 1, marginLeft: 12 }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {active ? (
                      <View style={[styles.checkboxCheck, { backgroundColor: palette.primary }]}>
                        <CheckCircle2 size={14} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.checkboxEmpty, { borderColor: palette.border }]} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
    height: '80%',
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.xs, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 48, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, height: '100%', fontSize: Typography.sm },
  bankLoading: { paddingVertical: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  bankList: { flex: 1, minHeight: 160 },
  bankListContent: { paddingBottom: Spacing.md },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  bankRowName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  checkboxCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
});
