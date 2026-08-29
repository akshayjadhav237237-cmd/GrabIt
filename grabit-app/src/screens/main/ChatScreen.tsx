import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import { TouchableScale } from '../../components/TouchableScale';
import { subscribeToMessages, sendMessage, ChatMessage } from '../../services/chat';
import { ChevronIcon, CheckIcon } from '../../components/icons';
import { EmptyChatIllustration } from '../../components/illustrations';

const formatTimestamp = (dateStr?: string | Date): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const { bookingId, otherPartyName, productTitle } = route.params || {};

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(bookingId));

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!bookingId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToMessages(bookingId, (newMessages) => {
      setMessages(newMessages);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !bookingId || isSending) return;

    setInputText('');
    setIsSending(true);

    try {
      const res = await sendMessage(bookingId, trimmed);
      if (res.success && res.data) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => (m._id && m._id === res.data?._id) || (m.id && m.id === res.data?.id)
          );
          return exists ? prev : [...prev, res.data!];
        });
      } else {
        // Fallback optimistic message for offline / dev mock testing
        const fallbackMsg: ChatMessage = {
          _id: `msg_${Date.now()}`,
          bookingId,
          senderId: user?.id || 'me',
          senderName: user?.displayName || user?.name || 'You',
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch (err: any) {
      Alert.alert('Message Error', err?.message || 'Could not send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Bookings');
    }
  };

  const otherInitial = (otherPartyName?.charAt(0) || 'P').toUpperCase();

  const renderMessageBubble = ({ item }: { item: ChatMessage }) => {
    const isUser = Boolean(
      user &&
        (item.senderId === user.id ||
          item.senderId === user.uid ||
          (user.email && item.senderId === user.email) ||
          item.senderId === 'me')
    );

    const displayName = isUser
      ? 'You'
      : item.senderName || otherPartyName || 'Participant';

    return (
      <View
        style={[
          styles.messageBubbleContainer,
          isUser ? styles.userBubbleContainer : styles.otherBubbleContainer,
        ]}
      >
        <Text
          style={[
            styles.senderDisplayName,
            isUser ? styles.userSenderDisplayName : styles.otherSenderDisplayName,
          ]}
        >
          {displayName}
        </Text>

        <View
          style={[
            styles.speechBubble,
            isUser ? styles.userSpeechBubble : styles.otherSpeechBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>

          <View style={styles.timestampRow}>
            <Text
              style={[
                styles.messageTimestamp,
                isUser ? styles.userTimestamp : styles.otherTimestamp,
              ]}
            >
              {formatTimestamp(item.createdAt)}
            </Text>
            {isUser && (
              <CheckIcon size={12} color={theme.colors.surfaceSubtle} strokeWidth={2.5} style={styles.deliveryCheck} />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyMessages = () => {
    if (isLoading) return null;

    if (!bookingId) {
      return (
        <View style={styles.emptyContainer}>
          <EmptyChatIllustration size={180} />
          <Text style={styles.emptyTitle}>No Booking Selected</Text>
          <Text style={styles.emptySubtitle}>
            Select a rental booking from your bookings tab to start direct messaging with the owner or renter.
          </Text>
          <TouchableScale
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Bookings')}
          >
            <Text style={styles.emptyButtonText}>View My Bookings</Text>
          </TouchableScale>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyChatIllustration size={180} />
        <Text style={styles.emptyTitle}>Start the Conversation</Text>
        <Text style={styles.emptySubtitle}>
          Send a greeting to coordinate pickup location, dropoff times, or ask questions!
        </Text>
      </View>
    );
  };

  const canSend = Boolean(inputText.trim().length > 0 && !isSending && bookingId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableScale
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <ChevronIcon direction="left" size={20} color={theme.colors.textPrimary} strokeWidth={2.5} />
          </TouchableScale>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{otherInitial}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherPartyName || 'Chat Discussion'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {productTitle || 'Grabit Rental'}
            </Text>
          </View>

          <View style={styles.headerActionSpacer} />
        </View>

        {/* Message Thread */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id || item.id || `msg-${index}`}
            renderItem={renderMessageBubble}
            ListEmptyComponent={renderEmptyMessages}
            contentContainerStyle={styles.messagesListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Bottom Message Input Bar */}
        {Boolean(bookingId) && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              multiline
              maxLength={1000}
            />
            <TouchableScale
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!canSend}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <ChevronIcon direction="up" size={20} color={theme.colors.surface} strokeWidth={2.5} />
              )}
            </TouchableScale>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: theme.borderWidth.regular,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarInitial: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  headerActionSpacer: {
    width: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  messagesListContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  messageBubbleContainer: {
    marginBottom: theme.spacing.md,
    maxWidth: '82%',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherBubbleContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderDisplayName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    marginBottom: 3,
  },
  userSenderDisplayName: {
    color: theme.colors.primaryDark,
    marginRight: theme.spacing.xs,
  },
  otherSenderDisplayName: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  speechBubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderWidth: theme.borderWidth.thin,
    ...theme.shadows.sm,
  },
  userSpeechBubble: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.xs,
  },
  otherSpeechBubble: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.xs,
  },
  messageText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm + 2,
  },
  userMessageText: {
    color: theme.colors.textInverse,
  },
  otherMessageText: {
    color: theme.colors.textPrimary,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageTimestamp: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.regular,
  },
  userTimestamp: {
    color: theme.colors.surfaceSubtle,
  },
  otherTimestamp: {
    color: theme.colors.textMuted,
  },
  deliveryCheck: {
    marginLeft: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.border,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  sendButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    ...theme.borderRadius.buttonAsymmetric,
    ...theme.shadows.sm,
  },
  emptyButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
});

export default ChatScreen;
