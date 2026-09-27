// ============================================================
// YUMURCAK — AdminSupportScreen.js
// Kurum yöneticisi ↔ Yumurcak Süper Admin destek sohbeti
// Web panel ve SuperAdmin tarafıyla aynı `destekMesajlari` node'unu kullanır.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { onValue, push, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  red: '#FF4D6D',
};

const TOPICS = ['istek', 'sorun', 'abonelik', 'hesap', 'diger'];

const MAX_LEN = 5000;

function toList(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([id, item]) => ({ id, ...(item || {}) }));
}

function isSuper(item) {
  return String(item?.authorRole || item?.senderRole || '').toLowerCase().includes('super');
}

function date(value, locale = 'tr-TR') {
  const d = new Date(Number(value));
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUserName(user) {
  return `${user?.ad || ''} ${user?.soyad || ''}`.trim() || user?.kullaniciAdi || 'Kurum Yöneticisi';
}

export default function AdminSupportScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { t, i18n } = useTranslation();
  const userId = kullanici?.uid || kullanici?.id || kullanici?.authUid || '';
  const kresId = kullanici?.kresId || '';

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [topic, setTopic] = useState('istek');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!kresId || !userId) {
      setTickets([]);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onValue(
      ref(database, 'destekMesajlari'),
      (snap) => {
        const rows = toList(snap.val())
          .filter((item) => String(item.kresId || '') === String(kresId))
          .filter((item) => String(item.userId || '') === String(userId) || item.senderRole === 'superadmin')
          .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
        setTickets(rows);
        setSelectedId((prev) => prev || rows[0]?.id || '');
        setLoading(false);
      },
      () => {
        setTickets([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kresId, userId]);

  const selected = useMemo(() => tickets.find((item) => item.id === selectedId) || null, [tickets, selectedId]);

  const replies = useMemo(
    () => (selected ? toList(selected.yanitlar).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)) : []),
    [selected]
  );

  const unreadCount = useMemo(() => {
    return tickets.filter((item) => {
      if (item.durum === 'kapandi') return false;
      const updated = Number(item.updatedAt || item.createdAt || 0);
      const readAt = Number(item.okunduBy?.[userId] || 0);
      const hasSuperReply = toList(item.yanitlar).some((r) => isSuper(r) && Number(r.createdAt || 0) > readAt);
      const directSuperMessage = item.senderRole === 'superadmin' && updated > readAt;
      return hasSuperReply || directSuperMessage;
    }).length;
  }, [tickets, userId]);

  const openTicket = async (item) => {
    setSelectedId(item.id);
    if (!userId) return;
    try {
      await update(ref(database, `destekMesajlari/${item.id}`), {
        [`okunduBy/${userId}`]: Date.now(),
      });
    } catch (error) {
      console.warn('Destek okundu bilgisi güncellenemedi:', error?.message || error);
    }
  };

  const sendReply = async () => {
    const clean = reply.trim();
    if (!selected || !clean) return;
    if (clean.length > MAX_LEN) {
      Alert.alert(t('admin.support.alertTitle'), t('admin.support.replyTooLong', { max: MAX_LEN }));
      return;
    }

    setSending(true);
    try {
      const now = Date.now();
      const replyRef = push(ref(database, `destekMesajlari/${selected.id}/yanitlar`));
      await update(ref(database), {
        [`destekMesajlari/${selected.id}/yanitlar/${replyRef.key}`]: {
          id: replyRef.key,
          mesaj: clean,
          authorId: userId,
          authorName: getUserName(kullanici),
          authorRole: 'yonetici',
          createdAt: now,
        },
        [`destekMesajlari/${selected.id}/durum`]: 'yanitlandi',
        [`destekMesajlari/${selected.id}/updatedAt`]: now,
        [`destekMesajlari/${selected.id}/okunduBy/${userId}`]: now,
      });
      setReply('');
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('admin.support.replyFailed'));
    } finally {
      setSending(false);
    }
  };

  const createTicket = async () => {
    const clean = message.trim();
    if (!clean) {
      Alert.alert(t('admin.support.missingInfo'), t('admin.support.messageRequired'));
      return;
    }
    if (!kresId || !userId) {
      Alert.alert(t('common.error'), t('admin.support.identityMissing'));
      return;
    }
    if (clean.length > MAX_LEN) {
      Alert.alert(t('admin.support.alertTitle'), t('admin.support.messageTooLong', { max: MAX_LEN }));
      return;
    }

    setCreating(true);
    try {
      const now = Date.now();
      const selectedLabel = t(`admin.support.topics.${topic}`);
      const newRef = push(ref(database, 'destekMesajlari'));
      await update(newRef, {
        id: newRef.key,
        konu: topic,
        konuBaslik: subject.trim() || selectedLabel,
        mesaj: clean,
        durum: 'yeni',
        kresId,
        kresAdi: kullanici?.kresAdi || '',
        userId,
        userRole: 'yonetici',
        userName: getUserName(kullanici),
        userPhone: kullanici?.telefon || '',
        userUsername: kullanici?.kullaniciAdi || '',
        createdAt: now,
        updatedAt: now,
      });
      setMessage('');
      setSubject('');
      setTopic('istek');
      setNewOpen(false);
      setSelectedId(newRef.key);
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('admin.support.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const closeTicket = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `destekMesajlari/${selected.id}`), {
        durum: 'kapandi',
        updatedAt: Date.now(),
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.support.closeFailed'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>{t('admin.support.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.()} activeOpacity={0.8}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>💬 {t('admin.support.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.support.subtitle')}</Text>
        </View>
        {unreadCount > 0 ? (
          <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>
        ) : null}
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>{tickets.length ? t('admin.support.ticketCount', { count: tickets.length }) : t('admin.support.noTickets')}</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => setNewOpen((v) => !v)} activeOpacity={0.85}>
          <Text style={styles.newButtonText}>＋ {t('admin.support.newTicket')}</Text>
        </TouchableOpacity>
      </View>

      {newOpen ? (
        <View style={styles.newCard}>
          <Text style={styles.sectionTitle}>{t('admin.support.newTicketTitle')}</Text>
          <View style={styles.topicWrap}>
            {TOPICS.map((item) => (
              <TouchableOpacity key={item} style={[styles.topicButton, topic === item && styles.topicButtonActive]} onPress={() => setTopic(item)} activeOpacity={0.85}>
                <Text style={[styles.topicText, topic === item && styles.topicTextActive]}>{t(`admin.support.topics.${item}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.subjectInput} value={subject} onChangeText={setSubject} placeholder="{t('admin.support.subjectPlaceholder')}" placeholderTextColor="#999" maxLength={120} />
          <TextInput style={styles.newInput} value={message} onChangeText={(text) => setMessage(text.slice(0, MAX_LEN))} placeholder="{t('admin.support.messagePlaceholder')}" placeholderTextColor="#999" multiline textAlignVertical="top" />
          <TouchableOpacity style={[styles.primaryButton, creating && styles.disabled]} onPress={createTicket} disabled={creating} activeOpacity={0.85}>
            {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{t('admin.support.send')}</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.ticketList}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {tickets.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>{t('admin.support.noTicketsTitle')}</Text>
                <Text style={styles.emptyText}>{t('admin.support.noTicketsDesc')}</Text>
              </View>
            ) : tickets.map((item) => {
              const readAt = Number(item.okunduBy?.[userId] || 0);
              const hasUnread = item.senderRole === 'superadmin' && Number(item.updatedAt || 0) > readAt || toList(item.yanitlar).some((r) => isSuper(r) && Number(r.createdAt || 0) > readAt);
              return (
                <TouchableOpacity key={item.id} style={[styles.ticket, item.id === selectedId && styles.ticketActive]} onPress={() => openTicket(item)} activeOpacity={0.85}>
                  <View style={styles.ticketIcon}><Text>💬</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.ticketTop}>
                      <Text style={[styles.ticketTitle, hasUnread && styles.ticketTitleUnread]} numberOfLines={1}>{item.konuBaslik || item.konu || t('admin.support.ticketFallback')}</Text>
                      {hasUnread ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.ticketMessage} numberOfLines={2}>{item.mesaj || t('admin.support.messageFallback')}</Text>
                    <Text style={styles.ticketDate}>{date(item.updatedAt || item.createdAt, i18n.language)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.chat}>
          {selected ? (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.chatHeader}>
                <View style={styles.chatAvatar}><Text style={{ fontSize: 20 }}>🛟</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatTitle}>{selected.konuBaslik || t('admin.support.chatFallback')}</Text>
                  <Text style={styles.chatSubtitle}>{t('admin.support.team')}</Text>
                </View>
                {selected.durum !== 'kapandi' ? <TouchableOpacity onPress={closeTicket} style={styles.closeButton}><Text style={styles.closeButtonText}>{t('admin.support.close')}</Text></TouchableOpacity> : <Text style={styles.closedText}>{t('admin.support.closed')}</Text>}
              </View>

              <ScrollView style={styles.messages} contentContainerStyle={{ padding: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                <View style={styles.messageRow}>
                  <View style={[styles.bubble, styles.userBubble]}>
                    <Text style={styles.senderName}>{t('admin.support.you')}</Text>
                    <Text style={styles.bubbleText}>{selected.mesaj}</Text>
                    <Text style={styles.bubbleDate}>{date(selected.createdAt, i18n.language)}</Text>
                  </View>
                </View>
                {replies.map((item) => {
                  const admin = isSuper(item);
                  return (
                    <View key={item.id} style={[styles.messageRow, admin ? styles.left : styles.right]}>
                      <View style={[styles.bubble, admin ? styles.adminBubble : styles.userBubble]}>
                        <Text style={styles.senderName}>{admin ? t('admin.support.team') : (item.authorName || t('admin.support.you'))}</Text>
                        <Text style={styles.bubbleText}>{item.mesaj}</Text>
                        <Text style={styles.bubbleDate}>{date(item.createdAt, i18n.language)}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {selected.durum !== 'kapandi' ? (
                <View style={styles.composer}>
                  <TextInput style={styles.replyInput} value={reply} onChangeText={(text) => setReply(text.slice(0, MAX_LEN))} placeholder="{t('admin.support.messagePlaceholder')}" placeholderTextColor="#999" multiline maxLength={MAX_LEN} />
                  <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={sendReply} disabled={sending} activeOpacity={0.85}>
                    {sending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.sendText}>➤</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.chatEmpty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>{t('admin.support.selectTicket')}</Text>
              <Text style={styles.emptyText}>{t('admin.support.selectTicketDesc')}</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: THEME.border, gap: 10 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, lineHeight: 30, color: THEME.primary, fontWeight: '900' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: THEME.text },
  headerSubtitle: { fontSize: 11, color: THEME.muted, fontWeight: '700', marginTop: 2 },
  headerBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: THEME.red, alignItems: 'center', justifyContent: 'center' },
  headerBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  toolbarText: { color: THEME.muted, fontWeight: '800', fontSize: 12 },
  newButton: { backgroundColor: THEME.primary, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  newButtonText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  newCard: { backgroundColor: '#FFF', marginHorizontal: 14, marginBottom: 10, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 14 },
  sectionTitle: { color: THEME.text, fontSize: 15, fontWeight: '900', marginBottom: 10 },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  topicButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 99, backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.border },
  topicButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  topicText: { color: THEME.primary, fontWeight: '900', fontSize: 11 },
  topicTextActive: { color: '#FFF' },
  subjectInput: { borderWidth: 1, borderColor: THEME.border, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: THEME.text, backgroundColor: '#FFF', marginBottom: 8 },
  newInput: { minHeight: 95, borderWidth: 1, borderColor: THEME.border, borderRadius: 13, padding: 12, color: THEME.text, backgroundColor: '#FFF' },
  primaryButton: { marginTop: 9, backgroundColor: THEME.primary, borderRadius: 13, padding: 13, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  body: { flex: 1, flexDirection: 'row', marginHorizontal: 14, marginBottom: 14, gap: 10 },
  ticketList: { width: '34%', minWidth: 125, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden' },
  ticket: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: THEME.border, gap: 9 },
  ticketActive: { backgroundColor: THEME.primarySoft },
  ticketIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ticketTitle: { flex: 1, color: THEME.text, fontWeight: '900', fontSize: 12 },
  ticketTitleUnread: { color: THEME.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.red },
  ticketMessage: { color: THEME.muted, fontWeight: '600', fontSize: 10.5, marginTop: 3 },
  ticketDate: { color: '#999', fontSize: 9.5, marginTop: 4 },
  chat: { flex: 1, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 11, borderBottomWidth: 1, borderBottomColor: THEME.border, gap: 9 },
  chatAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  chatTitle: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  chatSubtitle: { color: THEME.muted, fontWeight: '700', fontSize: 10, marginTop: 2 },
  closeButton: { borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  closeButtonText: { color: THEME.muted, fontWeight: '900', fontSize: 10 },
  closedText: { color: THEME.muted, fontWeight: '900', fontSize: 10 },
  messages: { flex: 1, backgroundColor: '#FCFBFF' },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 9 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', borderRadius: 16, padding: 10, borderWidth: 1 },
  userBubble: { backgroundColor: THEME.primarySoft, borderColor: '#DDD2FF' },
  adminBubble: { backgroundColor: '#FFF', borderColor: THEME.border },
  senderName: { color: THEME.primary, fontWeight: '900', fontSize: 10 },
  bubbleText: { color: THEME.text, fontWeight: '600', fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  bubbleDate: { color: THEME.muted, fontSize: 9, marginTop: 5, textAlign: 'right' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 9, gap: 7, borderTopWidth: 1, borderTopColor: THEME.border, backgroundColor: '#FFF' },
  replyInput: { flex: 1, minHeight: 42, maxHeight: 105, borderWidth: 1, borderColor: THEME.border, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, color: THEME.text, backgroundColor: '#FFF' },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  emptyCard: { padding: 20, alignItems: 'center' },
  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  emptyIcon: { fontSize: 34, marginBottom: 9 },
  emptyTitle: { color: THEME.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: THEME.muted, fontSize: 11, fontWeight: '600', lineHeight: 17, textAlign: 'center', marginTop: 5 },
});