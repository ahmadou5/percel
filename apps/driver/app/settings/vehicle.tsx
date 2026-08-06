import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import {
  BadgeCheck,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
} from 'lucide-react-native';

import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { InputField } from '@/components/DriverPrimitives';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { http } from '@/lib/api';
import { hexToRgba, isLight, useAppPalette } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';
import { useQueryClient } from '@tanstack/react-query';

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

const VEHICLE_OPTIONS = [
  { type: 'BIKE' as const, label: 'Motorbike', subtitle: 'Fast urban deliveries', Icon: Bike },
  { type: 'TRICYCLE' as const, label: 'Tricycle', subtitle: 'Medium cargo & parcels', Icon: Truck },
  { type: 'CAR' as const, label: 'Car / Van', subtitle: 'Large freight & items', Icon: Car },
];

export default function VehicleSettingsScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const back = useSafeBack('/(tabs)/settings');
  const queryClient = useQueryClient();
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
  const dark = !isLight(palette.bg);

  const activeSlots = useMemo(() => {
    if (vehicleType === 'CAR') {
      return [
        { key: 'license' as UploadKey, label: 'Driver License', helper: 'Capture the front side of your valid driver license.' },
        { key: 'selfie' as UploadKey, label: 'Driver Selfie', helper: 'Take a clear, well-lit headshot photo.', preferCamera: true },
        { key: 'vehicle' as UploadKey, label: 'Car Photo & License Plate', helper: 'Capture the front view of your vehicle clearly.' },
      ];
    }
    if (vehicleType === 'TRICYCLE') {
      return [
        { key: 'license' as UploadKey, label: 'Rider Permit / ID', helper: 'Capture your valid rider permit or national ID.' },
        { key: 'selfie' as UploadKey, label: 'Rider Selfie', helper: 'Take a clear, well-lit headshot photo.', preferCamera: true },
        { key: 'vehicle' as UploadKey, label: 'Tricycle Photo', helper: 'Capture your tricycle clearly showing registration.' },
      ];
    }
    return [
      { key: 'license' as UploadKey, label: 'Rider Permit / ID', helper: 'Capture your rider permit or national ID.' },
      { key: 'selfie' as UploadKey, label: 'Rider Selfie', helper: 'Take a clear, well-lit headshot photo.', preferCamera: true },
      { key: 'vehicle' as UploadKey, label: 'Dispatch Bike Photo', helper: 'Capture your motorbike clearly.' },
    ];
  }, [vehicleType]);

  const completedCount = useMemo(
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
        modal.alert(
          'Permission required',
          source === 'camera' ? 'Allow camera access to capture this document.' : 'Allow photo access to select this document.',
          'warning'
        );
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
      modal.alert('Vehicle details required', 'Please enter your vehicle license plate number and model.', 'warning');
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
        description: 'Your vehicle information and verification documents have been submitted for review.',
        type: 'success',
        primaryText: 'Done',
        onPrimaryPress: () => {
          modal.hide();
          back();
        },
      });
    } catch (error) {
      modal.alert('Submission failed', error instanceof Error ? error.message : 'Please check every requirement and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round((completedCount / activeSlots.length) * 100);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header navigation bar */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
            ]}
          >
            <ChevronLeft size={20} color={palette.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Vehicle & Fleet</Text>
            <Text style={[styles.headerSub, { color: palette.textSecondary }]}>Verification & Fleet Info</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* Verification Status Banner Card */}
        {isVerified ? (
          <View style={[styles.statusCard, { backgroundColor: hexToRgba('#30D158', 0.12), borderColor: hexToRgba('#30D158', 0.3) }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: hexToRgba('#30D158', 0.2) }]}>
              <CheckCircle2 size={24} color="#30D158" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.rowInline}>
                <Text style={[styles.statusTitle, { color: '#30D158' }]}>Vehicle Verified</Text>
                <View style={[styles.badge, { backgroundColor: hexToRgba('#30D158', 0.2) }]}>
                  <Text style={[styles.badgeText, { color: '#30D158' }]}>ACTIVE</Text>
                </View>
              </View>
              <Text style={[styles.statusBody, { color: palette.text }]}>Your vehicle details are approved and ready for dispatching.</Text>
            </View>
          </View>
        ) : isSubmitted ? (
          <View style={[styles.statusCard, { backgroundColor: hexToRgba('#FF9500', 0.12), borderColor: hexToRgba('#FF9500', 0.3) }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: hexToRgba('#FF9500', 0.2) }]}>
              <ShieldAlert size={24} color="#FF9500" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.rowInline}>
                <Text style={[styles.statusTitle, { color: '#FF9500' }]}>Under Admin Review</Text>
                <View style={[styles.badge, { backgroundColor: hexToRgba('#FF9500', 0.2) }]}>
                  <Text style={[styles.badgeText, { color: '#FF9500' }]}>PENDING</Text>
                </View>
              </View>
              <Text style={[styles.statusBody, { color: palette.text }]}>Our team is reviewing your uploaded vehicle documentation.</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: hexToRgba(palette.primary, 0.1), borderColor: hexToRgba(palette.primary, 0.25) }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: hexToRgba(palette.primary, 0.18) }]}>
              <ShieldCheck size={24} color={palette.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.statusTitle, { color: palette.primary }]}>Vehicle Registration Required</Text>
              <Text style={[styles.statusBody, { color: palette.text }]}>Complete your vehicle details and documents to unlock dispatch jobs.</Text>
            </View>
          </View>
        )}

        {/* Section 1: Vehicle Category Selection */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
              <Sparkles size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>Vehicle Category</Text>
              <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>Select your primary delivery vehicle type</Text>
            </View>
          </View>

          <View style={styles.categoryGrid}>
            {VEHICLE_OPTIONS.map((item) => {
              const active = vehicleType === item.type;
              const IconComp = item.Icon;
              return (
                <Pressable
                  key={item.type}
                  onPress={() => setVehicleType(item.type)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    {
                      backgroundColor: active ? hexToRgba(palette.primary, 0.12) : palette.bg,
                      borderColor: active ? palette.primary : palette.border,
                      borderWidth: active ? 2 : 1,
                    },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.categoryTop}>
                    <View style={[styles.catIconWrap, { backgroundColor: active ? palette.primary : hexToRgba(palette.text, 0.08) }]}>
                      <IconComp size={20} color={active ? '#fff' : palette.textSecondary} />
                    </View>
                    {active && <BadgeCheck size={18} color={palette.primary} />}
                  </View>
                  <Text style={[styles.catLabel, { color: active ? palette.primary : palette.text }]}>{item.label}</Text>
                  <Text style={[styles.catSub, { color: palette.textSecondary }]}>{item.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 2: Vehicle Information Inputs */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
              <FileText size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>Vehicle Details</Text>
              <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>Provide registration & plate information</Text>
            </View>
          </View>

          <View style={{ gap: 16 }}>
            <InputField
              label="License Plate Number"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="e.g. KAN-123-AB"
            />
            <InputField
              label="Vehicle Make & Model"
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="e.g. Honda Ace 125 / Toyota Corolla"
            />
          </View>
        </View>

        {/* Section 3: Verification Documents & Photo Uploads */}
        {!isVerified && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.sectionIconBox, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <UploadCloud size={18} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>Required Documents</Text>
                <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
                  {completedCount} of {activeSlots.length} documents uploaded ({progressPercent}%)
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: palette.bg }]}>
              <View style={[styles.progressBar, { backgroundColor: palette.primary, width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.documentList}>
              {activeSlots.map((slot) => {
                const item = documents[slot.key];
                const busy = uploading === slot.key;
                const isDone = Boolean(item?.remoteUrl);

                return (
                  <View
                    key={slot.key}
                    style={[
                      styles.docCard,
                      {
                        backgroundColor: palette.bg,
                        borderColor: isDone ? hexToRgba('#30D158', 0.4) : palette.border,
                      },
                    ]}
                  >
                    {item?.localUri ? (
                      <View style={styles.previewContainer}>
                        <Image source={{ uri: item.localUri }} style={styles.previewImage} />
                        <View style={[styles.previewBadge, { backgroundColor: '#30D158' }]}>
                          <CheckCircle2 size={12} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.previewPlaceholder, { backgroundColor: hexToRgba(palette.primary, 0.08) }]}>
                        <ImageIcon size={26} color={palette.primary} />
                      </View>
                    )}

                    <View style={styles.docInfo}>
                      <View style={styles.rowInline}>
                        <Text style={[styles.docLabel, { color: palette.text }]}>{slot.label}</Text>
                        {isDone && (
                          <View style={[styles.doneTag, { backgroundColor: hexToRgba('#30D158', 0.15) }]}>
                            <Text style={styles.doneTagText}>Uploaded</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.docHelper, { color: palette.textSecondary }]}>
                        {isDone ? 'Document captured & ready.' : slot.helper}
                      </Text>

                      <View style={styles.actionRow}>
                        <Pressable
                          disabled={busy}
                          onPress={() => void pickDocument(slot, 'camera')}
                          style={({ pressed }) => [
                            styles.uploadBtn,
                            { backgroundColor: palette.primary },
                            busy && { opacity: 0.6 },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Camera size={13} color="#fff" />
                              <Text style={styles.uploadBtnText}>Camera</Text>
                            </>
                          )}
                        </Pressable>

                        <Pressable
                          disabled={busy}
                          onPress={() => void pickDocument(slot, 'library')}
                          style={({ pressed }) => [
                            styles.uploadBtnSecondary,
                            { backgroundColor: palette.card, borderColor: palette.border },
                            busy && { opacity: 0.6 },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <ImageIcon size={13} color={palette.text} />
                          <Text style={[styles.uploadBtnSecondaryText, { color: palette.text }]}>Gallery</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() => void submit()}
              disabled={submitting || uploading !== null}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: palette.primary },
                (submitting || uploading !== null) && { opacity: 0.6 },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Vehicle Verification</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  headerSub: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.medium,
    marginTop: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  statusIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  statusBody: {
    fontSize: Typography.xs,
    lineHeight: 18,
    fontFamily: Typography.family.medium,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.6,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  cardSubtitle: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    marginTop: 1,
  },
  categoryGrid: {
    gap: 10,
  },
  categoryCard: {
    borderRadius: 18,
    padding: Spacing.md,
    gap: 4,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  catSub: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  documentList: {
    gap: 12,
  },
  docCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  previewContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  previewBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  previewPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
    gap: 4,
  },
  docLabel: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  doneTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doneTagText: {
    color: '#30D158',
    fontSize: 10,
    fontFamily: Typography.family.bold,
  },
  docHelper: {
    fontSize: Typography.xs,
    lineHeight: 16,
    fontFamily: Typography.family.regular,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  uploadBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadBtnSecondaryText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 18,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});

