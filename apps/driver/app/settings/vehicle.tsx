import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CheckCircle2, ShieldAlert, ShieldCheck, ChevronLeft, Bike, Car, Send } from 'lucide-react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { http } from '@/lib/api';
import { useDriverStore } from '@/store/driver.store';
import { useQueryClient } from '@tanstack/react-query';
import { useDriverProfile } from '@/hooks/useDriverProfile';

import { useSafeBack } from '@/components/navigation/useSafeBack';

type UploadKey = 'license' | 'selfie' | 'vehicle';

type UploadSlot = {
  key: UploadKey;
  label: string;
  helper: string;
  preferCamera?: boolean;
};

type UploadedDocument = {
  localUri: string;
  remoteUrl: string;
};

function filenameFor(uri: string, type: UploadKey) {
  const fallback = `${type}.jpg`;
  return uri.split('/').pop()?.split('?')[0] || fallback;
}

function mimeFor(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export default function VehicleSettingsScreen() {
  const modal = useAppModal();
  const back = useSafeBack('/(tabs)/settings');
  const queryClient = useQueryClient();
  const driver = useDriverStore((state) => state.driver);
  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;

  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE' | 'TRICYCLE'>(
    (profile?.vehicleType as 'CAR' | 'BIKE' | 'TRICYCLE') || 'BIKE'
  );
  const [vehiclePlate, setVehiclePlate] = useState(profile?.vehiclePlate || '');
  const [vehicleModel, setVehicleModel] = useState(profile?.vehicleModel || '');
  const [documents, setDocuments] = useState<Partial<Record<UploadKey, UploadedDocument>>>({});
  const [uploading, setUploading] = useState<UploadKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const status = profile?.vehicleStatus ?? 'PENDING';
  const isVerified = status === 'APPROVED';
  const isSubmitted = status === 'SUBMITTED';

  const activeSlots = useMemo(() => {
    if (vehicleType === 'CAR') {
      return [
        { key: 'license' as UploadKey, label: 'Driver License', helper: 'Capture the front side of your valid driver license.' },
        { key: 'selfie' as UploadKey, label: 'Driver Selfie', helper: 'Take a clear headshot photo.', preferCamera: true },
        { key: 'vehicle' as UploadKey, label: 'Car Photo & License Plate', helper: 'Capture the front view of your car clearly.' },
      ];
    }
    if (vehicleType === 'TRICYCLE') {
      return [
        { key: 'license' as UploadKey, label: 'Rider Permit / ID', helper: 'Capture your valid rider permit or national ID.' },
        { key: 'selfie' as UploadKey, label: 'Rider Selfie', helper: 'Take a clear headshot photo.', preferCamera: true },
        { key: 'vehicle' as UploadKey, label: 'Tricycle Photo', helper: 'Capture your tricycle clearly showing registration.' },
      ];
    }
    return [
      { key: 'license' as UploadKey, label: 'Rider Permit / ID', helper: 'Capture your rider permit or national ID.' },
      { key: 'selfie' as UploadKey, label: 'Rider Selfie', helper: 'Take a clear headshot photo.', preferCamera: true },
      { key: 'vehicle' as UploadKey, label: 'Dispatch Bike Photo', helper: 'Capture your motorbike clearly.' },
    ];
  }, [vehicleType]);

  const completed = useMemo(
    () => activeSlots.filter((slot) => Boolean(documents[slot.key]?.remoteUrl)).length,
    [documents, activeSlots],
  );

  const uploadDocument = async (slot: UploadSlot, asset: ImagePicker.ImagePickerAsset) => {
    const form = new FormData();
    form.append('type', slot.key);
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? filenameFor(asset.uri, slot.key),
      type: asset.mimeType ?? mimeFor(asset.uri),
    } as unknown as Blob);

    const response = await http.post<{ data: { secure_url: string; type: UploadKey } }>('/api/v1/driver/kyc/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setDocuments((current) => ({
      ...current,
      [slot.key]: {
        localUri: asset.uri,
        remoteUrl: response.data.data.secure_url,
      },
    }));
  };

  const pickDocument = async (slot: UploadSlot, source: 'camera' | 'library') => {
    try {
      setUploading(slot.key);
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        modal.alert('Permission required', source === 'camera' ? 'Allow camera access to capture this document.' : 'Allow photo access to select this document.', 'warning');
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });

      if (result.canceled || !result.assets[0]) return;
      await uploadDocument(slot, result.assets[0]);
    } catch (error) {
      modal.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    if (!vehiclePlate.trim() || !vehicleModel.trim()) {
      modal.alert('Vehicle details required', 'Please enter your vehicle plate number and vehicle model.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await http.post('/api/v1/driver/vehicle-verification', {
        vehicleType,
        vehiclePlate: vehiclePlate.trim(),
        vehicleModel: vehicleModel.trim(),
        licenseImageUrl: documents.license?.remoteUrl,
        selfieUrl: documents.selfie?.remoteUrl,
        vehicleImageUrl: documents.vehicle?.remoteUrl,
      });

      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });

      modal.show({
        title: 'Vehicle details submitted',
        description: 'Your vehicle details have been sent for Admin approval.',
        type: 'success',
        primaryText: 'OK',
        onPrimaryPress: () => {
          modal.hide();
          back();
        },
      });
    } catch (error) {
      modal.alert('Could not submit vehicle verification', error instanceof Error ? error.message : 'Please check every requirement and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <ChevronLeft size={18} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Vehicle Management</Text>
          <View style={{ width: 40 }} />
        </View>

        {isVerified ? (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(48, 209, 88, 0.12)', borderColor: '#30D158' }]}>
            <CheckCircle2 size={24} color="#30D158" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#30D158' }]}>Vehicle Verified</Text>
              <Text style={[styles.statusSub, { color: Colors.light.text }]}>Your vehicle is approved for dispatching.</Text>
            </View>
          </View>
        ) : isSubmitted ? (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(255, 149, 0, 0.12)', borderColor: '#FF9500' }]}>
            <ShieldAlert size={24} color="#FF9500" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#FF9500' }]}>Verification Under Review</Text>
              <Text style={[styles.statusSub, { color: Colors.light.text }]}>Admin is reviewing your vehicle details.</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(10, 132, 255, 0.10)', borderColor: Colors.light.primary }]}>
            <ShieldCheck size={24} color={Colors.light.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: Colors.light.primary }]}>Vehicle Registration</Text>
              <Text style={[styles.statusSub, { color: Colors.light.text }]}>Register your delivery vehicle.</Text>
            </View>
          </View>
        )}

        <Card>
          <SectionHeader title="Details & Documents" caption={`${completed}/${activeSlots.length} uploaded`} />

          <View style={styles.vehicleSegmentRow}>
            {([
              { type: 'BIKE' as const, label: 'Motorbike 🛵' },
              { type: 'TRICYCLE' as const, label: 'Tricycle 🛺' },
              { type: 'CAR' as const, label: 'Car 🚗' },
            ]).map((v) => {
              const active = vehicleType === v.type;
              return (
                <Pressable
                  key={v.type}
                  onPress={() => setVehicleType(v.type)}
                  style={[styles.vehicleSegmentBtn, active && styles.vehicleSegmentActive]}
                >
                  <Text style={[styles.vehicleSegmentText, active && styles.vehicleSegmentTextActive]}>
                    {v.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <InputField label="License Plate Number" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="e.g. ABC-123XY" />
          <InputField label="Vehicle Make & Model" value={vehicleModel} onChangeText={setVehicleModel} placeholder="e.g. Honda Ace 125 / Toyota Corolla" />

          {!isVerified && (
            <>
              <View style={styles.documentList}>
                {activeSlots.map((slot) => {
                  const item = documents[slot.key];
                  const busy = uploading === slot.key;
                  return (
                    <View key={slot.key} style={styles.documentCard}>
                      {item?.localUri ? (
                        <Image source={{ uri: item.localUri }} style={styles.preview} />
                      ) : (
                        <View style={styles.previewPlaceholder}>
                          <Text style={styles.previewPlaceholderText}>{slot.label[0]}</Text>
                        </View>
                      )}

                      <View style={styles.documentCopy}>
                        <Text style={styles.documentTitle}>{slot.label}</Text>
                        <Text style={styles.documentHelper}>{item ? 'Uploaded successfully.' : slot.helper}</Text>
                        <View style={styles.actionRow}>
                          <Pressable disabled={busy} onPress={() => void pickDocument(slot, 'camera')} style={[styles.smallButton, busy ? styles.disabled : null]}>
                            <Text style={styles.smallButtonText}>{busy ? 'Uploading...' : 'Camera'}</Text>
                          </Pressable>
                          <Pressable disabled={busy} onPress={() => void pickDocument(slot, 'library')} style={[styles.smallButtonSecondary, busy ? styles.disabled : null]}>
                            <Text style={styles.smallButtonSecondaryText}>Gallery</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <ActionButton title={submitting ? 'Submitting...' : 'Submit to Admin'} onPress={submit} disabled={submitting || uploading !== null} />
            </>
          )}
        </Card>
      </ScrollView>
      <AppModal config={modal.config} onClose={modal.hide} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
    color: Colors.light.text,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusSub: { fontSize: Typography.xs, marginTop: 2, fontFamily: Typography.family.regular },
  vehicleSegmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  vehicleSegmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleSegmentActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  vehicleSegmentText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
    color: Colors.light.textSecondary,
  },
  vehicleSegmentTextActive: {
    color: Colors.light.primary,
  },
  documentList: { gap: 12, marginTop: 10, marginBottom: 10 },
  documentCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: 'row',
    gap: 12,
  },
  preview: { width: 76, height: 76, borderRadius: 14, backgroundColor: Colors.light.border },
  previewPlaceholder: { width: 76, height: 76, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.bg },
  previewPlaceholderText: { color: Colors.light.textSecondary, fontSize: Typography.xl, fontFamily: Typography.family.bold },
  documentCopy: { flex: 1, gap: 6 },
  documentTitle: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.bold, fontFamily: Typography.family.bold },
  documentHelper: { color: Colors.light.textSecondary, fontSize: Typography.xs, lineHeight: 17, fontFamily: Typography.family.regular },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.light.primary },
  smallButtonText: { color: '#fff', fontSize: Typography.xs, fontFamily: Typography.family.bold },
  smallButtonSecondary: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.light.bg, borderWidth: 1, borderColor: Colors.light.border },
  smallButtonSecondaryText: { color: Colors.light.text, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  disabled: { opacity: 0.6 },
});
