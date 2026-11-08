import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { 
  MessageSquare, 
  Send, 
  X, 
  Cpu, 
  FileText, 
  ShieldCheck, 
  Save,
  Download
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { useMobileCollabStore } from '../../stores/collabStore';
import { useMobileAuthStore } from '../../stores/authStore';
import { CollabChatMessage } from '../../types/collab';

export const MobileLiveChatSheet: React.FC = () => {
  const { 
    isChatOpen, 
    toggleChat, 
    chatMessages, 
    sendChatMessage, 
    sessionCode 
  } = useMobileCollabStore();

  const authUser = useMobileAuthStore((s) => s.user);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isChatOpen && chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isChatOpen, chatMessages.length]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendChatMessage(inputText);
    setInputText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    sendChatMessage(prompt);
  };

  const renderMessageItem = ({ item }: { item: CollabChatMessage }) => {
    const isMe = !item.isAi && (
      (authUser && item.senderId === authUser.userId) ||
      item.senderName === 'Tú'
    );
    const isAi = item.isAi || item.senderId === '00000000-0000-0000-0000-000000000000';
    const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isAi) {
      return (
        <View style={styles.aiMsgRow}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadgeIcon}>
              <Cpu size={12} color={THEME.colors.accentPrimaryLight} />
            </View>
            <Text style={styles.aiSenderName}>Asistente @ai</Text>
            <View style={styles.aiProviderTag}>
              <Text style={styles.aiProviderText}>
                {item.providerUsed || 'CASE Co-Dev'}
              </Text>
            </View>
            <Text style={styles.msgTime}>{timeStr}</Text>
          </View>
          <View style={styles.aiMsgBubble}>
            <Text style={styles.aiMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMe ? styles.myMsgRow : styles.otherMsgRow]}>
        <View style={styles.senderHeader}>
          <Text
            style={[
              styles.senderName,
              { color: item.senderColor || THEME.colors.textSecondary },
            ]}
          >
            {isMe ? 'Tú' : item.senderName}
          </Text>
          <Text style={styles.msgTime}>{timeStr}</Text>
        </View>
        <View style={[styles.msgBubble, isMe ? styles.myMsgBubble : styles.otherMsgBubble]}>
          <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isChatOpen}
      animationType="slide"
      transparent
      onRequestClose={toggleChat}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconWrapper}>
                <MessageSquare size={16} color={THEME.colors.accentPrimaryLight} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  Chat en Vivo • {sessionCode || 'Sala'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Colaboración táctil y asistencia @ai
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleChat} style={styles.closeBtn}>
              <X size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageSquare size={32} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>Sin mensajes aún en la sala</Text>
                <Text style={styles.emptySubtitle}>
                  Escribe un mensaje o menciona @ai para asistencia técnica.
                </Text>
              </View>
            }
          />

          {/* Quick Prompts Bar */}
          <View style={styles.quickPromptsRow}>
            <TouchableOpacity
              onPress={() => handleQuickPrompt('@ai resumen')}
              style={styles.quickPromptBtn}
              activeOpacity={0.7}
            >
              <FileText size={12} color={THEME.colors.accentPrimaryLight} />
              <Text style={styles.quickPromptText}>Resumen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickPrompt('@ai auditar')}
              style={styles.quickPromptBtn}
              activeOpacity={0.7}
            >
              <ShieldCheck size={12} color={THEME.colors.accentPrimaryLight} />
              <Text style={styles.quickPromptText}>Auditar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickPrompt('@ai guardar el proyecto')}
              style={styles.quickPromptBtn}
              activeOpacity={0.7}
            >
              <Save size={12} color={THEME.colors.accentSuccess} />
              <Text style={styles.quickPromptText}>Guardar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickPrompt('@ai exportar')}
              style={styles.quickPromptBtn}
              activeOpacity={0.7}
            >
              <Download size={12} color="#38BDF8" />
              <Text style={styles.quickPromptText}>Exportar</Text>
            </TouchableOpacity>
          </View>

          {/* Input Area */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escribe o menciona @ai..."
              placeholderTextColor={THEME.colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={[
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
              ]}
              activeOpacity={0.8}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '75%',
    backgroundColor: THEME.colors.bgSurface,
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bgDark,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  headerIconWrapper: {
    padding: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.accentPrimary + '20',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  listContent: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  msgRow: {
    marginVertical: 2,
    maxWidth: '85%',
  },
  myMsgRow: {
    alignSelf: 'flex-end',
  },
  otherMsgRow: {
    alignSelf: 'flex-start',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 10,
    fontWeight: '700',
  },
  msgTime: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  msgBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  myMsgBubble: {
    backgroundColor: THEME.colors.accentPrimary,
    borderBottomRightRadius: 2,
  },
  otherMsgBubble: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 17,
  },
  myMsgText: {
    color: '#FFFFFF',
  },
  otherMsgText: {
    color: THEME.colors.textPrimary,
  },
  aiMsgRow: {
    alignSelf: 'flex-start',
    width: '100%',
    marginVertical: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiBadgeIcon: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: THEME.colors.accentPrimary + '30',
  },
  aiSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accentPrimaryLight,
  },
  aiProviderTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: THEME.colors.accentPrimary + '20',
  },
  aiProviderText: {
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
    color: THEME.colors.accentPrimaryLight,
  },
  aiMsgBubble: {
    backgroundColor: '#161a26',
    borderWidth: 1,
    borderColor: THEME.colors.accentPrimary + '40',
    borderRadius: THEME.borderRadius.md,
    borderTopLeftRadius: 2,
    padding: 10,
  },
  aiMsgText: {
    fontSize: 12,
    lineHeight: 18,
    color: THEME.colors.textPrimary,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bgDark,
  },
  quickPromptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.bgSurface,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 28 : 8,
    gap: 8,
    backgroundColor: THEME.colors.bgDark,
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: THEME.colors.bgSurface,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    fontSize: 12,
    color: THEME.colors.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
