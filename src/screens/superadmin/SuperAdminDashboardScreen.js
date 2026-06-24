// ============================================================
// YUMURCAK — SuperAdminDashboardScreen.js
// Detaylı platform / abonelik / kurum yönetim paneli
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
  pink: '#F472B6',
  cyan: '#67E8F9',
};

const MONTHLY_PRICE = 999;
const YEARLY_PRICE = 9990;

export default function SuperAdminDashboardScreen({ navigation }) {
  const { kullanici, cikisYap } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [kresler, setKresler] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [cocuklar, setCocuklar] = useState([]);
  const [siniflar, setSiniflar] = useState([]);
  const [abonelikler, setAbonelikler] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [kresSnap, userSnap, childSnap, classSnap, subSnap] = await Promise.all([
        get(ref(database, 'kresler')),
        get(ref(database, 'kullanicilar')),
        get(ref(database, 'cocuklar')),
        get(ref(database, 'siniflar')),
        get(ref(database, 'abonelikler')),
      ]);

      const kresList = Object.entries(kresSnap.val() || {}).map(([id, val]) => ({
        id,
        ...val,
      }));

      const userList = Object.entries(userSnap.val() || {}).map(([id, val]) => ({
        id,
        uid: id,
        ...val,
      }));

      const childList = Object.entries(childSnap.val() || {}).map(([id, val]) => ({
        id,
        ...val,
      }));

      const classList = Object.entries(classSnap.val() || {}).map(([id, val]) => ({
        id,
        ...val,
      }));

      setKresler(kresList);
      setKullanicilar(userList);
      setCocuklar(childList);
      setSiniflar(classList);
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
        const abonelik = normalizeSubscription(abonelikler[kres.id], kres);

        const kresUsers = kullanicilar.filter((u) => belongsToKres(u, kres.id));
        const kresChildren = cocuklar.filter((c) => belongsToKres(c, kres.id));
        const kresClasses = siniflar.filter((s) => belongsToKres(s, kres.id));

        const teacherCount = kresUsers.filter((u) => normalizeRole(u.rol) === 'ogretmen').length;
        const parentCount = kresUsers.filter((u) => normalizeRole(u.rol) === 'veli').length;
        const managerCount = kresUsers.filter((u) => isManager(u)).length;

        const kalanGun = getRemainingDays(abonelik);
        const subStatus = getSubscriptionStatus(abonelik);
        const planInfo = getPlanInfo(abonelik);
        const revenue = getEstimatedRevenue(abonelik);

        return {
          ...kres,
          abonelik,
          kalanGun,
          subStatus,
          planInfo,
          revenue,
          userCount: kresUsers.length,
          childCount: kresChildren.length,
          teacherCount,
          parentCount,
          managerCount,
          classCount: kresClasses.length,
          contactPhone: kres.telefon || kres.phone || kres.yetkiliTelefon || kres.yoneticiTelefon || '',
          contactEmail: kres.email || kres.eposta || '',
          contactAddress: kres.adres || kres.address || '',
          managerName: kres.yetkiliAd || kres.yoneticiAd || kres.kurumYetkilisi || '',
        };
      })
      .sort((a, b) => {
        const order = {
          expired: 0,
          critical: 1,
          expiring: 2,
          none: 3,
          demo: 4,
          active: 5,
        };

        return (order[a.subStatus.key] ?? 9) - (order[b.subStatus.key] ?? 9);
      });
  }, [kresler, abonelikler, kullanicilar, cocuklar, siniflar]);

  const stats = useMemo(() => {
    const demo = enrichedKresler.filter((k) => k.planInfo.key === 'demo').length;
    const monthly = enrichedKresler.filter((k) => k.planInfo.key === 'aylik').length;
    const yearly = enrichedKresler.filter((k) => k.planInfo.key === 'yillik').length;
    const paid = enrichedKresler.filter((k) => ['aylik', 'yillik'].includes(k.planInfo.key)).length;

    const expired = enrichedKresler.filter((k) => k.subStatus.key === 'expired').length;
    const critical = enrichedKresler.filter((k) => k.subStatus.key === 'critical').length;
    const expiring30 = enrichedKresler.filter((k) => ['critical', 'expiring'].includes(k.subStatus.key)).length;

    const activeKres = enrichedKresler.filter((k) =>
      ['active', 'demo', 'critical', 'expiring'].includes(k.subStatus.key)
    ).length;

    const noManager = enrichedKresler.filter((k) => k.managerCount === 0).length;
    const noTeacher = enrichedKresler.filter((k) => k.teacherCount === 0).length;
    const noChild = enrichedKresler.filter((k) => k.childCount === 0).length;

    const monthlyRevenue = enrichedKresler.reduce((sum, k) => {
      return sum + (Number(k.revenue.monthly) || 0);
    }, 0);

    return {
      totalKres: enrichedKresler.length,
      activeKres,
      demo,
      paid,
      monthly,
      yearly,
      expired,
      critical,
      expiring30,
      noManager,
      noTeacher,
      noChild,
      totalUser: kullanicilar.length,
      totalChild: cocuklar.length,
      totalClass: siniflar.length,
      totalTeacher: kullanicilar.filter((u) => normalizeRole(u.rol) === 'ogretmen').length,
      totalParent: kullanicilar.filter((u) => normalizeRole(u.rol) === 'veli').length,
      monthlyRevenue,
    };
  }, [enrichedKresler, kullanicilar, cocuklar, siniflar]);

  const locationStats = useMemo(() => {
    const map = {};

    enrichedKresler.forEach((kres) => {
      const label = `${kres.il || 'İl yok'} / ${kres.ilce || 'İlçe yok'}`;
      map[label] = (map[label] || 0) + 1;
    });

    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [enrichedKresler]);

  const warningList = useMemo(() => {
    const list = [];

    if (stats.expired > 0) {
      list.push({
        icon: '⛔',
        title: `${stats.expired} kurumun aboneliği bitmiş`,
        text: 'Bu kurumlar için yenileme veya pasifleştirme kontrolü yapılmalı.',
      });
    }

    if (stats.critical > 0) {
      list.push({
        icon: '⏰',
        title: `${stats.critical} kurum 7 gün içinde bitiyor`,
        text: 'Yakın takip ve ödeme hatırlatma yapılmalı.',
      });
    }

    if (stats.noManager > 0) {
      list.push({
        icon: '👤',
        title: `${stats.noManager} kurumda yönetici yok`,
        text: 'Kurum admini olmadan yönetim akışı eksik kalır.',
      });
    }

    if (stats.noTeacher > 0) {
      list.push({
        icon: '👩‍🏫',
        title: `${stats.noTeacher} kurumda öğretmen yok`,
        text: 'Pilot kullanım için en az bir öğretmen eklenmeli.',
      });
    }

    if (stats.noChild > 0) {
      list.push({
        icon: '🧒',
        title: `${stats.noChild} kurumda çocuk kaydı yok`,
        text: 'Kurum onboarding tamamlanmamış olabilir.',
      });
    }

    return list;
  }, [stats]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.blue} />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerKicker}>YUMURCAK PLATFORM</Text>
                <Text style={styles.headerTitle}>Süper Admin</Text>
                <Text style={styles.headerSub}>
                  {kullanici?.ad || kullanici?.kullaniciAdi || 'Platform Sahibi'}
                </Text>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
                <Text style={styles.logoutText}>Çıkış</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              activeOpacity={0.86}
              onPress={() => navigation.navigate('SuperAdminKresCreate')}
            >
              <View style={styles.buttonTextWrap}>
                <Text style={styles.createTitle}>+ Yeni Kreş Ekle</Text>
                <Text style={styles.createDesc}>Kurum + yönetici hesabı + demo abonelik oluştur</Text>
              </View>
              <Text style={styles.createArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.indexButton}
              activeOpacity={0.86}
              onPress={() => navigation.navigate('SuperAdminIndexMigration')}
            >
              <View style={styles.buttonTextWrap}>
                <Text style={styles.indexTitle}>Firebase Index / Veri Düzeni</Text>
                <Text style={styles.indexDesc}>Kreş, kullanıcı, çocuk ve mesaj indexlerini oluştur</Text>
              </View>
              <Text style={styles.indexArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.hero}>
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>Genel Durum</Text>
                <Text style={styles.heroTitle}>{stats.totalKres} kurum takipte</Text>
                <Text style={styles.heroDesc}>
                  Aktif/demo: {stats.activeKres} · Ücretli: {stats.paid} · Biten: {stats.expired}
                </Text>
                <Text style={styles.heroMoney}>Tahmini aylık gelir: {formatMoney(stats.monthlyRevenue)}</Text>
              </View>
              <Text style={styles.heroIcon}>📊</Text>
            </View>

            <Text style={styles.sectionTitle}>Platform İstatistikleri</Text>
            <View style={styles.grid}>
              <StatCard label="Kurum" value={stats.totalKres} color={COLORS.blue} icon="🏫" />
              <StatCard label="Aktif" value={stats.activeKres} color={COLORS.green} icon="✅" />
              <StatCard label="Öğrenci" value={stats.totalChild} color={COLORS.orange} icon="🧒" />
              <StatCard label="Kullanıcı" value={stats.totalUser} color={COLORS.purple} icon="👥" />
              <StatCard label="Öğretmen" value={stats.totalTeacher} color={COLORS.pink} icon="👩‍🏫" />
              <StatCard label="Veli" value={stats.totalParent} color={COLORS.cyan} icon="👨‍👩‍👧" />
            </View>

            <Text style={styles.sectionTitle}>Abonelik Takibi</Text>
            <View style={styles.statusGrid}>
              <MiniStatus label="Demo" value={stats.demo} color={COLORS.blue} />
              <MiniStatus label="Ücretli" value={stats.paid} color={COLORS.green} />
              <MiniStatus label="Aylık" value={stats.monthly} color={COLORS.orange} />
              <MiniStatus label="Yıllık" value={stats.yearly} color={COLORS.purple} />
              <MiniStatus label="7 gün" value={stats.critical} color={COLORS.red} />
              <MiniStatus label="30 gün" value={stats.expiring30} color={COLORS.orange} />
              <MiniStatus label="Biten" value={stats.expired} color={COLORS.red} />
              <MiniStatus label="Gelir" value={formatMoneyShort(stats.monthlyRevenue)} color={COLORS.green} />
            </View>

            {warningList.length > 0 && (
              <View style={styles.warningPanel}>
                <Text style={styles.warningTitle}>⚠️ Takip Gerekenler</Text>

                {warningList.map((item, index) => (
                  <View key={`${item.title}-${index}`} style={styles.warningRow}>
                    <Text style={styles.warningIcon}>{item.icon}</Text>
                    <View style={styles.warningBody}>
                      <Text style={styles.warningRowTitle}>{item.title}</Text>
                      <Text style={styles.warningText}>{item.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

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
        renderItem={({ item }) => (
          <KresCard
            item={item}
            onPress={() => navigation.navigate('SuperAdminKresDetail', { kresId: item.id, kres: item })}
          />
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

function KresCard({ item, onPress }) {
  const endDate =
    item.abonelik?.bitisTarihi ||
    item.abonelik?.bitis ||
    item.abonelik?.endDate ||
    item.abonelik?.expiresAt;

  const startDate =
    item.abonelik?.baslangicTarihi ||
    item.abonelik?.baslangic ||
    item.abonelik?.startDate;

  return (
    <TouchableOpacity activeOpacity={0.86} style={styles.kresCard} onPress={onPress}>
      <View style={styles.kresTop}>
        <View style={styles.kresTitleWrap}>
          <Text style={styles.kresName}>{getKresName(item)}</Text>
          <Text style={styles.kresLocation}>
            {item.il || 'İl yok'} / {item.ilce || 'İlçe yok'}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: item.subStatus.bg }]}>
          <Text style={[styles.badgeText, { color: item.subStatus.color }]}>
            {item.subStatus.label}
          </Text>
        </View>
      </View>

      <Text style={styles.kresAddress} numberOfLines={2}>
        📍 {item.contactAddress || 'Adres girilmemiş'}
      </Text>

      <View style={styles.contactBox}>
        <Text style={styles.contactText}>☎️ {item.contactPhone || 'Telefon yok'}</Text>
        <Text style={styles.contactText}>✉️ {item.contactEmail || 'E-posta yok'}</Text>
        <Text style={styles.contactText}>👤 {item.managerName || `${item.managerCount} yönetici`}</Text>
      </View>

      <View style={styles.subBox}>
        <View>
          <Text style={styles.subLabel}>Plan</Text>
          <Text style={styles.subValue}>{item.planInfo.label}</Text>
        </View>

        <View>
          <Text style={styles.subLabel}>Başlangıç</Text>
          <Text style={styles.subValue}>{formatDate(startDate)}</Text>
        </View>

        <View>
          <Text style={styles.subLabel}>Bitiş</Text>
          <Text style={styles.subValue}>{formatDate(endDate)}</Text>
        </View>

        <View>
          <Text style={styles.subLabel}>Kalan</Text>
          <Text style={[styles.subValue, { color: getRemainingColor(item.kalanGun) }]}>
            {item.kalanGun === null ? '-' : `${item.kalanGun}g`}
          </Text>
        </View>
      </View>

      <View style={styles.kresStats}>
        <SmallInfo label="Çocuk" value={item.childCount} />
        <SmallInfo label="Öğretmen" value={item.teacherCount} />
        <SmallInfo label="Veli" value={item.parentCount} />
        <SmallInfo label="Sınıf" value={item.classCount} />
      </View>

      <Text style={styles.detailHint}>Detayları görüntüle ›</Text>
    </TouchableOpacity>
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

function belongsToKres(item = {}, kresId) {
  if (!item || !kresId) return false;
  return String(item.kresId || item.kresID || item.kurumId || item.kres || '') === String(kresId);
}

function normalizeSubscription(rawSub, kres = {}) {
  const embedded = kres.abonelik || kres.subscription || {};

  return {
    ...embedded,
    ...(rawSub || {}),
    plan:
      rawSub?.plan ||
      rawSub?.paket ||
      embedded.plan ||
      embedded.paket ||
      kres.abonelikPlan ||
      kres.plan ||
      kres.paket ||
      kres.demoPlan,
    durum:
      rawSub?.durum ||
      rawSub?.status ||
      embedded.durum ||
      embedded.status ||
      kres.abonelikDurum ||
      kres.status ||
      kres.durum,
    baslangicTarihi:
      rawSub?.baslangicTarihi ||
      rawSub?.baslangic ||
      rawSub?.startDate ||
      embedded.baslangicTarihi ||
      embedded.baslangic ||
      embedded.startDate ||
      kres.abonelikBaslangic ||
      kres.demoBaslangicTarihi,
    bitisTarihi:
      rawSub?.bitisTarihi ||
      rawSub?.bitis ||
      rawSub?.endDate ||
      rawSub?.expiresAt ||
      embedded.bitisTarihi ||
      embedded.bitis ||
      embedded.endDate ||
      embedded.expiresAt ||
      kres.abonelikBitis ||
      kres.demoBitisTarihi ||
      kres.demoBitis,
    fiyat:
      rawSub?.fiyat ||
      rawSub?.price ||
      rawSub?.tutar ||
      embedded.fiyat ||
      embedded.price ||
      embedded.tutar ||
      kres.abonelikFiyat,
    demoMu: rawSub?.demoMu ?? embedded.demoMu ?? kres.demoMu,
  };
}

function normalizeRole(role) {
  return String(role || '')
    .toLowerCase()
    .replace(/ö/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c');
}

function isManager(user = {}) {
  const role = normalizeRole(user.rol);
  return role.includes('yonetici') || role.includes('admin');
}

function getKresName(kres = {}) {
  return kres.ad || kres.kresAdi || kres.kurumAdi || kres.name || 'İsimsiz Kreş';
}

function getRemainingDays(sub = {}) {
  const end = sub.bitisTarihi || sub.bitis || sub.endDate || sub.expiresAt;
  if (!end) return null;

  const endMs = typeof end === 'number' ? end : new Date(String(end)).getTime();
  if (!endMs || Number.isNaN(endMs)) return null;

  return Math.ceil((endMs - Date.now()) / 86400000);
}

function getSubscriptionStatus(sub = {}) {
  const durum = String(sub.durum || sub.status || '').toLowerCase();
  const plan = String(sub.plan || sub.paket || '').toLowerCase();
  const kalan = getRemainingDays(sub);

  if (!sub || Object.keys(sub).length === 0) {
    return { key: 'none', label: 'Yok', color: COLORS.muted, bg: '#263244' };
  }

  if (kalan !== null && kalan < 0) {
    return { key: 'expired', label: 'Bitti', color: COLORS.red, bg: '#3A1F2A' };
  }

  if (kalan !== null && kalan <= 7) {
    return { key: 'critical', label: 'Kritik', color: COLORS.red, bg: '#3A1F2A' };
  }

  if (kalan !== null && kalan <= 30) {
    return { key: 'expiring', label: 'Bitiyor', color: COLORS.orange, bg: '#3A2E1F' };
  }

  if (durum.includes('pasif') || durum.includes('iptal') || durum.includes('inactive')) {
    return { key: 'expired', label: 'Pasif', color: COLORS.red, bg: '#3A1F2A' };
  }

  if (durum.includes('demo') || plan.includes('demo') || sub.demoMu === true) {
    return { key: 'demo', label: 'Demo', color: COLORS.blue, bg: '#15324A' };
  }

  return { key: 'active', label: 'Aktif', color: COLORS.green, bg: '#12351F' };
}

function getPlanInfo(sub = {}) {
  const raw = String(sub.plan || sub.paket || sub.type || '').toLowerCase();

  if (raw.includes('yillik') || raw.includes('yıllık') || raw.includes('year')) {
    return { key: 'yillik', label: 'Yıllık' };
  }

  if (raw.includes('aylik') || raw.includes('aylık') || raw.includes('month')) {
    return { key: 'aylik', label: 'Aylık' };
  }

  if (raw.includes('demo') || sub.demoMu === true) {
    return { key: 'demo', label: 'Demo' };
  }

  if (raw.includes('ucretsiz') || raw.includes('ücretsiz')) {
    return { key: 'ucretsiz', label: 'Ücretsiz' };
  }

  return { key: raw || 'belirsiz', label: raw ? capitalize(raw) : 'Belirsiz' };
}

function getEstimatedRevenue(sub = {}) {
  const plan = getPlanInfo(sub);
  const price = Number(sub.fiyat || sub.price || sub.tutar || 0);

  if (plan.key === 'aylik') {
    return { monthly: price || MONTHLY_PRICE };
  }

  if (plan.key === 'yillik') {
    return { monthly: Math.round((price || YEARLY_PRICE) / 12) };
  }

  return { monthly: 0 };
}

function getRemainingColor(days) {
  if (days === null) return COLORS.muted;
  if (days < 0) return COLORS.red;
  if (days <= 7) return COLORS.red;
  if (days <= 30) return COLORS.orange;
  return COLORS.green;
}

function formatDate(value) {
  if (!value) return '-';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})[-.](\d{2})[-.](\d{2})/);

    if (match) {
      return `${match[3]}.${match[2]}.${match[1]}`;
    }
  }

  const d = new Date(typeof value === 'number' ? value : String(value));

  if (Number.isNaN(d.getTime())) {
    return '-';
  }

  return d.toLocaleDateString('tr-TR');
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!amount) return '0 TL';
  return `${amount.toLocaleString('tr-TR')} TL`;
}

function formatMoneyShort(value) {
  const amount = Number(value || 0);
  if (!amount) return '0';

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`;
  }

  return String(amount);
}

function capitalize(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  content: {
    padding: 16,
    paddingBottom: 42,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 12,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerKicker: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  headerSub: {
    color: COLORS.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#3A1F2A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  logoutText: {
    color: COLORS.red,
    fontWeight: '900',
  },
  createButton: {
    backgroundColor: '#0B2942',
    borderWidth: 1,
    borderColor: '#1D4E73',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonTextWrap: {
    flex: 1,
  },
  createTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
  },
  createDesc: {
    color: COLORS.soft,
    marginTop: 4,
    fontWeight: '700',
  },
  createArrow: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 30,
    marginLeft: 12,
  },
  indexButton: {
    backgroundColor: '#221B3A',
    borderWidth: 1,
    borderColor: '#51418A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indexTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 17,
  },
  indexDesc: {
    color: COLORS.soft,
    marginTop: 4,
    fontWeight: '700',
  },
  indexArrow: {
    color: COLORS.purple,
    fontWeight: '900',
    fontSize: 30,
    marginLeft: 12,
  },
  hero: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: {
    flex: 1,
  },
  heroLabel: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 12,
  },
  heroTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 24,
    marginTop: 4,
  },
  heroDesc: {
    color: COLORS.muted,
    fontWeight: '700',
    marginTop: 5,
  },
  heroMoney: {
    color: COLORS.green,
    fontWeight: '900',
    marginTop: 7,
  },
  heroIcon: {
    fontSize: 44,
    marginLeft: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
  },
  statIcon: {
    fontSize: 23,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
  },
  statLabel: {
    color: COLORS.text,
    fontWeight: '900',
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  miniStatus: {
    width: '23%',
    minWidth: 72,
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  miniValue: {
    fontSize: 21,
    fontWeight: '900',
  },
  miniLabel: {
    color: COLORS.muted,
    fontWeight: '800',
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  warningPanel: {
    backgroundColor: '#2A1F12',
    borderWidth: 1,
    borderColor: '#7C4A12',
    borderRadius: 20,
    padding: 15,
    marginBottom: 14,
  },
  warningTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 8,
  },
  warningRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#51310F',
  },
  warningIcon: {
    width: 30,
    fontSize: 22,
  },
  warningBody: {
    flex: 1,
  },
  warningRowTitle: {
    color: COLORS.text,
    fontWeight: '900',
  },
  warningText: {
    color: '#FCD9A1',
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 19,
  },
  section: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  locationLabel: {
    color: COLORS.soft,
    fontWeight: '800',
    flex: 1,
  },
  locationCount: {
    color: COLORS.blue,
    fontWeight: '900',
  },
  emptyText: {
    color: COLORS.muted,
    fontWeight: '700',
    lineHeight: 20,
  },
  emptyPanel: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 19,
    marginTop: 8,
  },
  kresCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  kresTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  kresTitleWrap: {
    flex: 1,
  },
  kresName: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 19,
  },
  kresLocation: {
    color: COLORS.muted,
    fontWeight: '800',
    marginTop: 3,
  },
  kresAddress: {
    color: COLORS.soft,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: {
    fontWeight: '900',
    fontSize: 12,
  },
  contactBox: {
    backgroundColor: '#0F1A2A',
    borderWidth: 1,
    borderColor: '#243244',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    gap: 5,
  },
  contactText: {
    color: COLORS.soft,
    fontWeight: '800',
    fontSize: 12,
  },
  subBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111A2B',
    borderWidth: 1,
    borderColor: '#26354A',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  subLabel: {
    color: COLORS.muted,
    fontWeight: '800',
    fontSize: 10,
    textAlign: 'center',
  },
  subValue: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  kresStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallInfo: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  smallValue: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
  },
  smallLabel: {
    color: COLORS.muted,
    fontWeight: '800',
    fontSize: 11,
    marginTop: 2,
  },
  detailHint: {
    color: COLORS.blue,
    fontWeight: '900',
    textAlign: 'right',
    marginTop: 12,
  },
});
