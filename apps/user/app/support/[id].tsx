import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useSupportTicketDetails, useSendSupportMessage } from '@/hooks/useSupport';
import { useAppPalette } from '@/lib/theme';
import { useAuthStore } from '@/store/auth.store';

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const back = useSafeBack('/support');
  const palette = useAppPalette();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;

  const { data: ticket, isLoading } = useSupportTicketDetails(id);
  const sendMessage = useSendSupportMessage(id || '');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setSelectedImage(uri);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || sendMessage.isPending) return;
    const text = inputText.trim();
    const image = selectedImage;
    setInputText('');
    setSelectedImage(null);
    try {
      await sendMessage.mutateAsync({ text, imageUrl: image || undefined });
    } catch {
      setInputText(text);
      setSelectedImage(image);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', bg: 'rgba(255, 149, 0, 0.12)', text: '#FF9500' };
      case 'UNDER_REVIEW':
        return { label: 'In Review', bg: 'rgba(10, 132, 255, 0.12)', text: '#0A84FF' };
      case 'RESOLVED':
        return { label: 'Resolved', bg: 'rgba(48, 209, 88, 0.12)', text: '#30D158' };
      case 'CLOSED':
        return { label: 'Closed', bg: palette.border, text: palette.textSecondary };
      default:
        return { label: status ?? 'OPEN', bg: palette.border, text: palette.textSecondary };
    }
  };

  const badge = getStatusBadge(ticket?.status);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Support Ticket</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !ticket ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <>
          <View style={[styles.ticketHeader, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.topMeta}>
              <Text style={[styles.ticketNum, { color: palette.textSecondary }]}>{ticket.ticketNumber}</Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>
            <Text style={[styles.subject, { color: palette.text }]}>{ticket.subject}</Text>
            {ticket.imageUrl ? (
              <Image source={{ uri: ticket.imageUrl }} style={styles.attachedImagePreview} resizeMode="cover" />
            ) : null}
            {ticket.resolutionNote ? (
              <View style={[styles.resolutionBox, { backgroundColor: 'rgba(48,209,88,0.08)', borderColor: '#30D158' }]}>
                <Text style={[styles.resolutionTitle, { color: '#30D158' }]}>Resolution Note</Text>
                <Text style={[styles.resolutionText, { color: palette.text }]}>{ticket.resolutionNote}</Text>
              </View>
            ) : null}
          </View>

          {/* Chat Messages */}
          <ScrollView contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
            {ticket.messages.map((m) => {
              const isAdmin = m.senderRole === 'ADMIN' || m.senderRole === 'SYSTEM' || m.senderRole === 'SUPPORT';
              const isMe = !isAdmin && (m.senderId === currentUserId || m.senderRole === 'USER' || m.senderId === ticket.userId);

              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageBubble,
                    isMe
                      ? [styles.myBubble, { backgroundColor: palette.primary }]
                      : isAdmin
                      ? [styles.adminBubble, { backgroundColor: palette.card, borderColor: palette.border }]
                      : [styles.otherBubble, { backgroundColor: palette.card, borderColor: palette.border }],
                  ]}
                >
                  <Text style={[styles.senderName, { color: isMe ? 'rgba(255,255,255,0.85)' : palette.textSecondary }]}>
                    {isAdmin ? '🛡️ Percel Support' : isMe ? 'You' : m.senderName}
                  </Text>
                  {m.imageUrl ? (
                    <Image source={{ uri: m.imageUrl }} style={styles.chatImage} resizeMode="cover" />
                  ) : null}
                  {m.text ? (
                    <Text style={[styles.messageText, { color: isMe ? '#FFF' : palette.text }]}>{m.text}</Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {/* Image Attachment Bar */}
          {selectedImage ? (
            <View style={[styles.attachmentPreviewBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Image source={{ uri: selectedImage }} style={styles.thumbImage} />
              <Text style={[styles.thumbText, { color: palette.text }]}>Screenshot attached</Text>
              <Pressable onPress={() => setSelectedImage(null)} style={styles.removeThumb}>
                <X size={16} color={palette.textSecondary} />
              </Pressable>
            </View>
          ) : null}

          {/* Message Input */}
          <View style={[styles.inputBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Pressable onPress={pickImage} style={[styles.attachButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <ImageIcon size={18} color={palette.primary} />
            </Pressable>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Reply to support..."
              placeholderTextColor={palette.textSecondary}
              style={[styles.chatInput, { color: palette.text }]}
            />
            <Pressable
              onPress={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || sendMessage.isPending}
              style={[styles.sendButton, { backgroundColor: palette.primary, opacity: (!inputText.trim() && !selectedImage) ? 0.4 : 1 }]}
            >
              {sendMessage.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={16} color="#FFF" />}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ticketHeader: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  topMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNum: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeText: { fontSize: 11, fontFamily: Typography.family.bold },
  subject: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  resolutionBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4, gap: 2 },
  resolutionTitle: { fontSize: 11, fontFamily: Typography.family.bold },
  resolutionText: { fontSize: Typography.xs },
  messagesContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 10,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  myBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  senderName: { fontSize: 11, fontFamily: Typography.family.bold },
  messageText: { fontSize: Typography.sm, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    gap: 10,
  },
  attachedImagePreview: { width: '100%', height: 140, borderRadius: 10, marginTop: 4 },
  chatImage: { width: 180, height: 140, borderRadius: 12, marginTop: 4 },
  attachmentPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  thumbImage: { width: 36, height: 36, borderRadius: 6 },
  thumbText: { flex: 1, fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  removeThumb: { padding: 4 },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: { flex: 1, minHeight: 44, fontSize: Typography.sm },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
