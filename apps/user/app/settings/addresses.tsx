import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, MapPin, Plus, Trash2, Home, Briefcase, Building2, Tag } from 'lucide-react-native';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import { useCreateSavedAddress, useDeleteSavedAddress, useSavedAddresses, type SavedAddress } from '@/hooks/useSavedAddresses';

function getLabelIcon(label: string, color: string) {
  const l = label.toLowerCase();
  if (l.includes('home')) return <Home size={18} color={color} />;
  if (l.includes('work') || l.includes('office')) return <Briefcase size={18} color={color} />;
  if (l.includes('shop') || l.includes('store') || l.includes('warehouse')) return <Building2 size={18} color={color} />;
  return <Tag size={18} color={color} />;
}

export default function SavedAddressesScreen() {
  const back = useSafeBack('/(tabs)/profile');
  const palette = useAppPalette();
  const addressesQuery = useSavedAddresses();
  const createMutation = useCreateSavedAddress();
  const deleteMutation = useDeleteSavedAddress();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  const [label, setLabel] = useState('Home');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<string | undefined>();
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!formattedAddress || lat === null || lng === null) {
      setErrorMsg('Please select an address location.');
      return;
    }
    if (!label.trim()) {
      setErrorMsg('Please enter a label for this address (e.g. Home, Office).');
      return;
    }
    try {
      setErrorMsg('');
      await createMutation.mutateAsync({
        label: label.trim(),
        formattedAddress,
        lat,
        lng,
        placeId,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      setAddModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save address');
    }
  };

  const resetForm = () => {
    setLabel('Home');
    setFormattedAddress('');
    setLat(null);
    setLng(null);
    setPlaceId(undefined);
    setContactName('');
    setContactPhone('');
    setErrorMsg('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => back()} style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Saved Addresses</Text>
        <Pressable onPress={() => setAddModalOpen(true)} style={[styles.addBtn, { backgroundColor: palette.primary }]}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {addressesQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : (addressesQuery.data ?? []).length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <MapPin size={36} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No saved addresses</Text>
            <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
              Save your frequent pickup and delivery locations for 1-tap booking.
            </Text>
            <Pressable onPress={() => setAddModalOpen(true)} style={[styles.emptyAddBtn, { backgroundColor: palette.primary }]}>
              <Text style={styles.emptyAddBtnText}>Add Address</Text>
            </Pressable>
          </View>
        ) : (
          (addressesQuery.data ?? []).map((item) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={[styles.itemIcon, { backgroundColor: `${palette.primary}1A` }]}>
                {getLabelIcon(item.label, palette.primary)}
              </View>
              <View style={styles.itemCopy}>
                <Text style={[styles.itemLabel, { color: palette.text }]}>{item.label}</Text>
                <Text style={[styles.itemAddress, { color: palette.textSecondary }]} numberOfLines={2}>
                  {item.formattedAddress}
                </Text>
                {item.contactName || item.contactPhone ? (
                  <Text style={[styles.itemContact, { color: palette.textSecondary }]}>
                    Contact: {item.contactName ?? ''} {item.contactPhone ? `(${item.contactPhone})` : ''}
                  </Text>
                ) : null}
              </View>
              <Pressable
                disabled={deleteMutation.isPending}
                onPress={() => handleDelete(item.id)}
                style={styles.deleteBtn}
              >
                <Trash2 size={18} color={palette.error} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={addModalOpen} transparent animationType="slide" onRequestClose={() => setAddModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Add Saved Address</Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.labelChips}>
              {['Home', 'Office', 'Shop', 'Warehouse'].map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setLabel(preset)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: label === preset ? palette.primary : palette.bg,
                      borderColor: label === preset ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: label === preset ? '#FFFFFF' : palette.text }]}>
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={formattedAddress}
              onChangeText={(txt) => {
                setFormattedAddress(txt);
                if (lat === null) {
                  setLat(6.5244);
                  setLng(3.3792);
                }
              }}
              placeholder="Full Address (e.g., 14 Zoo Road, Kano)"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />

            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Contact Name (Optional)"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />

            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="Contact Phone (Optional)"
              keyboardType="phone-pad"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => { setAddModalOpen(false); resetForm(); }} style={[styles.actionBtn, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <Text style={[styles.actionBtnText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable disabled={createMutation.isPending} onPress={handleSave} style={[styles.actionBtn, { backgroundColor: palette.primary }]}>
                <Text style={styles.actionPrimaryText}>{createMutation.isPending ? 'Saving…' : 'Save Address'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  content: { padding: Spacing.lg, gap: Spacing.md },
  center: { paddingVertical: Spacing.xxxl, alignItems: 'center' },
  emptyCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: { minHeight: 46, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  emptyAddBtnText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
  itemCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, gap: 2 },
  itemLabel: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  itemAddress: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 18 },
  itemContact: { fontSize: Typography.xs, fontFamily: Typography.family.medium, marginTop: 2 },
  deleteBtn: { padding: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  errorText: { color: '#EF4444', fontSize: Typography.xs, fontFamily: Typography.family.medium },
  labelChips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  addressInputBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md, borderRadius: 16, borderWidth: 1, minHeight: 52 },
  addressInputBtnText: { fontSize: Typography.sm, fontFamily: Typography.family.medium, flex: 1 },
  input: { minHeight: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: Typography.sm, fontFamily: Typography.family.medium },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  actionBtn: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  actionPrimaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
