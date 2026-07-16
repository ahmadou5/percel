/**
 * AirtimeContactsSheet
 *
 * A bottom-sheet that shows two sections:
 *  1. Recent / saved airtime recipients (from the beneficiary store)
 *  2. Phone contacts (from expo-contacts, filtered by phone number)
 *
 * Usage:
 *   const sheetRef = useRef<BottomSheetRef>(null);
 *   <AirtimeContactsSheet ref={sheetRef} onSelect={({ phone, serviceID, providerName }) => { … }} />
 *   sheetRef.current?.open();
 */
import BottomSheet, { BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Contacts from 'expo-contacts';
import { ContactRound, Clock, User } from 'lucide-react-native';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import { useBeneficiaryStore } from '@/store/beneficiary.store';
import { normalizeNigerianPhone, isValidNigerianPhone } from '@/components/wallet/WalletFlow';
import { haptics } from '@/utils/haptics';

export type ContactsSheetSelection = {
  phone: string;
  /** May be undefined when coming from phone contacts */
  serviceID?: string;
  providerName?: string;
};

export type AirtimeContactsSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  selectedServiceID?: string;
  onSelect: (selection: ContactsSheetSelection) => void;
};

// Normalize a raw phone contact number to Nigerian E.164 (+234…) or return null
function normalizeContactPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().+]/g, '');
  if (cleaned.startsWith('234') && cleaned.length === 13) return `+${cleaned}`;
  if (cleaned.startsWith('0') && cleaned.length === 11) return `+234${cleaned.slice(1)}`;
  if (/^\d{10}$/.test(cleaned)) return `+234${cleaned}`;
  return null;
}

