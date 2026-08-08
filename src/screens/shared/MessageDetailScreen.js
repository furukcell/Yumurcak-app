// ============================================================
// YUMURCAK — MessageDetailScreen.js
// FAZ 16: Son 20 mesaj + Daha fazla yükle + Okundu bildirimi
// FAZ 17: Konuşma index'i (kullaniciKonusmalari vb.) her mesajda güncelleniyor
// Firebase:
// mesajKonusmalari/{conversationId}
// mesajlar/{conversationId}/{messageId}
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  endBefore,
  get,
  increment,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as dbQuery,
  ref,
  update,
} from 'firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  formatMessageTime,
  getParticipantIds,
  isReadByOtherParticipant,
  mergeMessages,
  MESSAGE_PAGE_SIZE,
  normalizeConversationMeta,
} from '../../utils/messageHelpers';
import { createUserNotification } from '../../services/notificationCenter';
import { addConversationIndexUpdates } from '../../utils/firebaseIndexHelpers';

const THEME = {
  primary: '#6C3DEB',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  green: '#20B45B',
};

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { kullanici } = useAuth();
  const insets = useSafeAreaInsets();

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
  const isFirstLoadRef = useRef(true);

  const [liveMessages, setLiveMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [conversation, setConversation] = useState(conversationMeta || {});
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);

  const allMessages = useMemo(() => mergeMessages(olderMessages, liveMessages), [olderMessages, liveMessages]);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return undefined;
    }

    const conversationRef = ref(database, `mesajKonusmalari/${conversationId}`);
    const unsubConversation = onValue(conversationRef, (snapshot) => {
      setConversation(snapshot.val() || conversationMeta || {});
    });

    const messagesQuery = dbQuery(
      ref(database, `mesajlar/${conversationId}`),
      orderByChild('createdAt'),
      limitToLast(MESSAGE_PAGE_SIZE)
    );

    const unsubMessages = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : [];
      list.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

      setLiveMessages(list);
      setHasMore(list.length === MESSAGE_PAGE_SIZE);
      setLoading(false);

      // Sadece ilk yüklemede en alta kaydır.
      // (Eski mesajlar yüklenirken veya canlı güncellemelerde otomatik
      // en alta zıplamasın; kullanıcı yukarı bakarken ekran kaymasın.)
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        requestAnimationFrame(() => {
          setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 120);
        });
      }
    });

    return () => {
      unsubConversation();
      unsubMessages();
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const now = Date.now();
    update(ref(database, `mesajKonusmalari/${conversationId}`), {
      [`okunmamisSayac/${currentUserId}`]: 0,
      [`sonOkuma/${currentUserId}`]: now,
      [`lastSeenAt/${currentUserId}`]: now,
    }).catch(() => {});
  }, [conversationId, currentUserId]);

  const focusInput = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });
  };

  const loadOlderMessages = async () => {
    if (!conversationId || loadingMore || allMessages.length === 0) return;

    const oldest = allMessages[0];
    const oldestTime = Number(oldest?.createdAt || 0);

    if (!oldestTime) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);

    try {
      const olderQuery = dbQuery(
        ref(database, `mesajlar/${conversationId}`),
        orderByChild('createdAt'),
        endBefore(oldestTime),
        limitToLast(MESSAGE_PAGE_SIZE)
      );

      const snapshot = await get(olderQuery);
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : [];
      list.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

      if (list.length === 0) {
        setHasMore(false);
        return;
      }

      setOlderMessages((prev) => mergeMessages(list, prev));
      if (list.length < MESSAGE_PAGE_SIZE) setHasMore(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Eski mesajlar yüklenemedi.');
    } finally {
      setLoadingMore(false);
    }
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
      const mergedMeta = normalizeConversationMeta({ ...conversationMeta, ...conversation });
      const participants = getParticipantIds(mergedMeta).filter(Boolean);
      if (!participants.includes(currentUserId)) participants.push(currentUserId);

      await push(ref(database, `mesajlar/${conversationId}`), {
        gonderenId: currentUserId,
        gonderenRol: currentRole,
        metin: clean,
        createdAt: now,
        okunduBy: {
          [currentUserId]: now,
        },
      });

      // ÖNEMLİ: mergedMeta içindeki nested "okunmamisSayac" / "sonOkuma"
      // objelerini spread ETMİYORUZ. Aynı update() çağrısında hem nested
      // obje hem flat path ("okunmamisSayac/uid") birlikte gönderilirse
      // Firebase RTDB bu path çakışmasını reddedip update'i tamamen
      // başarısız sayabiliyor — mesaj (push) zaten gitmiş olsa da kullanıcı
      // "Mesaj gönderilemedi" hatası görüyordu. Çözüm: meta'dan o iki alanı
      // çıkarıp sadece flat path key'leri ile güncellemek.
      const { okunmamisSayac, sonOkuma, ...metaWithoutCounters } = mergedMeta;

      const updates = {
        ...metaWithoutCounters,
        id: conversationId,
        sonMesaj: clean,
        sonMesajAt: now,
        sonGonderenId: currentUserId,
        aktif: true,
        updatedAt: now,
        [`sonOkuma/${currentUserId}`]: now,
        [`okunmamisSayac/${currentUserId}`]: 0,
      };

      participants.forEach((participantId) => {
        if (!participantId || participantId === currentUserId) return;
        updates[`okunmamisSayac/${participantId}`] = increment(1);
      });

      // Kök seviyede index güncellemeleri (kullaniciKonusmalari, kresKonusmalari,
      // cocukKonusmalari, sinifKonusmalari) ayrı bir update() ile yazılıyor —
      // metaWithoutCounters'taki (increment gibi) özel değerlerle karışmasın diye.
      const rootUpdates = {};
      addConversationIndexUpdates(rootUpdates, conversationId, metaWithoutCounters);
      if (Object.keys(rootUpdates).length > 0) {
        await update(ref(database), rootUpdates);
      }

      await update(ref(database, `mesajKonusmalari/${conversationId}`), updates);

      const receiverIds = participants.filter(
        (participantId) => participantId && participantId !== currentUserId
      );

      if (receiverIds.length > 0) {
        const senderName = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Yumurcak Kreş';
        try {
          await createUserNotification({
            kresId: kullanici?.kresId || mergedMeta.kresId || '',
            userIds: receiverIds,
            baslik: `💬 ${senderName}`,
            mesaj: clean.length > 80 ? `${clean.slice(0, 80)}...` : clean,
            tip: 'mesaj',
            routeName: 'MessageDetail',
            routeParams: {
              conversationId,
              conversationMeta: mergedMeta,
              title,
              subtitle,
            },
            createdBy: currentUserId,
          });
        } catch (notificationError) {
          console.warn('Mesaj gönderildi ama bildirim oluşturulamadı:', notificationError);
        }
      }

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
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
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
                data={allMessages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                removeClippedSubviews={false}
                ListHeaderComponent={
                  hasMore ? (
                    <TouchableOpacity style={styles.loadMoreButton} onPress={loadOlderMessages} disabled={loadingMore} activeOpacity={0.85}>
                      {loadingMore ? (
                        <ActivityIndicator color={THEME.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>Daha fazla mesaj yükle</Text>
                      )}
                    </TouchableOpacity>
                  ) : allMessages.length > 0 ? (
                    <Text style={styles.noMoreText}>Konuşmanın başlangıcı</Text>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
                    <Text style={styles.emptyDesc}>İlk mesajı göndererek konuşmayı başlat.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const mine = item.gonderenId === currentUserId;
                  const read = isReadByOtherParticipant(item, conversation, currentUserId);

                  // Karşı taraftan gelen mesaj, benim son okuma zamanımdan
                  // sonra gönderilmişse "henüz okumadım" sayılır → kalın gösterilir.
                  const myLastSeenAt = Number(conversation?.sonOkuma?.[currentUserId] || 0);
                  const isUnreadByMe = !mine && Number(item.createdAt || 0) > myLastSeenAt;

                  return (
                    <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                        <Text
                          style={[
                            styles.messageText,
                            mine ? styles.messageTextMine : styles.messageTextOther,
                            isUnreadByMe && styles.messageTextUnread,
                          ]}
                        >
                          {item.metin}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={[styles.timeText, mine ? styles.timeTextMine : styles.timeTextOther]}>
                            {formatMessageTime(item.createdAt)}
                          </Text>
                          {mine ? (
                            <Text style={[styles.readText, read ? styles.readTextActive : styles.timeTextMine]}>
                              {read ? 'Okundu' : 'Gönderildi'}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}
        </View>

        <View style={[styles.inputOuter, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.inputTouchable} activeOpacity={1} onPress={focusInput}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: THEME.bg },
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
  backButton: { width: 72, flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 30, color: THEME.primary, fontWeight: '900', marginRight: 2 },
  backLabel: { fontSize: 14, color: THEME.primary, fontWeight: '800' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, color: THEME.primary, fontWeight: '900' },
  subtitle: { fontSize: 12, color: THEME.muted, fontWeight: '700', marginTop: 2 },
  headerRight: { width: 72 },
  messagesArea: { flex: 1, backgroundColor: THEME.bg },
  messageList: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  listContent: { padding: 14, paddingBottom: 18, flexGrow: 1 },
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  loadMoreText: { color: THEME.primary, fontWeight: '900' },
  noMoreText: { color: THEME.muted, fontWeight: '700', textAlign: 'center', marginBottom: 12, fontSize: 12 },
  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  emptyDesc: { color: THEME.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { backgroundColor: THEME.primary, borderTopRightRadius: 6 },
  bubbleOther: { backgroundColor: THEME.card, borderTopLeftRadius: 6, borderWidth: 1, borderColor: THEME.border },
  messageText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  messageTextMine: { color: '#FFF' },
  messageTextOther: { color: THEME.text },
  messageTextUnread: { fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4 },
  timeText: { fontSize: 10, fontWeight: '700' },
  timeTextMine: { color: 'rgba(255,255,255,0.72)' },
  timeTextOther: { color: THEME.muted },
  readText: { fontSize: 10, fontWeight: '900' },
  readTextActive: { color: '#BFFFD2' },
  inputOuter: { backgroundColor: THEME.card, borderTopWidth: 1, borderTopColor: THEME.border, zIndex: 50, elevation: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 12 : 10,
    backgroundColor: THEME.card,
  },
  inputTouchable: { flex: 1, minHeight: 44 },
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
  sendButtonDisabled: { opacity: 0.45 },
  sendText: { color: '#FFF', fontWeight: '900' },
});
