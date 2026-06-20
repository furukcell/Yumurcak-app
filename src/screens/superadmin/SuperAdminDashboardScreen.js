// ============================================================
// YUMURCAK — SuperAdminDashboardScreen.js
// FAZ 17: Firebase Index butonu eklendi
// Not: FAZ 14 dashboard üstüne küçük index butonu eklenmiş sürüm.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, ref } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  bg: '#0F172A',
  panel: '#111827',
  card: '#1E293B',
  card2: '#172033',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  soft: '#CBD5E1',
  blue: '#38BDF8',
  green: '#22C55E',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#A78BFA',
};

export default function SuperAdminDashboardScreen({ navigation }) {
  const { kullanici, cikisYap } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kresler, setKresler] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [cocuklar, setCocuklar] = useState([]);
  const [abonelikler, setAbonelikler] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [kresSnap, userSnap, childSnap, subSnap] = await Promise.all([
        get(ref(database, 'kresler')),
        get(ref(database, 'kullanicilar')),
        get(ref(database, 'cocuklar')),
        get(ref(database, 'abonelikler')),
      ]);

      setKresler(Object.entries(kresSnap.val() || {}).map(([id, val]) => ({ id, ...val })));
      setKullanicilar(Object.entries(userSnap.val() || {}).map(([id, val]) => ({ id, uid: id, ...val })));
      setCocuklar(Object.entries(childSnap.val() || {}).map(([id, val]) => ({ id, ...val })));
      setAbonelikler(subSnap.val() || {});
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Süper admin verileri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    loadData();
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const enrichedKresler = useMemo(() => {
    return kresler
      .map((kres) => {
        const sub = abonelikler[kres.id] || {};
        const childCount = cocuklar.filter((c) => c.kresId === kres.id).length;
        const teacherCount = kullanicilar.filter((u) => u.kresId === kres.id && u.rol === 'ogretmen').length;
        const parentCount = kullanicilar.filter((u) => u.kresId === kres.id && u.rol === 'veli').length;
        const managerCount = kullanicilar.filter((u) => u.kresId === kres.id && u.rol === 'yonetici').length;
        const kalanGun = getRemainingDays(sub);
        const subStatus = getSubscriptionStatus(sub);

        return { ...kres, abonelik: sub, kalanGun, subStatus, childCount, teacherCount, parentCount, managerCount };
      })
      .sort((a, b) => {
        const order = { expired: 0, expiring: 1, demo: 2, active: 3, none: 4 };
        return (order[a.subStatus.key] ?? 9) - (order[b.subStatus.key] ?? 9);
      });
  }, [kresler, abonelikler, cocuklar, kullanicilar]);

  const stats = useMemo(() => {
    return {
      totalKres: enrichedKresler.length,
      totalChild: cocuklar.length,
      totalTeacher: kullanicilar.filter((u) => u.rol === 'ogretmen').length,
      totalParent: kullanicilar.filter((u) => u.rol === 'veli').length,
      activeSub: enrichedKresler.filter((k) => ['active', 'demo'].includes(k.subStatus.key)).length,
      expiredSub: enrichedKresler.filter((k) => k.subStatus.key === 'expired').length,
      expiringSub: enrichedKresler.filter((k) => k.subStatus.key === 'expiring').length,
    };
  }, [enrichedKresler, cocuklar, kullanicilar]);

  const locationStats = useMemo(() => {
    const map = {};
    enrichedKresler.forEach((kres) => {
      const key = `${kres.il || 'İl yok'} / ${kres.ilce || 'İlçe yok'}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [enrichedKresler]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.blue} />
          <Text style={styles.loadingText}>Platform verileri hazırlanıyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={enrichedKresler}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.blue} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerKicker}>YUMURCAK PLATFORM</Text>
                <Text style={styles.headerTitle}>Süper Admin</Text>
                <Text style={styles.headerSub}>{kullanici?.ad || kullanici?.kullaniciAdi || 'Platform Sahibi'}</Text>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={cikisYap}>
                <Text style={styles.logoutText}>Çıkış</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.createButton} activeOpacity={0.86} onPress={() => navigation.navigate('SuperAdminKresCreate')}>
              <View>
                <Text style={styles.createTitle}>+ Yeni Kreş Ekle</Text>
                <Text style={styles.createDesc}>Kurum + yönetici hesabı + demo abonelik oluştur</Text>
              </View>
              <Text style={styles.createArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.indexButton} activeOpacity={0.86} onPress={() => navigation.navigate('SuperAdminIndexMigration')}>
              <View>
                <Text style={styles.indexTitle}>Firebase Index / Veri Düzeni</Text>
                <Text style={styles.indexDesc}>Kreş, kullanıcı, çocuk ve mesaj indexlerini oluştur</Text>
              </View>
              <Text style={styles.indexArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.hero}>
              <View>
                <Text style={styles.heroLabel}>Genel Durum</Text>
                <Text style={styles.heroTitle}>{stats.totalKres} kreş takipte</Text>
                <Text style={styles.heroDesc}>Aktif/demo: {stats.activeSub} · Yaklaşan: {stats.expiringSub} · Biten: {stats.expiredSub}</Text>
              </View>
              <Text style={styles.heroIcon}>📊</Text>
            </View>

            <View style={styles.grid}>
              <StatCard label="Kreş" value={stats.totalKres} color={THEME.blue} icon="🏫" />
              <StatCard label="Öğrenci" value={stats.totalChild} color={THEME.green} icon="🧒" />
              <StatCard label="Öğretmen" value={stats.totalTeacher} color={THEME.purple} icon="👩‍🏫" />
              <StatCard label="Veli" value={stats.totalParent} color={THEME.orange} icon="👨‍👩‍👧" />
            </View>

            <View style={styles.statusRow}>
              <MiniStatus label="Aktif/Demo" value={stats.activeSub} color={THEME.green} />
              <MiniStatus label="7 gün içinde" value={stats.expiringSub} color={THEME.orange} />
              <MiniStatus label="Biten" value={stats.expiredSub} color={THEME.red} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>İl / İlçe Dağılımı</Text>
              {locationStats.length === 0 ? (
                <Text style={styles.emptyText}>Henüz lokasyon verisi yok.</Text>
              ) : (
                locationStats.map((item) => (
                  <View key={item.label} style={styles.locationRow}>
                    <Text style={styles.locationLabel}>{item.label}</Text>
                    <Text style={styles.locationCount}>{item.count}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Kreşler</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.kresCard}
            onPress={() => navigation.navigate('SuperAdminKresDetail', { kresId: item.id, kres: item })}
          >
            <View style={styles.kresTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kresName}>{item.ad || item.kresAdi || 'İsimsiz Kreş'}</Text>
                <Text style={styles.kresLocation}>{item.il || 'İl yok'} / {item.ilce || 'İlçe yok'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.subStatus.bg }]}>
                <Text style={[styles.badgeText, { color: item.subStatus.color }]}>{item.subStatus.label}</Text>
              </View>
            </View>

            <View style={styles.kresStats}>
              <SmallInfo label="Öğrenci" value={item.childCount} />
              <SmallInfo label="Öğretmen" value={item.teacherCount} />
              <SmallInfo label="Veli" value={item.parentCount} />
              <SmallInfo label="Kalan" value={item.kalanGun === null ? '-' : `${item.kalanGun}g`} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyIcon}>🏫</Text>
            <Text style={styles.emptyTitle}>Henüz kreş yok</Text>
            <Text style={styles.emptyText}>Yeni Kreş Ekle butonuyla ilk kurumu oluştur.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStatus({ label, value, color }) {
  return (
    <View style={styles.miniStatus}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function SmallInfo({ label, value }) {
  return (
    <View style={styles.smallInfo}>
      <Text style={styles.smallValue}>{value}</Text>
      <Text style={styles.smallLabel}>{label}</Text>
    </View>
  );
}

function getRemainingDays(sub = {}) {
  const end = sub.bitisTarihi || sub.bitis || sub.endDate || sub.expiresAt;
  if (!end) return null;
  const endMs = typeof end === 'number' ? end : new Date(end).getTime();
  if (!endMs || Number.isNaN(endMs)) return null;
  return Math.ceil((endMs - Date.now()) / 86400000);
}

function getSubscriptionStatus(sub = {}) {
  const durum = String(sub.durum || sub.status || '').toLowerCase();
  const plan = String(sub.plan || '').toLowerCase();
  const kalan = getRemainingDays(sub);

  if (!sub || Object.keys(sub).length === 0) return { key: 'none', label: 'Yok', color: THEME.muted, bg: '#263244' };
  if (durum.includes('demo') || plan.includes('demo')) {
    if (kalan !== null && kalan < 0) return { key: 'expired', label: 'Bitti', color: THEME.red, bg: '#3A1F2A' };
    return { key: 'demo', label: 'Demo', color: THEME.blue, bg: '#17344A' };
  }
  if (kalan !== null) {
    if (kalan < 0) return { key: 'expired', label: 'Bitti', color: THEME.red, bg: '#3A1F2A' };
    if (kalan <= 7) return { key: 'expiring', label: `${kalan} gün`, color: THEME.orange, bg: '#3A2D17' };
  }
  if (durum.includes('aktif') || durum.includes('active') || kalan === null || kalan > 7) return { key: 'active', label: 'Aktif', color: THEME.green, bg: '#173A2A' };
  return { key: 'none', label: 'Belirsiz', color: THEME.muted, bg: '#263244' };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerKicker: { color: THEME.blue, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  headerTitle: { color: THEME.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
  headerSub: { color: THEME.muted, fontWeight: '800', marginTop: 2 },
  logoutButton: { backgroundColor: '#1F2937', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: THEME.line },
  logoutText: { color: THEME.soft, fontWeight: '900' },
  createButton: { backgroundColor: '#0EA5E9', borderRadius: 20, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createTitle: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  createDesc: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 4 },
  createArrow: { color: '#FFF', fontSize: 34, fontWeight: '900' },
  indexButton: { backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indexTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  indexDesc: { color: THEME.muted, fontWeight: '700', marginTop: 4 },
  indexArrow: { color: THEME.blue, fontSize: 30, fontWeight: '900' },
  hero: { backgroundColor: THEME.panel, borderRadius: 24, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: THEME.line, marginBottom: 14 },
  heroLabel: { color: THEME.blue, fontWeight: '900', fontSize: 12 },
  heroTitle: { color: THEME.text, fontWeight: '900', fontSize: 23, marginTop: 4 },
  heroDesc: { color: THEME.muted, fontWeight: '700', marginTop: 5 },
  heroIcon: { fontSize: 42 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: { width: '48.5%', backgroundColor: THEME.card, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: THEME.line },
  statIcon: { fontSize: 26, marginBottom: 8 },
  statValue: { fontSize: 25, fontWeight: '900' },
  statLabel: { color: THEME.muted, fontWeight: '800', marginTop: 3 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  miniStatus: { flex: 1, backgroundColor: THEME.card2, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: THEME.line },
  miniValue: { fontWeight: '900', fontSize: 21 },
  miniLabel: { color: THEME.muted, fontWeight: '800', fontSize: 11, marginTop: 3 },
  section: { backgroundColor: THEME.panel, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: THEME.line, marginBottom: 16 },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  locationLabel: { color: THEME.soft, fontWeight: '800' },
  locationCount: { color: THEME.blue, fontWeight: '900' },
  kresCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 11, borderWidth: 1, borderColor: THEME.line },
  kresTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  kresName: { color: THEME.text, fontWeight: '900', fontSize: 17 },
  kresLocation: { color: THEME.muted, fontWeight: '700', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontWeight: '900', fontSize: 12 },
  kresStats: { flexDirection: 'row', gap: 8, marginTop: 13 },
  smallInfo: { flex: 1, backgroundColor: '#0F172A', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#243044' },
  smallValue: { color: THEME.text, fontWeight: '900' },
  smallLabel: { color: THEME.muted, fontSize: 10, fontWeight: '800', marginTop: 2 },
  emptyPanel: { backgroundColor: THEME.panel, borderRadius: 20, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: THEME.line },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { color: THEME.text, fontWeight: '900', fontSize: 18 },
  emptyText: { color: THEME.muted, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
});
