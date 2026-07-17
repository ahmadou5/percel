import { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, Search } from 'lucide-react-native';
import { getBankLogoUrl } from '@percel/shared';

import { Input } from '@/components/ui/Input';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useBanks } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';

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
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.4, fontFamily: 'System', fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

export function BankLogo({ name, slug, bankCode, size = 38 }: { name: string; slug?: string | null; bankCode?: string | null; size?: number }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const url = getBankLogoUrl(bankCode || undefined, name, slug);
  useEffect(() => {
    setLogoFailed(false);
  }, [url]);
  if (url && !logoFailed) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Image source={{ uri: url }} style={{ width: size * 0.82, height: size * 0.82 }} resizeMode="contain" onError={() => setLogoFailed(true)} />
      </View>
    );
  }
  return <BankAvatar name={name} size={size} />;
}

export function BankPickerModal({
  visible,
  onClose,
  onSelect,
  selectedBankCode,
}: BankPickerModalProps) {
  const palette = useAppPalette();
  const banksQuery = useBanks('PAYSTACK');
  const [search, setSearch] = useState('');

  const banks = (banksQuery.data ?? []) as BankItem[];

  const filteredBanks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((bank) => `${bank.name} ${bank.code} ${bank.slug ?? ''}`.toLowerCase().includes(term));
  }, [search, banks]);

  // Reset search when modal becomes visible or invisible
  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a bank</Text>
              <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Search the supported bank list.</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
              <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
            </Pressable>
          </View>

          <Input
            label="Search banks"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or code"
            leftElement={<Search size={16} color={palette.textSecondary} />}
          />

          {banksQuery.isLoading ? (
            <View style={styles.bankLoading}>
              <Text style={{ color: palette.textSecondary }}>Loading bank list...</Text>
            </View>
          ) : filteredBanks.length ? (
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              style={styles.bankList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.code === selectedBankCode;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    style={[styles.bankRow, { backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg, borderColor: active ? palette.primary : palette.border }]}
                  >
                    <BankLogo name={item.name} slug={item.slug} bankCode={item.code} size={38} />
                    <Text style={[styles.bankRowName, { color: palette.text, flex: 1, marginLeft: 10 }]} numberOfLines={1}>
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
          ) : (
            <View style={styles.bankLoading}>
              <Text style={{ color: palette.textSecondary }}>No banks match your search.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  bankLoading: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  bankList: { maxHeight: 320 },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  bankRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  checkboxCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
});
