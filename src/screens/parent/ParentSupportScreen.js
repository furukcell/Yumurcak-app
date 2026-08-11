import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onValue, push, ref, update } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { database } from '../../config/firebase';
import { ScreenShell, styles, useParentBase, LoadingScreen, EmptyState, THEME } from './parentShared';
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

function formatDate(value, locale) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ParentSupportScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const TOPICS = TOPIC_KEYS.map((key) => ({ key, label: t(`parent.support.topics.${key}`) }));
  const { loading, kullanici, parentId, parentName, kresId, kresAdi, selectedChild, childName } = useParentBase();
  const [topic, setTopic] = useState('istek');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState('');
  const [messages, setMessages] = useState([]);
  const [successToast, setSuccessToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    if (!parentId) {
      setMessages([]);
      return undefined;
    }

    const unsubscribe = onValue(ref(database, 'destekMesajlari'), (snap) => {
      const list = toList(snap.val())
        .filter((item) => String(item.userId || '') === String(parentId))
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      setMessages(list);
    }, () => setMessages([]));

    return () => unsubscribe();
  }, [parentId]);

  const selectedTopicLabel = useMemo(() => TOPICS.find((item) => item.key === topic)?.label || t('parent.support.topics.istek'), [topic, TOPICS, t]);

  if (loading) return <LoadingScreen text={t('parent.support.loading')} />;

  const showSuccess = (text) => setSuccessToast({ visible: true, message: text });

  const sendMessage = async () => {
    const clean = message.trim();
    if (!clean) return Alert.alert(t('parent.support.missingInfoTitle'), t('parent.support.emptyMessageDesc'));
    if (clean.length > MAX_LEN) return Alert.alert(t('parent.support.messageTooLongTitle'), t('parent.support.messageTooLongDesc', { max: MAX_LEN }));
    if (!parentId) return Alert.alert(t('parent.support.errorTitle'), t('parent.support.userNotFoundDesc'));

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
        userId: parentId,
        userRole: kullanici?.rol || 'veli',
        userName: parentName || kullanici?.kullaniciAdi || 'Veli',
        userPhone: kullanici?.telefon || '',
        userUsername: kullanici?.kullaniciAdi || '',
        childId: selectedChild?.id || '',
        childName: childName || '',
        createdAt: now,
        updatedAt: now,
      });

      setMessage('');
      setTopic('istek');
      showSuccess(t('parent.support.messageSent'));
    } catch (error) {
      console.error(error);
      Alert.alert(t('parent.support.errorTitle'), t('parent.support.sendFailedDesc'));
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (item) => {
    const clean = String(replyText[item.id] || '').trim();
    if (!clean) return Alert.alert(t('parent.support.missingInfoTitle'), t('parent.support.emptyReplyDesc'));
    if (clean.length > MAX_LEN) return Alert.alert(t('parent.support.replyTooLongTitle'), t('parent.support.replyTooLongDesc', { max: MAX_LEN }));

    setReplyingId(item.id);
    try {
      const now = Date.now();
      const replyRef = push(ref(database, `destekMesajlari/${item.id}/yanitlar`));
      await update(ref(database), {
        [`destekMesajlari/${item.id}/yanitlar/${replyRef.key}`]: {
          id: replyRef.key,
          mesaj: clean,
          authorId: parentId,
          authorName: parentName || 'Veli',
          authorRole: kullanici?.rol || 'veli',
          createdAt: now,
        },
        [`destekMesajlari/${item.id}/durum`]: 'yanitlandi',
        [`destekMesajlari/${item.id}/updatedAt`]: now,
      });
      setReplyText((prev) => ({ ...prev, [item.id]: '' }));
      showSuccess(t('parent.support.replySent'));
    } catch (error) {
      console.error(error);
      Alert.alert(t('parent.support.errorTitle'), t('parent.support.replyFailedDesc'));
    } finally {
      setReplyingId('');
    }
  };

  const renderReplies = (item) => {
    const replies = toList(item.yanitlar).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    if (!replies.length) return null;
    return (
      <View style={local.replyBox}>
        {replies.map((reply) => {
          const isAdmin = String(reply.authorRole || '').toLowerCase().includes('super');
          return (
            <View key={reply.id} style={[local.replyItem, isAdmin && local.adminReply]}>
              <Text style={local.replyAuthor}>{isAdmin ? t('parent.support.supportAuthor') : (reply.authorName || t('parent.support.youAuthor'))}</Text>
              <Text style={local.replyText}>{reply.mesaj}</Text>
              <Text style={local.replyDate}>{formatDate(reply.createdAt, dateLocale)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <AppSuccessToast
        visible={successToast.visible}
        message={successToast.message}
        onHide={() => setSuccessToast({ visible: false, message: '' })}
      />

      <ScreenShell title={t('parent.support.title')} emoji="💬" navigation={navigation}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 {t('parent.support.cardTitle')}</Text>
          <Text style={styles.cardText}>{t('parent.support.cardDesc')}</Text>

          <Text style={local.label}>{t('parent.support.topicLabel')}</Text>
          <View style={local.topicWrap}>
            {TOPICS.map((item) => (
              <TouchableOpacity key={item.key} style={[local.topicButton, topic === item.key && local.topicButtonActive]} onPress={() => setTopic(item.key)} activeOpacity={0.85}>
                <Text style={[local.topicText, topic === item.key && local.topicTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={local.label}>{t('parent.support.messageLabel')}</Text>
          <TextInput
            style={local.textArea}
            value={message}
            onChangeText={(text) => setMessage(text.slice(0, MAX_LEN))}
            placeholder={t('parent.support.messagePlaceholder')}
            placeholderTextColor="#999"
            multiline
            maxLength={MAX_LEN}
            textAlignVertical="top"
          />
          <Text style={local.counter}>{message.length}/{MAX_LEN}</Text>

          <TouchableOpacity style={[local.sendButton, sending && local.disabledButton]} onPress={sendMessage} disabled={sending} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color="#FFF" /> : <Text style={local.sendButtonText}>{t('parent.support.sendButton')}</Text>}
          </TouchableOpacity>
        </View>

        <Text style={local.sectionTitle}>{t('parent.support.recentTitle')}</Text>
        {messages.length === 0 ? (
          <EmptyState icon="📭" title={t('parent.support.noMessagesTitle')} desc={t('parent.support.noMessagesDesc')} />
        ) : (
          messages.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={local.messageHeader}>
                <Text style={local.messageTopic}>{item.konuBaslik || item.konu || t('parent.support.messageFallback')}</Text>
                <Text style={local.statusBadge}>{item.durum === 'yanitlandi' ? t('parent.support.statusReplied') : t('parent.support.statusNew')}</Text>
              </View>
              <Text style={local.messageText}>{item.mesaj}</Text>
              <Text style={local.messageDate}>{formatDate(item.createdAt, dateLocale)}</Text>
              {renderReplies(item)}

              <Text style={local.label}>{t('parent.support.replyLabel')}</Text>
              <TextInput
                style={local.replyInput}
                value={replyText[item.id] || ''}
                onChangeText={(text) => setReplyText((prev) => ({ ...prev, [item.id]: text.slice(0, MAX_LEN) }))}
                placeholder={t('parent.support.replyPlaceholder')}
                placeholderTextColor="#999"
                multiline
                maxLength={MAX_LEN}
                textAlignVertical="top"
              />
              <TouchableOpacity style={[local.replyButton, replyingId === item.id && local.disabledButton]} disabled={replyingId === item.id} onPress={() => sendReply(item)} activeOpacity={0.85}>
                <Text style={local.replyButtonText}>{replyingId === item.id ? t('parent.support.sendingReply') : t('parent.support.sendReplyButton')}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScreenShell>
    </>
  );
}

const local = {
  label: { color: THEME.text, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.border },
  topicButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  topicText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  topicTextActive: { color: '#FFF' },
  textArea: { minHeight: 150, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 13, fontWeight: '700', color: THEME.text },
  counter: { color: THEME.muted, textAlign: 'right', marginTop: 6, fontWeight: '700', fontSize: 12 },
  sendButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 12 },
  sendButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  disabledButton: { opacity: 0.55 },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 4 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  messageTopic: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  statusBadge: { color: THEME.primary, backgroundColor: THEME.primarySoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11 },
  messageText: { color: THEME.text, fontWeight: '700', marginTop: 10, lineHeight: 19 },
  messageDate: { color: THEME.muted, fontWeight: '700', marginTop: 8, fontSize: 12 },
  replyBox: { marginTop: 12, gap: 8 },
  replyItem: { backgroundColor: '#F8F6FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: THEME.border },
  adminReply: { backgroundColor: THEME.primarySoft, borderColor: '#D8CBFF' },
  replyAuthor: { color: THEME.primary, fontWeight: '900', marginBottom: 4 },
  replyText: { color: THEME.text, fontWeight: '700', lineHeight: 18 },
  replyDate: { color: THEME.muted, fontWeight: '700', marginTop: 5, fontSize: 11 },
  replyInput: { minHeight: 86, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 12, fontWeight: '700', color: THEME.text },
  replyButton: { marginTop: 8, backgroundColor: THEME.primarySoft, borderRadius: 13, padding: 12, alignItems: 'center' },
  replyButtonText: { color: THEME.primary, fontWeight: '900' },
};
