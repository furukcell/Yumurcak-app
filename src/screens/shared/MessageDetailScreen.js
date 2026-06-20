// ============================================================
// YUMURCAK — MessageDetailScreen.js
// FAZ 12: Mesaj yazma alanı tıklanmıyor / klavye açılmıyor fix
// Firebase:
// mesajKonusmalari/{konusmaId}
// mesajlar/{konusmaId}/{mesajId}
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { onValue, push, ref, update } from 'firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  red: '#FF4D6D',
};

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { kullanici } = useAuth();

  const currentUserId = kullanici?.uid || kullanici?.id;
  const currentRole = kullanici?.rol || 'kullanici';

  const {
    conversationId,
    conversationMeta = {},
    title = 'Mesajlar',
    subtitle = '',
  } = route.params || {};

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return undefined;
    }

    const messagesRef = ref(database, `mesajlar/${conversationId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : [];
      list.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

      setMessages(list);
      setLoading(false);

      requestAnimationFrame(() => {
        setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 120);
      });
    });

    return () => unsubscribe();
  }, [conversationId]);

  const focusInput = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });
  };

  const sendMessage = async () => {
    const clean = text.trim();

    if (!clean || sending) return;

    if (!conversationId || !currentUserId) {
      Alert.alert('Hata', 'Konuşma bilgisi bulunamadı.');
      return;
    }

    setSending(true);
    setText('');

    try {
      const now = Date.now();

      await push(ref(database, `mesajlar/${conversationId}`), {
        gonderenId: currentUserId,
        gonderenRol: currentRole,
        metin: clean,
        createdAt: now,
        okundu: false,
      });

      await update(ref(database, `mesajKonusmalari/${conversationId}`), {
        ...conversationMeta,
        id: conversationId,
        sonMesaj: clean,
        sonMesajAt: now,
        sonGonderenId: currentUserId,
        aktif: true,
        updatedAt: now,
      });

      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
      setText(clean);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Geri</Text>
          </TouchableOpacity>

          <View style={styles.titleWrap} pointerEvents="none">
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>

          <View style={styles.headerRight} />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.messagesArea}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={THEME.primary} />
                <Text style={styles.loadingText}>Mesajlar hazırlanıyor...</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                style={styles.messageList}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
                onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
                ListEmptyComponent={
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
                    <Text style={styles.emptyDesc}>İlk mesajı göndererek konuşmayı başlat.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const mine = item.gonderenId === currentUserId;

                  return (
                    <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                        <Text style={[styles.messageText, mine ? styles.messageTextMine : styles.messageTextOther]}>
                          {item.metin}
                        </Text>
                        <Text style={[styles.timeText, mine ? styles.timeTextMine : styles.timeTextOther]}>
                          {formatTime(item.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.inputOuter} pointerEvents="box-none">
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.inputTouchable}
              activeOpacity={1}
              onPress={focusInput}
            >
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Mesaj yaz..."
                placeholderTextColor="#999"
                multiline
                editable={!sending}
                pointerEvents="auto"
                textAlignVertical="top"
                blurOnSubmit={false}
                underlineColorAndroid="transparent"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendText}>Gönder</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    zIndex: 10,
    elevation: 2,
  },
  backButton: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 30,
    color: THEME.primary,
    fontWeight: '900',
    marginRight: 2,
  },
  backLabel: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '800',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    color: THEME.primary,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRight: {
    width: 72,
  },
  messagesArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  messageList: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: '700',
  },
  listContent: {
    padding: 14,
    paddingBottom: 18,
    flexGrow: 1,
  },
  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.text,
  },
  emptyDesc: {
    color: THEME.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: THEME.primary,
    borderTopRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  messageTextMine: {
    color: '#FFF',
  },
  messageTextOther: {
    color: THEME.text,
  },
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '700',
  },
  timeTextMine: {
    color: 'rgba(255,255,255,0.72)',
  },
  timeTextOther: {
    color: THEME.muted,
  },
  inputOuter: {
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    zIndex: 50,
    elevation: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 12 : 10,
    backgroundColor: THEME.card,
  },
  inputTouchable: {
    flex: 1,
    minHeight: 44,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    backgroundColor: THEME.bg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 10,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    fontWeight: '600',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendText: {
    color: '#FFF',
    fontWeight: '900',
  },
});
