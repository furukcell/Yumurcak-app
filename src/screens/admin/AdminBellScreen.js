import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  blue: '#3A7BFF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toList(data) {
  const obj = safeObject(data);
  return Object.entries(obj).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function formatTime(value) {
  if (!value) return 'Saat yok';
  let date = null;
  if (typeof value === 'number') date = new Date(value);
  if (typeof value === 'string') {
    const numeric = Number(value);
    date = Number.isFinite(numeric) && value.length >= 10 ? new Date(numeric) : new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function teslimLabel(value) {
  const v = normalizeText(value);
  if (v === 'birakacagim' || v === 'birakacağım' || v === 'birakma') return '🏫 Bırakacağım';
  if (v === 'alacagim' || v === 'alacağım' || v === 'alma') return '👋 Alacağım';
  return value || 'Teslim bilgisi yok';
}

function durumLabel(value) {
  const v = normalizeText(value);
  if (v === 'kapidayim' || v === 'kapıdayım') return '📍 Kapıdayım';
  if (v === 'geliyorum') return '🚗 Geliyorum';
  if (v === 'tamamlandi' || v === 'tamamlandı') return '✅ Tamamlandı';
  return value || 'Bildirim';
}

function getAccent(item) {
  const durum = normalizeText(item?.durum || item?.status);
  if (item?.tamamlandi || item?.tamamlandı) return THEME.green;
  if (durum === 'kapidayim' || durum === 'kapıdayım') return THEME.red;
  if (durum === 'geliyorum') return THEME.orange;
  return THEME.blue;
}

export default function AdminBellScreen() {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || kullanici?.kurumId || null;
  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onValue(
      ref(database, 'kurumZili'),
      (snap) => {
        const liste = toList(snap.val())
          .filter((item) => {
            if (!kresId) return true;
            return !item.kresId || item.kresId === kresId || item.kurumId === kresId;
          })
          .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0));

        setBildirimler(liste);
        setLoading(false);
      },
      () => {
        setBildirimler([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [kresId]);

  const stats = useMemo(() => {
    const aktif = bildirimler.filter((item) => !(item.tamamlandi || item.tamamlandı)).length;
    const okunmamis = bildirimler.filter((item) => !(item.okundu || item.read) && !(item.tamamlandi || item.tamamlandı)).length;
    const tamamlanan = bildirimler.filter((item) => item.tamamlandi || item.tamamlandı).length;
    return { aktif, okunmamis, tamamlanan };
  }, [bildirimler]);

  async function markOkundu(item) {
    if (!item?.id || busyId) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `kurumZili/${item.id}`), {
        okundu: true,
        read: true,
        okunduAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (error) {
      Alert.alert('Hata', 'Bildirim okundu yapılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  async function markTamamlandi(item) {
    if (!item?.id || busyId) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `kurumZili/${item.id}`), {
        okundu: true,
        read: true,
        tamamlandi: true,
        tamamlandiAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (error) {
      Alert.alert('Hata', 'Bildirim tamamlandı yapılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  function renderItem({ item }) {
    const tamamlandi = !!(item.tamamlandi || item.tamamlandı);
    const okundu = !!(item.okundu || item.read);
    const busy = busyId === item.id;
    const accent = getAccent(item);
    const durum = item.durum || item.status;

    return (
      <View style={[styles.card, !okundu && !tamamlandi && styles.unreadCard]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, { backgroundColor: accent + '20' }]}>
            <Text style={styles.iconText}>{normalizeText(durum).includes('kapi') || normalizeText(durum).includes('kapı') ? '📍' : '🚗'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.childName}>{item.cocukAdi || item.cocukAd || item.childName || item.cocukId || 'Çocuk'}</Text>
            <Text style={styles.parentName}>{item.veliAdi || item.veliAd || item.parentName || item.veliId || 'Veli'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: accent + '20' }]}>
            <Text style={[styles.statusText, { color: accent }]}>{tamamlandi ? '✅ Tamamlandı' : durumLabel(durum)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Teslim</Text>
          <Text style={styles.infoValue}>{teslimLabel(item.teslimTuru || item.teslimTipi || item.type)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Saat</Text>
          <Text style={styles.infoValue}>{formatTime(item.createdAt || item.tarih || item.time)}</Text>
        </View>
        {item.not || item.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{item.not || item.note}</Text>
          </View>
        ) : null}

        {!tamamlandi ? (
          <View style={styles.actionRow}>
            {!okundu ? (
              <TouchableOpacity style={[styles.secondaryBtn, busy && styles.disabled]} onPress={() => markOkundu(item)} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>👀 Okundu</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.primaryBtn, busy && styles.disabled]} onPress={() => markTamamlandi(item)} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>✅ Tamamlandı</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Kurum zili yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: THEME.orange }]}>{stats.aktif}</Text>
          <Text style={styles.summaryLabel}>Aktif</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: THEME.red }]}>{stats.okunmamis}</Text>
          <Text style={styles.summaryLabel}>Okunmamış</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: THEME.green }]}>{stats.tamamlanan}</Text>
          <Text style={styles.summaryLabel}>Tamamlanan</Text>
        </View>
      </View>

      {bildirimler.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Henüz kurum zili bildirimi yok</Text>
          <Text style={styles.emptyDesc}>Veliler “Geliyorum” veya “Kapıdayım” dediğinde burada görünecek.</Text>
        </View>
      ) : (
        <FlatList
          data={bildirimler}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '800' },
  summaryBar: { flexDirection: 'row', backgroundColor: THEME.card, margin: 16, borderRadius: 20, paddingVertical: 16, borderWidth: 1, borderColor: THEME.border },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 12, color: THEME.muted, fontWeight: '800', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: THEME.border, marginVertical: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  unreadCard: { borderColor: '#FFD1DA', backgroundColor: '#FFF8FA' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { fontSize: 24 },
  cardInfo: { flex: 1, paddingRight: 8 },
  childName: { color: THEME.text, fontSize: 16, fontWeight: '900' },
  parentName: { color: THEME.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '900' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F0EDF8' },
  infoLabel: { color: THEME.muted, fontWeight: '800' },
  infoValue: { color: THEME.text, fontWeight: '900', flex: 1, textAlign: 'right' },
  noteBox: { backgroundColor: '#F6F3FF', borderRadius: 12, padding: 10, marginTop: 8 },
  noteText: { color: THEME.text, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryBtn: { flex: 1, backgroundColor: '#F3F0FF', borderRadius: 13, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  secondaryBtnText: { color: THEME.primary, fontWeight: '900' },
  primaryBtn: { flex: 1, backgroundColor: THEME.green, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.6 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyIcon: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  emptyDesc: { color: THEME.muted, textAlign: 'center', marginTop: 8, fontWeight: '700', lineHeight: 20 },
});