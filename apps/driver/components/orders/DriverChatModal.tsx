import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Send, User, X } from 'lucide-react-native';
import { http } from '@/lib/api';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { emitDriverStopTyping, emitDriverTyping, joinDriverOrderChat, leaveDriverOrderChat, subscribeToDriverOrderChat, subscribeToDriverStopTyping, subscribeToDriverTyping } from '@/lib/socket';

export type ChatMessage = {
  id: string;
  orderId: string;
  senderId: string;
  senderType: 'USER' | 'DRIVER';
  senderName?: string;
  senderAvatarUrl?: string | null;
  text: string;
  createdAt: string;
};

type Props = {
  visible: boolean;
  orderId: string;
  customerName?: string;
  customerAvatarUrl?: string | null;
  isOnline?: boolean;
  onClose: () => void;
};

function getInitials(name?: string | null) {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DriverChatModal({ visible, orderId, customerName = 'Customer', customerAvatarUrl, isOnline = true, onClose }: Props) {
  const palette = useAppPalette();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !orderId) return;

    let mounted = true;
    setLoading(true);

    joinDriverOrderChat(orderId);

    http.get<{ data: ChatMessage[] }>(`/api/v1/orders/${orderId}/messages`)
      .then((res) => {
        if (mounted) {
          setMessages(res.data.data ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const unsubMsg = subscribeToDriverOrderChat(orderId, (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setIsCustomerTyping(false);
    });

    const unsubTyping = subscribeToDriverTyping(orderId, (payload: any) => {
      if (payload.senderType !== 'DRIVER') {
        setIsCustomerTyping(true);
      }
    });

    const unsubStopTyping = subscribeToDriverStopTyping(orderId, (payload: any) => {
      if (payload.senderType !== 'DRIVER') {
        setIsCustomerTyping(false);
      }
    });

    return () => {
      mounted = false;
      leaveDriverOrderChat(orderId);
      unsubMsg();
      unsubTyping();
      unsubStopTyping();
    };
  }, [visible, orderId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isCustomerTyping]);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (!orderId) return;

    emitDriverTyping(orderId, 'DRIVER');
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitDriverStopTyping(orderId, 'DRIVER');
    }, 2000);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    emitDriverStopTyping(orderId, 'DRIVER');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      orderId,
      senderId: 'me',
      senderType: 'DRIVER',
      text,
      createdAt: new Date().toISOString(),
    };

    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await http.post<{ data: ChatMessage }>(`/api/v1/orders/${orderId}/messages`, { text });
      const newMsg = (res.data as any)?.data ?? (res.data as unknown as ChatMessage);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)));
    } catch (err) {
      console.error('Driver send message error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <View style={styles.headerTitleRow}>
              {customerAvatarUrl ? (
                <Image source={{ uri: customerAvatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPill, { backgroundColor: `${palette.primary}20` }]}>
                  <Text style={[styles.avatarText, { color: palette.primary }]}>{getInitials(customerName)}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.title, { color: palette.text }]}>{customerName}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: isOnline ? '#30D158' : '#8E8E93' }]} />
                  <Text style={[styles.sub, { color: palette.textSecondary }]}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: palette.bg }]}>
              <X size={18} color={palette.text} />
            </Pressable>
          </View>

          {/* Messages */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator color={palette.primary} size="large" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isMe = item.senderType === 'DRIVER';
                return (
                  <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                    {!isMe && (
                      item.senderAvatarUrl ? (
                        <Image source={{ uri: item.senderAvatarUrl }} style={styles.msgAvatarImg} />
                      ) : (
                        <View style={[styles.msgAvatarPill, { backgroundColor: `${palette.primary}20` }]}>
                          <Text style={[styles.msgAvatarText, { color: palette.primary }]}>{getInitials(customerName)}</Text>
                        </View>
                      )
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? { backgroundColor: palette.primary, borderBottomRightRadius: 4 }
                          : { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                      ]}
                    >
                      <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : palette.text }]}>{item.text}</Text>
                      <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.7)' : palette.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                    No messages yet. Send a message to the customer!
                  </Text>
                </View>
              }
            />
          )}

          {/* Typing Indicator Bar */}
          {isCustomerTyping && (
            <View style={[styles.typingBar, { backgroundColor: palette.bg }]}>
              <Text style={[styles.typingText, { color: palette.primary }]}>{customerName} is typing...</Text>
            </View>
          )}

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: palette.border, backgroundColor: palette.card }]}>
            <TextInput
              value={input}
              onChangeText={handleInputChange}
              placeholder="Type message to customer..."
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, backgroundColor: palette.bg, borderColor: palette.border }]}
              onSubmitEditing={handleSend}
            />
            <Pressable
              disabled={!input.trim() || sending}
              onPress={handleSend}
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? palette.primary : `${palette.primary}40` },
              ]}
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { height: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarPill: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  title: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sub: { fontSize: 11, fontFamily: Typography.family.medium },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, gap: 10 },
  emptyWrap: { paddingVertical: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAvatarImg: { width: 28, height: 28, borderRadius: 14, marginBottom: 2 },
  msgAvatarPill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  msgAvatarText: { fontSize: 10, fontFamily: Typography.family.bold },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: 4 },
  msgText: { fontSize: Typography.sm, fontFamily: Typography.family.medium, lineHeight: 20 },
  msgTime: { fontSize: 10, fontFamily: Typography.family.regular, alignSelf: 'flex-end' },
  typingBar: { paddingHorizontal: Spacing.lg, paddingVertical: 6 },
  typingText: { fontSize: 12, fontFamily: Typography.family.medium, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 46, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, fontSize: Typography.sm, fontFamily: Typography.family.medium },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
