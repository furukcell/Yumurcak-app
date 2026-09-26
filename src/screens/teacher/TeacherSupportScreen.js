// ============================================================
// YUMURCAK — TeacherSupportScreen.js
// Öğretmen destek/iletişim formu — Süper Admin'e istek/şikayet/görüş
// gönderme ekranı. ParentSupportScreen.js ile birebir aynı mantık ve
// aynı `destekMesajlari` node'unu kullanır; Süper Admin tarafı zaten
// role bakmaksızın bu node'un tamamını okuyor, ekstra bir değişiklik
// gerekmiyor.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { onValue, push, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getUserName } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

const TOPIC_KEYS = ['istek', 'sikayet', 'gorus', 'teknik', 'diger'];

const MAX_LEN = 5000;

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toList(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TeacherSupportScreen() {
  const { t } = useTranslation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
  const navigation = useNavigation();
  const { loading, kullanici, teacherId, kresId, kresAdi, currentClass } = useTeacherData();
  const TOPICS = useMemo(() => TOPIC_KEYS.map((key) => ({ key, label: t(`teacher.support.topics.${key}`) })), [t]);
  const [topic, setTopic] = useState('istek');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState('');
  const [messages, setMessages] = useState([]);
  const [successToast, setSuccessToast] = useState({ visible: false, message: '' });

  const teacherName = getUserName(kullanici);

  useEffect(() => {
    if (!teacherId) {
      setMessages([]);
      return undefined;
    }

    const unsubscribe = onValue(ref(database, 'destekMesajlari'), (snap) => {
      const list = toList(snap.val())
        .filter((item) => String(item.userId || '') === String(teacherId))
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      setMessages(list);
    }, () => setMessages([]));

    return () => unsubscribe();
  }, [teacherId]);

  const selectedTopicLabel = useMemo(() => TOPICS.find((item) => item.key === topic)?.label || t('teacher.support.topics.istek'), [TOPICS, topic, t]);

  if (loading) return <LoadingState text={t('teacher.support.loading')} />;

  const showSuccess = (text) => setSuccessToast({ visible: true, message: text });

  const sendMessage = async () => {
    const clean = message.trim();
    if (!clean) return Alert.alert(t('teacher.support.missingInfoTitle'), t('teacher.support.emptyMessageDesc'));
    if (clean.length > MAX_LEN) return Alert.alert(t('teacher.support.messageTooLongTitle'), t('teacher.support.messageTooLongDesc', { max: MAX_LEN }));
    if (!teacherId) return Alert.alert(t('teacher.support.errorTitle'), t('teacher.support.userInfoNotFoundDesc'));

    setSending(true);
    try {
      const now = Date.now();
      const newRef = push(ref(database, 'destekMesajlari'));
      await update(newRef, {
        id: newRef.key,
        konu: topic,
        konuBaslik: selectedTopicLabel,
        mesaj: clean,
        durum: 'yeni',
        kresId: kresId || kullanici?.kresId || '',
        kresAdi: kresAdi || '',
        userId: teacherId,
        userRole: kullanici?.rol || 'ogretmen',
        userName: teacherName || kullanici?.kullaniciAdi || t('teacher.support.teacherFallback'),
        userPhone: kullanici?.telefon || '',
        userUsername: kullanici?.kullaniciAdi || '',
        sinifId: currentClass?.id || '',
        sinifAdi: currentClass?.ad || '',
        createdAt: now,
        updatedAt: now,
      });

      setMessage('');
      setTopic('istek');
      showSuccess(t('teacher.support.sentSuccess'));
    } catch (error) {
      console.error(error);
      Alert.alert(t('teacher.support.errorTitle'), t('teacher.support.sendErrorDesc'));
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (item) => {
    const clean = String(replyText[item.id] || '').trim();
    if (!clean) return Alert.alert(t('teacher.support.missingInfoTitle'), t('teacher.support.emptyReplyDesc'));
    if (clean.length > MAX_LEN) return Alert.alert(t('teacher.support.replyTooLongTitle'), t('teacher.support.replyTooLongDesc', { max: MAX_LEN }));

    setReplyingId(item.id);
    try {
      const now = Date.now();
      const replyRef = push(ref(database, `destekMesajlari/${item.id}/yanitlar`));
      await update(ref(database), {
        [`destekMesajlari/${item.id}/yanitlar/${replyRef.key}`]: {
          id: replyRef.key,
          mesaj: clean,
          authorId: teacherId,
          authorName: teacherName || t('teacher.support.teacherFallback'),
          authorRole: kullanici?.rol || 'ogretmen',
          createdAt: now,
        },
        [`destekMesajlari/${item.id}/durum`]: 'yanitlandi',
        [`destekMesajlari/${item.id}/updatedAt`]: now,
      });
      setReplyText((prev) => ({ ...prev, [item.id]: '' }));
      showSuccess(t('teacher.support.replySentSuccess'));
    } catch (error) {
      console.error(error);
      Alert.alert(t('teacher.support.errorTitle'), t('teacher.support.replyErrorDesc'));
    } finally {
      setReplyingId('');
    }
  };

  const renderReplies = (item) => {
    const replies = toList(item.yanitlar).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    if (!replies.length) return null;
    return (
      <View style={styles.replyBox}>
        {replies.map((reply) => {
          const isAdmin = String(reply.authorRole || '').toLowerCase().includes('super');
          return (
            <View key={reply.id} style={[styles.replyItem, isAdmin && styles.adminReply]}>
              <Text style={styles.replyAuthor}>{isAdmin ? t('teacher.support.adminReplyName') : (reply.authorName || t('teacher.support.youFallback'))}</Text>
              <Text style={styles.replyText}>{reply.mesaj}</Text>
              <Text style={styles.replyDate}>{formatDate(reply.createdAt)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast.visible}
        message={successToast.message}
        onHide={() => setSuccessToast({ visible: false, message: '' })}
      />
      <View onLayout={onHeaderLayout}>
        <ScreenHeader navigation={navigation} title={t('teacher.support.title')} subtitle={t('teacher.support.subtitle')} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBanner}>
            <View style={styles.bannerIconBox}><Text style={styles.bannerIcon}>💬</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('teacher.support.bannerTitle')}</Text>
              <Text style={styles.bannerText}>{t('teacher.support.bannerText')}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>{t('teacher.support.topicLabel')}</Text>
            <View style={styles.topicWrap}>
              {TOPICS.map((item) => (
                <TouchableOpacity key={item.key} style={[styles.topicButton, topic === item.key && styles.topicButtonActive]} onPress={() => setTopic(item.key)} activeOpacity={0.85}>
                  <Text style={[styles.topicText, topic === item.key && styles.topicTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('teacher.support.messageLabel')}</Text>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={(text) => setMessage(text.slice(0, MAX_LEN))}
              placeholder={t('teacher.support.messagePlaceholder')}
              placeholderTextColor="#999"
              multiline
              maxLength={MAX_LEN}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{message.length}/{MAX_LEN}</Text>

            <TouchableOpacity style={[styles.saveButton, sending && styles.disabledAction]} onPress={sendMessage} disabled={sending} activeOpacity={0.85}>
              {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{t('teacher.support.sendButton')}</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t('teacher.support.recentTitle')}</Text>
          {messages.length === 0 ? (
            <EmptyState icon="📭" title={t('teacher.support.noMessagesTitle')} desc={t('teacher.support.noMessagesDesc')} />
          ) : (
            messages.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.typePill}>{item.konuBaslik || item.konu || t('teacher.support.messageFallback')}</Text>
                  <Text style={styles.statusBadge}>{item.durum || 'yeni'}</Text>
                </View>
                <Text style={styles.body}>{item.mesaj}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                {renderReplies(item)}

                <Text style={styles.formLabel}>{t('teacher.support.replyLabel')}</Text>
                <TextInput
                  style={styles.replyInput}
                  value={replyText[item.id] || ''}
                  onChangeText={(text) => setReplyText((prev) => ({ ...prev, [item.id]: text.slice(0, MAX_LEN) }))}
                  placeholder={t('teacher.support.replyPlaceholder')}
                  placeholderTextColor="#999"
                  multiline
                  maxLength={MAX_LEN}
                  textAlignVertical="top"
                />
                <TouchableOpacity style={[styles.replyButton, replyingId === item.id && styles.disabledAction]} disabled={replyingId === item.id} onPress={() => sendReply(item)} activeOpacity={0.85}>
                  <Text style={styles.replyButtonText}>{replyingId === item.id ? t('teacher.support.replyButtonSending') : t('teacher.support.replyButton')}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  infoBanner: { backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.border, borderRadius: 22, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  bannerIconBox: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bannerIcon: { fontSize: 28 },
  bannerTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  bannerText: { color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 18 },
  formCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  formLabel: { color: THEME.text, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.border },
  topicButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  topicText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  topicTextActive: { color: '#FFF' },
  textArea: { minHeight: 150, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 13, fontWeight: '700', color: THEME.text },
  counter: { color: THEME.muted, textAlign: 'right', marginTop: 6, fontWeight: '700', fontSize: 12 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  disabledAction: { opacity: 0.55 },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: THEME.card, borderRadius: 22, padding: 15, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typePill: { color: THEME.primary, backgroundColor: THEME.primarySoft, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
  statusBadge: { color: THEME.primary, backgroundColor: THEME.primarySoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11 },
  body: { color: THEME.text, fontWeight: '700', marginTop: 10, lineHeight: 19 },
  date: { color: THEME.muted, fontWeight: '700', marginTop: 8, fontSize: 12 },
  replyBox: { marginTop: 12, gap: 8 },
  replyItem: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: THEME.border },
  adminReply: { backgroundColor: THEME.primarySoft, borderColor: THEME.border },
  replyAuthor: { color: THEME.primary, fontWeight: '900', marginBottom: 4 },
  replyText: { color: THEME.text, fontWeight: '700', lineHeight: 18 },
  replyDate: { color: THEME.muted, fontWeight: '700', marginTop: 5, fontSize: 11 },
  replyInput: { minHeight: 86, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 12, fontWeight: '700', color: THEME.text },
  replyButton: { marginTop: 8, backgroundColor: THEME.primarySoft, borderRadius: 13, padding: 12, alignItems: 'center' },
  replyButtonText: { color: THEME.primary, fontWeight: '900' },
});
