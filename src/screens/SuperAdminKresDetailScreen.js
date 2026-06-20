// ============================================================
// YUMURCAK — SuperAdminKresDetailScreen.js
// FAZ 13: Kreş detay istatistik ekranı
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, ref } from 'firebase/database';
import { database } from '../../config/firebase';

const THEME = {
  bg: '#0F172A',
  panel: '#111827',
  card: '#1E293B',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#38BDF8',
  green: '#22C55E',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#A78BFA',
};

export default function SuperAdminKresDetailScreen({ navigation, route }) {
  const kresId = route?.params?.kresId;
  const initialKres = route?.params?.kres || {};

  const [loading, setLoading] = useState(true);
  const [kres, setKres] = useState(initialKres);
  const [users, setUsers] = useState([]);
  const [children, setChildren] = useState([]);
  const [subscription, setSubscription] = useState({});

  const loadData = useCallback(async () => {
    if (!kresId) {
      setLoading(false);
      return;
    }

    try {
      const [kresSnap, userSnap, childSnap, subSnap] = await Promise.all([
        get(ref(database, `kresler/${kresId}`)),
        get(ref(database, 'kullanicilar')),
        get(ref(database, 'cocuklar')),
        get(ref(database, `abonelikler/${kresId}`)),
      ]);

      setKres({ id: kresId, ...(kresSnap.val() || initialKres) });
      setUsers(
        Object.entries(userSnap.val() || {})
          .map(([id, val]) => ({ id, uid: id, ...val }))
          .filter((u) => u.kresId === kresId)
      );
      setChildren(
        Object.entries(childSnap.val() || {})
          .map(([id, val]) => ({ id, ...val }))
          .filter((c) => c.kresId === kresId)
      );
      setSubscription(subSnap.val() || {});
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Kreş detayları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [kresId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    return {
      manager: users.filter((u) => u.rol === 'yonetici').length,
      teacher: users.filter((u) => u.rol === 'ogretmen').length,
      parent: users.filter((u) => u.rol === 'veli').length,
      child: children.length,
    };
  }, [users, children]);

  const remaining = getRemainingDays(subscription);
  const status = getSubscriptionStatus(subscription);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.blue} />
          <Text style={styles.loadingText}>Kreş detayı yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kreş Detayı</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>KREŞ PROFİLİ</Text>
          <Text style={styles.kresName}>{kres.ad || kres.kresAdi || 'İsimsiz Kreş'}</Text>
          <Text style={styles.location}>{kres.il || 'İl yok'} / {kres.ilce || 'İlçe yok'}</Text>
          <Text style={styles.address}>{kres.adres || 'Adres girilmemiş'}</Text>
        </View>

        <View style={styles.grid}>
          <Stat label="Çocuk" value={stats.child} color={THEME.green} />
          <Stat label="Öğretmen" value={stats.teacher} color={THEME.purple} />
          <Stat label="Veli" value={stats.parent} color={THEME.orange} />
          <Stat label="Yönetici" value={stats.manager} color={THEME.blue} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Abonelik</Text>
          <InfoRow label="Durum" value={status.label} valueColor={status.color} />
          <InfoRow label="Plan" value={subscription.plan || subscription.paket || '-'} />
          <InfoRow label="Kalan Gün" value={remaining === null ? '-' : `${remaining} gün`} />
          <InfoRow label="Başlangıç" value={formatDate(subscription.baslangicTarihi || subscription.baslangic)} />
          <InfoRow label="Bitiş" value={formatDate(subscription.bitisTarihi || subscription.bitis || subscription.expiresAt)} />
          <InfoRow label="Fiyat" value={subscription.fiyat ? `${subscription.fiyat} TL` : '-'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kurum Bilgileri</Text>
          <InfoRow label="Telefon" value={kres.telefon || '-'} />
          <InfoRow label="E-posta" value={kres.email || '-'} />
          <InfoRow label="Yönetici" value={kres.yoneticiAd || '-'} />
          <InfoRow label="Yönetici Tel" value={kres.yoneticiTelefon || '-'} />
          <InfoRow label="Web" value={kres.website || '-'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Yöneticiler</Text>
          {users.filter((u) => u.rol === 'yonetici').length === 0 ? (
            <Text style={styles.emptyText}>Bu kreşe bağlı yönetici yok.</Text>
          ) : (
            users.filter((u) => u.rol === 'yonetici').map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View>
                  <Text style={styles.userName}>{`${u.ad || ''} ${u.soyad || ''}`.trim() || u.kullaniciAdi || u.id}</Text>
                  <Text style={styles.userMeta}>{u.kullaniciAdi || u.email || u.id}</Text>
                </View>
                <Text style={styles.roleBadge}>Yönetici</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value || '-'}</Text>
    </View>
  );
}

function getRemainingDays(sub = {}) {
  const end = sub.bitisTarihi || sub.bitis || sub.endDate || sub.expiresAt;
  if (!end) return null;
  const ms = typeof end === 'number' ? end : new Date(end).getTime();
  if (!ms || Number.isNaN(ms)) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

function getSubscriptionStatus(sub = {}) {
  const durum = String(sub.durum || sub.status || '').toLowerCase();
  const plan = String(sub.plan || '').toLowerCase();
  const kalan = getRemainingDays(sub);

  if (!sub || Object.keys(sub).length === 0) return { label: 'Yok', color: THEME.muted };
  if (durum.includes('demo') || plan.includes('demo')) return { label: 'Demo', color: THEME.blue };
  if (kalan !== null && kalan < 0) return { label: 'Bitti', color: THEME.red };
  if (kalan !== null && kalan <= 7) return { label: 'Bitiyor', color: THEME.orange };
  if (durum.includes('aktif') || durum.includes('active') || kalan === null || kalan > 7) return { label: 'Aktif', color: THEME.green };
  return { label: 'Belirsiz', color: THEME.muted };
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(typeof value === 'number' ? value : String(value));
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('tr-TR');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backButton: { width: 70 },
  backText: { color: THEME.blue, fontWeight: '900', fontSize: 16 },
  headerTitle: { color: THEME.text, fontWeight: '900', fontSize: 18 },
  hero: { backgroundColor: THEME.panel, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: THEME.line, marginBottom: 14 },
  kicker: { color: THEME.blue, fontWeight: '900', letterSpacing: 1.6, fontSize: 11 },
  kresName: { color: THEME.text, fontSize: 26, fontWeight: '900', marginTop: 5 },
  location: { color: THEME.muted, fontWeight: '800', marginTop: 4 },
  address: { color: THEME.muted, fontWeight: '700', marginTop: 8, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { width: '48.5%', backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.line },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { color: THEME.muted, fontWeight: '800', marginTop: 3 },
  card: { backgroundColor: THEME.panel, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: THEME.line, marginBottom: 14 },
  sectionTitle: { color: THEME.text, fontWeight: '900', fontSize: 18, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  infoLabel: { color: THEME.muted, fontWeight: '800' },
  infoValue: { color: THEME.text, fontWeight: '900', flexShrink: 1, textAlign: 'right' },
  emptyText: { color: THEME.muted, fontWeight: '700', lineHeight: 20 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  userName: { color: THEME.text, fontWeight: '900' },
  userMeta: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  roleBadge: { color: THEME.blue, backgroundColor: '#17344A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontWeight: '900' },
});
