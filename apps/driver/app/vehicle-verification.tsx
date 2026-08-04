import { useRouter } from 'expo-router';
import { ArrowLeft, Bike, Car, CheckCircle2, ChevronLeft, ShieldCheck, Send, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useDriverProfile, useSubmitVehicleVerification } from '@/hooks/useDriverProfile';
import { useAppPalette } from '@/lib/theme';
import { AppModal, useAppModal } from '@/components/ui/AppModal';

type VehicleType = 'BIKE' | 'TRICYCLE' | 'CAR';

const VEHICLE_OPTIONS: Array<{ type: VehicleType; label: string; sub: string; icon: React.ReactNode }> = [
  { type: 'BIKE', label: 'Motorcycle / Bike', sub: 'Fast agile delivery for light parcels', icon: <Bike size={24} color="#0A84FF" /> },
  { type: 'TRICYCLE', label: 'Tricycle / Keke', sub: 'Medium cargo & multi-stop deliveries', icon: <Send size={24} color="#FF9500" /> },
  { type: 'CAR', label: 'Car / Sedan', sub: 'Enclosed secure transport for all packages', icon: <Car size={24} color="#30D158" /> },
];

export default function VehicleVerificationScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const modal = useAppModal();
  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;

  const [vehicleType, setVehicleType] = useState<VehicleType>(profile?.vehicleType as VehicleType ?? 'BIKE');
  const [vehiclePlate, setVehiclePlate] = useState(profile?.vehiclePlate ?? '');
  const [vehicleModel, setVehicleModel] = useState(profile?.vehicleModel ?? '');
  const [licenseNumber, setLicenseNumber] = useState(profile?.licenseNumber ?? '');

  const submitMutation = useSubmitVehicleVerification();

  const status = profile?.vehicleStatus ?? 'PENDING';
  const isVerified = status === 'APPROVED';
  const isSubmitted = status === 'SUBMITTED';

  const handleSubmit = async () => {
    if (!vehiclePlate.trim() || !vehicleModel.trim()) {
      modal.alert('Missing details', 'Please enter your vehicle plate number and vehicle model/make.', 'warning');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        vehicleType,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim(),
      });

      modal.show({
        title: 'Vehicle Details Submitted',
        description: 'Your vehicle verification application has been submitted to the admin team for review.',
        type: 'success',
        primaryText: 'Back to Profile',
        onPrimaryPress: () => {
          modal.hide();
          router.replace('/(tabs)/profile');
        },
      });
    } catch (err) {
      modal.alert('Submission Error', err instanceof Error ? err.message : 'Could not submit vehicle verification.', 'error');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Vehicle Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Status Callout Banner */}
        {isVerified ? (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(48, 209, 88, 0.12)', borderColor: '#30D158' }]}>
            <CheckCircle2 size={24} color="#30D158" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#30D158' }]}>Vehicle Verified</Text>
              <Text style={[styles.statusSub, { color: palette.text }]}>Your vehicle is approved for active order dispatching.</Text>
            </View>
          </View>
        ) : isSubmitted ? (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(255, 149, 0, 0.12)', borderColor: '#FF9500' }]}>
            <ShieldAlert size={24} color="#FF9500" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#FF9500' }]}>Verification Under Review</Text>
              <Text style={[styles.statusSub, { color: palette.text }]}>Admin is reviewing your vehicle details.</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(10, 132, 255, 0.10)', borderColor: palette.primary }]}>
            <ShieldCheck size={24} color={palette.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: palette.primary }]}>Vehicle Registration</Text>
              <Text style={[styles.statusSub, { color: palette.text }]}>Register your delivery vehicle (Bike, Tricycle, or Car) to accept trips.</Text>
            </View>
          </View>
        )}

        {/* Vehicle Type Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Select Vehicle Type</Text>
          <View style={styles.optionsList}>
            {VEHICLE_OPTIONS.map((opt) => {
              const active = opt.type === vehicleType;
              return (
                <Pressable
                  key={opt.type}
                  onPress={() => setVehicleType(opt.type)}
                  style={[
                    styles.typeOptionCard,
                    {
                      backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.card,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <View style={styles.optionIconWrap}>{opt.icon}</View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.optionLabel, { color: palette.text }]}>{opt.label}</Text>
                    <Text style={[styles.optionSub, { color: palette.textSecondary }]}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radioDot, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primary : 'transparent' }]}>
                    {active ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Inputs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Vehicle & Driver Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>License Plate Number *</Text>
            <TextInput
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="e.g. LSD-491-AB"
              placeholderTextColor={palette.textSecondary}
              autoCapitalize="characters"
              style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Vehicle Make & Model *</Text>
            <TextInput
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="e.g. Honda Ace 125 or Toyota Corolla"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Driver's License Number (Optional)</Text>
            <TextInput
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="e.g. ABC12345678"
              placeholderTextColor={palette.textSecondary}
              autoCapitalize="characters"
              style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
            />
          </View>
        </View>

        {/* Submit Action */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: palette.primary, opacity: submitMutation.isPending ? 0.6 : pressed ? 0.9 : 1 },
          ]}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>{isVerified ? 'Update Vehicle Details' : 'Submit Vehicle Details'}</Text>
          )}
        </Pressable>
      </ScrollView>
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
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
  statusSub: { fontSize: Typography.xs, marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: Typography.xs, fontFamily: Typography.family.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  optionsList: { gap: 10 },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  optionIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  optionSub: { fontSize: Typography.xs },
  radioDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: Typography.sm,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitText: { color: '#FFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
