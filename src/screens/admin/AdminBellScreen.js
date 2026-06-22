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

function formatTime(value) {
  if (!value) return 'Saat yok';
  let date = null;
  if (typeof value === 'number') date = new Date(value);
  if (typeof value === 'string') date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return 'Saat yok';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function teslimLabel(value) {
  if (value === 'birakacagim') return '🏫 Bırakacağım';
  return '👋 Alacağım';
}

function durumLabel(value) {
  if (value === 'kapidayim') return '📍 Kapıdayım';
  if (value === 'geliyorum') return '🚗 Geliyorum';
  return value || 'Bildirim';
}

export default function AdminBellScreen() {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || 'kres001';
  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(database, 'kurumZili'), (snap) => {
      const data = snap.val() || {};
      const liste = Object.entries(data)
        .filter(([, item]) => !item.kresId || item.kresId === kresId)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));

      setBildirimler(liste);
      setLoading(false);
    });

    return () => unsub();
  }, [kresId]);

  const stats = useMemo(() => {
    const aktif = bildirimler.filter((item) => !item.tamamlandi).length;
    const okunmamis = bildirimler.filter((item) => !item.okundu && !item.tamamlandi).length;
    const tamamlanan = bildirimler.filter((item) => item.tamamlandi).length;
    return { aktif, okunmamis, tamamlanan };
  }, [bildirimler]);

  async function markOkundu(item) {
    if (!item?.id) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `kurumZili/${item.id}`), {
        okundu: true,
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
    if (!item?.id) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `kurumZili/${item.id}`), {
        okundu: true,
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
    const tamamlandi = !!item.tamamlandi;
    const okundu = !!item.okundu;
    const busy = busyId === item.id;
    const accent = tamamlandi ? THEME.green : item.durum === 'kapidayim' ? THEME.red : THEME.orange;

    return (
      <View style={[styles.card, !okundu && !tamamlandi && styles.unreadCard]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, { backgroundColor: accent + '20' }]}>
            <Text style={styles.iconText}>{item.durum === 'kapidayim' ? '📍' : '🚗'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.childName}>{item.cocukAdi || item.cocukAd || item.cocukId || 'Çocuk'}</Text>
            <Text style={styles.parentName}>{item.veliAdi || item.veliAd || 'Veli'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: accent + '20' }]}>
            <Text style={[styles.statusText, { color: accent }]}>{tamamlandi ? '✅ Tamamlandı' : durumLabel(item.durum)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Teslim</Text>
          <Text style={styles.infoValue}>{teslimLabel(item.teslimTuru)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Saat</Text>
          <Text style={styles.infoValue}>{formatTime(item.createdAt)}</Text>
        </View>
        {item.not ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{item.not}</Text>
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
          keyExtractor={(item) => item.id}
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
  infoValue: { color: THEME.text, fontWeight: '900' },
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
