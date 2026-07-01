import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

export type AppModalConfig = {
  visible: boolean;
  title: string;
  description: string;
  type: 'info' | 'error' | 'success' | 'warning';
  primaryText: string;
  onPrimaryPress: () => void;
  secondaryText?: string;
  onSecondaryPress?: () => void;
};

const EMPTY: AppModalConfig = {
  visible: false,
  title: '',
  description: '',
  type: 'info',
  primaryText: 'OK',
  onPrimaryPress: () => {},
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAppModal() {
  const [config, setConfig] = useState<AppModalConfig>(EMPTY);

  const show = (opts: Omit<AppModalConfig, 'visible'>) =>
    setConfig({ ...opts, visible: true });

  const hide = () => setConfig((prev) => ({ ...prev, visible: false }));

  /** Convenience: show a simple one-button info/success/error prompt */
  const alert = (title: string, description: string, type: AppModalConfig['type'] = 'info') =>
    show({ title, description, type, primaryText: 'OK', onPrimaryPress: hide });

  return { config, setConfig, show, hide, alert };
}

// ─── Component ───────────────────────────────────────────────────────────────
type Props = {
  config: AppModalConfig;
  onClose: () => void;
};

export function AppModal({ config, onClose }: Props) {
  const palette = useAppPalette();

  const iconBg =
    config.type === 'error'   ? `${palette.error}1A` :
    config.type === 'success' ? `${palette.success}1A` :
    config.type === 'warning' ? `${palette.warning}1A` :
    `${palette.primary}1A`;

  const primaryBg =
    config.type === 'error'   ? palette.error :
    config.type === 'warning' ? palette.error :
    palette.primary;

  return (
    <Modal
      transparent
      visible={config.visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            {config.type === 'error'   && <XCircle      size={20} color={palette.error}   />}
            {config.type === 'success' && <CheckCircle2 size={20} color={palette.success} />}
            {config.type === 'warning' && <AlertTriangle size={20} color={palette.warning} />}
            {config.type === 'info'    && <Info          size={20} color={palette.primary} />}
          </View>

          <Text style={[styles.title, { color: palette.text }]}>{config.title}</Text>
          <Text style={[styles.body,  { color: palette.textSecondary }]}>{config.description}</Text>

          <View style={styles.actions}>
            {config.secondaryText ? (
              <Pressable
                onPress={config.onSecondaryPress ?? onClose}
                style={[styles.secondary, { backgroundColor: palette.bg, borderColor: palette.border }]}
              >
                <Text style={[styles.secondaryText, { color: palette.text }]}>{config.secondaryText}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={config.onPrimaryPress} style={[styles.primary, { backgroundColor: primaryBg }]}>
              <Text style={styles.primaryText}>{config.primaryText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet:         { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: 12 },
  iconWrap:      { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  body:          { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  actions:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  secondary:     { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  primary:       { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText:   { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