export const AirtimeContactsSheet = forwardRef<AirtimeContactsSheetRef, Props>(
  ({ selectedServiceID, onSelect }, ref) => {
    const palette = useAppPalette();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['55%', '90%'], []);

    const [contactsState, setContactsState] = useState<'idle' | 'loading' | 'loaded' | 'denied'>(
      'idle'
    );
    const [phoneContacts, setPhoneContacts] = useState<
      Array<{ id: string; name: string; phone: string }>
    >([]);
    const [query, setQuery] = useState('');

    const { beneficiaries } = useBeneficiaryStore();
    const recents = beneficiaries.filter((b) => b.type === 'AIRTIME');

    useImperativeHandle(ref, () => ({
      open: () => {
        sheetRef.current?.snapToIndex(0);
        if (contactsState === 'idle') void loadContacts();
      },
      close: () => sheetRef.current?.close(),
    }));

    const loadContacts = async () => {
      setContactsState('loading');
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setContactsState('denied');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const normalized: Array<{ id: string; name: string; phone: string }> = [];
      for (const contact of data) {
        if (!contact.phoneNumbers?.length) continue;
        for (const pn of contact.phoneNumbers) {
          if (!pn.number) continue;
          const phone = normalizeContactPhone(pn.number);
          if (!phone) continue;
          normalized.push({
            id: `${contact.id}-${pn.id ?? pn.number}`,
            name: contact.name ?? pn.number,
            phone,
          });
        }
      }

      setPhoneContacts(normalized);
      setContactsState('loaded');
    };

    const filteredContacts = useMemo(() => {
      if (!query) return phoneContacts;
      const q = query.toLowerCase();
      return phoneContacts.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }, [phoneContacts, query]);

    const handleSelect = useCallback(
      (selection: ContactsSheetSelection) => {
        void haptics.success();
        sheetRef.current?.close();
        onSelect(selection);
      },
      [onSelect]
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
      ),
      []
    );

    // Combine recents + phone contacts for the flat list
    type ListItem =
      | { kind: 'section'; label: string }
      | { kind: 'recent'; id: string; name: string; phone: string; serviceID: string; providerName: string }
      | { kind: 'contact'; id: string; name: string; phone: string }
      | { kind: 'empty'; message: string }
      | { kind: 'denied' }
      | { kind: 'loading' };

    const listData = useMemo<ListItem[]>(() => {
      const items: ListItem[] = [];

      if (recents.length > 0) {
        items.push({ kind: 'section', label: 'Recent' });
        for (const b of recents) {
          items.push({
            kind: 'recent',
            id: b.id,
            name: b.name,
            phone: b.phone || '',
            serviceID: b.serviceID || selectedServiceID || '',
            providerName: b.bankName || 'Network',
          });
        }
      }

      items.push({ kind: 'section', label: 'Phone contacts' });

      if (contactsState === 'loading') {
        items.push({ kind: 'loading' });
      } else if (contactsState === 'denied') {
        items.push({ kind: 'denied' });
      } else if (contactsState === 'loaded') {
        if (filteredContacts.length === 0) {
          items.push({ kind: 'empty', message: 'No contacts match your search.' });
        } else {
          for (const c of filteredContacts) {
            items.push({ kind: 'contact', ...c });
          }
        }
      } else {
        items.push({ kind: 'empty', message: 'Tap to load contacts.' });
      }

      return items;
    }, [recents, contactsState, filteredContacts, selectedServiceID]);

    const renderItem = ({ item }: { item: ListItem }) => {
      if (item.kind === 'section') {
        return (
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>{item.label}</Text>
        );
      }
      if (item.kind === 'loading') {
        return (
          <View style={styles.centeredRow}>
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.stateText, { color: palette.textSecondary }]}>
              Loading contacts…
            </Text>
          </View>
        );
      }
      if (item.kind === 'denied') {
        return (
          <View style={styles.centeredRow}>
            <Text style={[styles.stateText, { color: palette.error }]}>
              Contacts permission denied. Enable it in Settings.
            </Text>
          </View>
        );
      }
      if (item.kind === 'empty') {
        return (
          <Text style={[styles.stateText, { color: palette.textSecondary, textAlign: 'center', paddingVertical: 16 }]}>
            {item.message}
          </Text>
        );
      }
      if (item.kind === 'recent') {
        return (
          <Pressable
            onPress={() =>
              handleSelect({ phone: item.phone, serviceID: item.serviceID, providerName: item.providerName })
            }
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? palette.border : palette.card, borderColor: palette.border },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: 'rgba(10,132,255,0.12)' }]}>
              <Clock size={18} color={palette.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowName, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                {item.phone} · {item.providerName}
              </Text>
            </View>
          </Pressable>
        );
      }
      if (item.kind === 'contact') {
        return (
          <Pressable
            onPress={() => handleSelect({ phone: item.phone })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? palette.border : palette.card, borderColor: palette.border },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: 'rgba(48,209,88,0.12)' }]}>
              <User size={18} color={palette.success} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowName, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>{item.phone}</Text>
            </View>
          </Pressable>
        );
      }
      return null;
    };

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: palette.card }}
        handleIndicatorStyle={{ backgroundColor: palette.border }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(10,132,255,0.10)' }]}>
            <ContactRound size={18} color={palette.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Select recipient</Text>
            <Text style={[styles.headerSub, { color: palette.textSecondary }]}>
              Recent or from your contacts
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search name or number…"
            placeholderTextColor={palette.textSecondary}
            value={query}
            onChangeText={setQuery}
            keyboardType="default"
            returnKeyType="search"
          />
        </View>

        <BottomSheetFlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.kind === 'section' ? `section-${item.label}` : item.kind === 'loading' || item.kind === 'denied' || item.kind === 'empty' ? `state-${index}` : item.id
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      </BottomSheet>
    );
  }
);

AirtimeContactsSheet.displayName = 'AirtimeContactsSheet';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  headerSub: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  searchWrap: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
    gap: 8,
  },
  sectionLabel: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  rowMeta: {
    fontSize: Typography.xs,
  },
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
  },
  stateText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
  },
});
