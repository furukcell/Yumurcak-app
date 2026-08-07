import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { onValue, push, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';

const COLORS = {
  bg: '#0F172A',
  panel: '#111827',
  card: '#1E293B',
  cardSoft: '#172033',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  soft: '#CBD5E1',
  blue: '#38BDF8',
  green: '#22C55E',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#A78BFA',
};

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'yeni', label: 'Yeni' },
  { key: 'yanitlandi', label: 'Yanıtlandı' },
  { key: 'kapandi', label: 'Kapandı' },
];

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

export default function SuperAdminSupportScreen({ navigation }) {
  const { kullanici } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState('');
  const [successToast, setSuccessToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'destekMesajlari'), (snap) => {
      const list = toList(snap.val())
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      setMessages(list);
      setLoading(false);
    }, () => {
      setMessages([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages;
    return messages.filter((item) => String(item.durum || 'yeni') === filter);
  }, [messages, filter]);

  const stats = useMemo(() => ({
    total: messages.length,
    yeni: messages.filter((item) => String(item.durum || 'yeni') === 'yeni').length,
    yanitlandi: messages.filter((item) => String(item.durum || '') === 'yanitlandi').length,
    kapandi: messages.filter((item) => String(item.durum || '') === 'kapandi').length,
  }), [messages]);

  const showSuccess = (text) => setSuccessToast({ visible: true, message: text });

  const sendReply = async (item) => {
    const clean = String(replyText[item.id] || '').trim();
    if (!clean) return Alert.alert('Eksik Bilgi', 'Cevap alanı boş olamaz.');
    if (clean.length > MAX_LEN) return Alert.alert('Cevap Uzun', `Cevap en fazla ${MAX_LEN} karakter olabilir.`);

    setReplyingId(item.id);
    try {
      const now = Date.now();
      const replyRef = push(ref(database, `destekMesajlari/${item.id}/yanitlar`));
      await update(ref(database), {
        [`destekMesajlari/${item.id}/yanitlar/${replyRef.key}`]: {
          id: replyRef.key,
          mesaj: clean,
          authorId: kullanici?.id || kullanici?.uid || 'superadmin',
          authorName: kullanici?.ad || kullanici?.kullaniciAdi || 'Yumurcak Destek',
          authorRole: 'superadmin',
          createdAt: now,
        },
        [`destekMesajlari/${item.id}/durum`]: 'yanitlandi',
        [`destekMesajlari/${item.id}/lastReplyAt`]: now,
        [`destekMesajlari/${item.id}/updatedAt`]: now,
      });

      setReplyText((prev) => ({ ...prev, [item.id]: '' }));
      showSuccess('Cevap gönderildi');
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Cevap gönderilemedi.');
    } finally {
      setReplyingId('');
    }
  };

  const closeMessage = async (item) => {
    try {
      await update(ref(database, `destekMesajlari/${item.id}`), {
        durum: 'kapandi',
        updatedAt: Date.now(),
      });
      showSuccess('Talep kapatıldı');
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Talep kapatılamadı.');
    }
  };

  const renderReplies = (item) => {
    const replies = toList(item.yanitlar).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    if (!replies.length) return null;
    return (
      <View style={styles.repliesBox}>
        {replies.map((reply) => {
          const isAdmin = String(reply.authorRole || '').toLowerCase().includes('super');
          return (
            <View key={reply.id} style={[styles.replyItem, isAdmin && styles.adminReply]}>
              <Text style={styles.replyAuthor}>{isAdmin ? 'Yumurcak Destek' : (reply.authorName || 'Kullanıcı')}</Text>
              <Text style={styles.replyText}>{reply.mesaj}</Text>
              <Text style={styles.replyDate}>{formatDate(reply.createdAt)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topic}>{item.konuBaslik || item.konu || 'Destek'}</Text>
          <Text style={styles.userLine}>{item.userName || 'Kullanıcı'} · {item.kresAdi || item.kresId || 'Kreş yok'}</Text>
        </View>
        <Text style={[styles.status, item.durum === 'kapandi' && styles.statusClosed]}>{item.durum || 'yeni'}</Text>
      </View>

      <Text style={styles.message}>{item.mesaj}</Text>
      <Text style={styles.meta}>Çocuk: {item.childName || '-'} · Kullanıcı: {item.userUsername || '-'} · {formatDate(item.createdAt)}</Text>
      {item.userPhone ? <Text style={styles.meta}>Telefon: {item.userPhone}</Text> : null}

      {renderReplies(item)}

      <Text style={styles.label}>Cevap Yaz</Text>
      <TextInput
        style={styles.textArea}
        value={replyText[item.id] || ''}
        onChangeText={(text) => setReplyText((prev) => ({ ...prev, [item.id]: text.slice(0, MAX_LEN) }))}
        placeholder="Süperadmin cevabını yaz..."
        placeholderTextColor="#64748B"
        multiline
        maxLength={MAX_LEN}
        textAlignVertical="top"
      />
      <Text style={styles.counter}>{String(replyText[item.id] || '').length}/{MAX_LEN}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.replyButton, replyingId === item.id && styles.disabled]} onPress={() => sendReply(item)} disabled={replyingId === item.id} activeOpacity={0.85}>
          {replyingId === item.id ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.replyButtonText}>Cevapla</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={() => closeMessage(item)} activeOpacity={0.85}>
          <Text style={styles.closeButtonText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.loadingText}>Destek mesajları yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast.visible}
        message={successToast.message}
        onHide={() => setSuccessToast({ visible: false, message: '' })}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.85}>
                <Text style={styles.backText}>‹ Geri</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.headerTitle}>Destek Kutusu</Text>
                <Text style={styles.headerSub}>İstek · Şikayet · Görüş</Text>
              </View>
              <View style={styles.backButton} />
            </View>

            <View style={styles.statsRow}>
              <Stat label="Toplam" value={stats.total} color={COLORS.blue} />
              <Stat label="Yeni" value={stats.yeni} color={COLORS.orange} />
              <Stat label="Yanıt" value={stats.yanitlandi} color={COLORS.green} />
              <Stat label="Kapalı" value={stats.kapandi} color={COLORS.red} />
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => (
                <TouchableOpacity key={item.key} style={[styles.filterButton, filter === item.key && styles.filterButtonActive]} onPress={() => setFilter(item.key)} activeOpacity={0.85}>
                  <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Mesaj yok</Text>
            <Text style={styles.emptyText}>Filtreye uygun destek mesajı bulunamadı.</Text>
          </View>
        }
        renderItem={renderItem}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
  content: { padding: 16, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  loadingText: { color: COLORS.muted, marginTop: 12, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backButton: { width: 74 },
  backText: { color: COLORS.blue, fontWeight: '900', fontSize: 16 },
  headerTitle: { color: COLORS.text, fontWeight: '900', fontSize: 23 },
  headerSub: { color: COLORS.muted, fontWeight: '700', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 11, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: COLORS.muted, fontWeight: '800', fontSize: 11, marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterButtonActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  filterText: { color: COLORS.soft, fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: COLORS.bg },
  card: { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, padding: 15, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  topic: { color: COLORS.text, fontWeight: '900', fontSize: 17 },
  userLine: { color: COLORS.muted, fontWeight: '700', marginTop: 4 },
  status: { color: COLORS.orange, backgroundColor: '#3A2E1F', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11 },
  statusClosed: { color: COLORS.red, backgroundColor: '#3A1F2A' },
  message: { color: COLORS.text, fontWeight: '700', lineHeight: 20, marginTop: 12 },
  meta: { color: COLORS.muted, fontWeight: '700', marginTop: 7, fontSize: 12 },
  label: { color: COLORS.text, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  textArea: { minHeight: 92, backgroundColor: COLORS.cardSoft, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 12, fontWeight: '700' },
  counter: { color: COLORS.muted, textAlign: 'right', marginTop: 5, fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  replyButton: { flex: 1, backgroundColor: COLORS.blue, borderRadius: 14, padding: 13, alignItems: 'center' },
  replyButtonText: { color: COLORS.bg, fontWeight: '900' },
  closeButton: { backgroundColor: '#3A1F2A', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center' },
  closeButtonText: { color: COLORS.red, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  repliesBox: { marginTop: 12, gap: 8 },
  replyItem: { backgroundColor: COLORS.cardSoft, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 11 },
  adminReply: { borderColor: '#1D4E73', backgroundColor: '#0B2942' },
  replyAuthor: { color: COLORS.blue, fontWeight: '900' },
  replyText: { color: COLORS.text, fontWeight: '700', lineHeight: 18, marginTop: 5 },
  replyDate: { color: COLORS.muted, fontWeight: '700', marginTop: 5, fontSize: 11 },
  emptyCard: { alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, padding: 24, marginTop: 12 },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { color: COLORS.text, fontWeight: '900', fontSize: 17, marginTop: 8 },
  emptyText: { color: COLORS.muted, fontWeight: '700', marginTop: 5, textAlign: 'center' },
});
