import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

import { ActionButton, Card, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { http } from '@/lib/api';
import { useDriverStore } from '@/store/driver.store';

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

const slots: UploadSlot[] = [
  { key: 'license', label: 'License photo', helper: 'Capture or select the front side of your driver license.' },
  { key: 'selfie', label: 'Selfie', helper: 'Take a clear face photo from the camera.', preferCamera: true },
  { key: 'vehicle', label: 'Vehicle photo', helper: 'Capture the delivery vehicle clearly.' },
];

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

export default function KycDocumentsScreen() {
  const modal = useAppModal();
  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE' | 'TRICYCLE'>('BIKE');
  const [documents, setDocuments] = useState<Partial<Record<UploadKey, UploadedDocument>>>({});
  const [uploading, setUploading] = useState<UploadKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const driver = useDriverStore((state) => state.driver);
  const setDriver = useDriverStore((state) => state.setDriver);

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
        { key: 'vehicle' as UploadKey, label: 'Tricycle Photo', helper: 'Capture your tricycle clearly showing the registration number.' },
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
    setSubmitting(true);
    try {
      await http.post('/api/v1/driver/kyc/submit', { vehicleType });
      if (driver) {
        setDriver({ ...driver, status: 'KYC_SUBMITTED' });
      }
      modal.show({
        title: 'KYC submitted',
        description: 'Your documents are now under review. We will notify you after approval.',
        type: 'success',
        primaryText: 'OK',
        onPrimaryPress: () => {
          modal.hide();
          router.replace('/(kyc)');
        },
      });
    } catch (error) {
      modal.alert('Could not submit KYC', error instanceof Error ? error.message : 'Please check every requirement and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionHeader title="Document upload" caption={`${completed}/${activeSlots.length} uploaded`} />
        <Text style={styles.copy}>Select your vehicle category and upload the required photos.</Text>

        {/* Vehicle Segment Picker */}
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

        <ActionButton title={submitting ? 'Submitting...' : 'Submit KYC'} onPress={submit} disabled={submitting || uploading !== null || completed < activeSlots.length} />
        <ActionButton title="Back to overview" variant="ghost" onPress={() => router.replace('/(kyc)')} />
      </Card>
      <AppModal config={modal.config} onClose={modal.hide} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 21, fontFamily: Typography.family.regular },
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
  documentList: { gap: 12 },
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
