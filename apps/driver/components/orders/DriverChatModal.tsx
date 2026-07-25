import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Send, User, X } from 'lucide-react-native';
import { http } from '@/lib/api';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { subscribeToDriverOrderChat } from '@/lib/socket';

export type ChatMessage = {
  id: string;
  orderId: string;
  senderId: string;
  senderType: 'USER' | 'DRIVER';
  text: string;
  createdAt: string;
};

type Props = {
  visible: boolean;
  orderId: string;
  customerName?: string;
  onClose: () => void;
};

export function DriverChatModal({ visible, orderId, customerName = 'Customer', onClose }: Props) {
  const palette = useAppPalette();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible || !orderId) return;

    let mounted = true;
    setLoading(true);

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

    const unsubscribe = subscribeToDriverOrderChat(orderId, (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [visible, orderId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    try {
      const res = await http.post<{ data: ChatMessage }>(`/api/v1/orders/${orderId}/messages`, { text });
      const newMsg = res.data.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch {
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
              <View style={[styles.avatar, { backgroundColor: `${palette.primary}20` }]}>
                <User size={18} color={palette.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: palette.text }]}>{customerName}</Text>
                <Text style={[styles.sub, { color: palette.textSecondary }]}>Customer Chat</Text>
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

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: palette.border, backgroundColor: palette.card }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
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
  avatar: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sub: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, gap: 10 },
  emptyWrap: { paddingVertical: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center' },
  msgRow: { flexDirection: 'row', marginBottom: 6 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: 4 },
  msgText: { fontSize: Typography.sm, fontFamily: Typography.family.medium, lineHeight: 20 },
  msgTime: { fontSize: 10, fontFamily: Typography.family.regular, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 46, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, fontSize: Typography.sm, fontFamily: Typography.family.medium },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
