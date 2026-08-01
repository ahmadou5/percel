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
      backgroundColor: color + '22',
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
  const url = getBankLogoUrl(bankCode || undefined, name, slug);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [url]);

  if (failed) {
    return <BankAvatar name={name} size={size} />;
  }

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <BankAvatar name={name} size={size} />
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: loaded ? 1 : 0,
        }}
        onLoad={() => setLoaded(true)}
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
  banksLoading,
}: BankPickerModalProps) {
  const palette = useAppPalette();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.includes(q) ||
        (b.slug && b.slug.toLowerCase().includes(q)),
    );
  }, [banks, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>

          {/* Header handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]}>Select Bank</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              Choose recipient financial institution
            </Text>
          </View>

          <View style={[styles.searchBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Search size={16} color={palette.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search bank name or code…"
              placeholderTextColor={palette.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Bank List */}
          {banksLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Loading bank list…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {search ? `No banks matching "${search}"` : 'No banks available.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code + item.name}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedBankCode;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.bankRow,
                      isSelected && { backgroundColor: palette.primary + '14' },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <BankLogo name={item.name} slug={item.slug} bankCode={item.code} size={38} />
                    <View style={styles.bankInfo}>
                      <Text
                        style={[
                          styles.bankName,
                          { color: isSelected ? palette.primary : palette.text },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.bankCode, { color: palette.textSecondary }]}>
                        Code: {item.code}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle2 color={palette.primary} size={20} style={styles.checkIcon} />
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  subtitle: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: 14,
    marginBottom: 2,
  },
  bankInfo: {
    flex: 1,
    marginLeft: Spacing.sm + 2,
  },
  bankName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  bankCode: {
    fontSize: 11,
    marginTop: 1,
  },
  checkIcon: {
    marginLeft: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sm,
    textAlign: 'center',
  },
});
