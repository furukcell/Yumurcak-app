// ============================================================
// YUMURCAK — SuperAdminKresDetailScreen.js
// SuperAdmin kurum detay / abonelik / iletişim / kullanıcı özeti
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  softCard: '#162033',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
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

export default function SuperAdminKresDetailScreen({ navigation, route }) {
  const kresId = route?.params?.kresId;
  const initialKres = route?.params?.kres || {};

  const [loading, setLoading] = useState(true);
  const [kres, setKres] = useState(initialKres);
  const [users, setUsers] = useState([]);
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subscription, setSubscription] = useState({});

  const loadData = useCallback(async () => {
    if (!kresId) {
      setLoading(false);
      return;
    }

    try {
      const [kresSnap, userSnap, childSnap, classSnap, subSnap] = await Promise.all([
        get(ref(database, `kresler/${kresId}`)),
        get(ref(database, 'kullanicilar')),
        get(ref(database, 'cocuklar')),
        get(ref(database, 'siniflar')),
        get(ref(database, `abonelikler/${kresId}`)),
      ]);

      const kresData = { id: kresId, ...(kresSnap.val() || initialKres) };

      const allUsers = Object.entries(userSnap.val() || {})
        .map(([id, val]) => ({ id, uid: id, ...val }))
        .filter((u) => belongsToKres(u, kresId));

      const allChildren = Object.entries(childSnap.val() || {})
        .map(([id, val]) => ({ id, ...val }))
        .filter((c) => belongsToKres(c, kresId));

      const allClasses = Object.entries(classSnap.val() || {})
        .map(([id, val]) => ({ id, ...val }))
        .filter((s) => belongsToKres(s, kresId));

      setKres(kresData);
      setUsers(allUsers);
      setChildren(allChildren);
      setClasses(allClasses);
      setSubscription(normalizeSubscription(subSnap.val(), kresData));
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Kreş detayları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [kresId, initialKres]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupedUsers = useMemo(() => {
    const managers = users.filter((u) => isManager(u));
    const teachers = users.filter((u) => normalizeRole(u.rol) === 'ogretmen');
    const parents = users.filter((u) => normalizeRole(u.rol) === 'veli');
    const others = users.filter((u) => {
      const role = normalizeRole(u.rol);
      return !isManager(u) && role !== 'ogretmen' && role !== 'veli';
    });

    return {
      managers,
      teachers,
      parents,
      others,
    };
  }, [users]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => isActiveValue(u.aktif ?? u.active ?? u.durum)).length;
    const passiveUsers = users.length - activeUsers;

    const activeChildren = children.filter((c) => isActiveValue(c.aktif ?? c.active ?? c.durum)).length;
    const passiveChildren = children.length - activeChildren;

    return {
      manager: groupedUsers.managers.length,
      teacher: groupedUsers.teachers.length,
      parent: groupedUsers.parents.length,
      otherUser: groupedUsers.others.length,
      user: users.length,
      activeUser: activeUsers,
      passiveUser: passiveUsers,
      child: children.length,
      activeChild: activeChildren,
      passiveChild: passiveChildren,
      classCount: classes.length,
    };
  }, [users, children, classes, groupedUsers]);

  const subInfo = useMemo(() => {
    const remaining = getRemainingDays(subscription);
    const status = getSubscriptionStatus(subscription);
    const plan = getPlanInfo(subscription);
    const revenue = getEstimatedRevenue(subscription);

    return {
      remaining,
      status,
      plan,
      revenue,
      start: subscription.baslangicTarihi || subscription.baslangic || subscription.startDate || subscription.createdAt,
      end: subscription.bitisTarihi || subscription.bitis || subscription.endDate || subscription.expiresAt,
    };
  }, [subscription]);

  const alerts = useMemo(() => buildAlerts({ kres, stats, subInfo }), [kres, stats, subInfo]);

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.backText}>‹ Geri</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Kreş Detayı</Text>
            <Text style={styles.headerSubtitle}>SuperAdmin kurum kartı</Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={loadData} activeOpacity={0.85}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{subInfo.plan.label}</Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: `${subInfo.status.color}22`, borderColor: `${subInfo.status.color}66` }]}>
              <Text style={[styles.statusPillText, { color: subInfo.status.color }]}>{subInfo.status.label}</Text>
            </View>
          </View>

          <Text style={styles.kicker}>KREŞ PROFİLİ</Text>
          <Text style={styles.kresName}>{getKresName(kres)}</Text>
          <Text style={styles.location}>{safeText(kres.il, 'İl yok')} / {safeText(kres.ilce, 'İlçe yok')}</Text>
          <Text style={styles.address}>{safeText(kres.adres || kres.adress || kres.address, 'Adres girilmemiş')}</Text>

          <View style={styles.quickActions}>
            <QuickAction label="Ara" icon="☎️" value={kres.telefon || kres.phone} onPress={() => openPhone(kres.telefon || kres.phone)} />
            <QuickAction label="E-posta" icon="✉️" value={kres.email || kres.eposta} onPress={() => openEmail(kres.email || kres.eposta)} />
            <QuickAction label="Harita" icon="📍" value={kres.adres || kres.address} onPress={() => openMaps(kres.adres || kres.address)} />
          </View>
        </View>

        <View style={styles.grid}>
          <Stat label="Çocuk" value={stats.child} color={THEME.green} sub={`${stats.activeChild} aktif`} />
          <Stat label="Öğretmen" value={stats.teacher} color={THEME.purple} sub="Bağlı personel" />
          <Stat label="Veli" value={stats.parent} color={THEME.orange} sub="Kayıtlı veli" />
          <Stat label="Sınıf" value={stats.classCount} color={THEME.blue} sub="Aktif sınıf" />
          <Stat label="Yönetici" value={stats.manager} color={THEME.cyan} sub="Kurum admini" />
          <Stat label="Kullanıcı" value={stats.user} color={THEME.pink} sub={`${stats.activeUser} aktif`} />
        </View>

        {alerts.length > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.sectionTitle}>⚠️ Uyarılar</Text>
            {alerts.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.alertRow}>
                <Text style={styles.alertIcon}>{item.icon}</Text>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>{item.title}</Text>
                  <Text style={styles.alertText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Abonelik Özeti</Text>
            <Text style={[styles.sectionTag, { color: subInfo.status.color }]}>{subInfo.status.label}</Text>
          </View>

          <InfoRow label="Plan" value={subInfo.plan.label} />
          <InfoRow label="Durum" value={subInfo.status.label} valueColor={subInfo.status.color} />
          <InfoRow label="Kalan Gün" value={subInfo.remaining === null ? '-' : `${subInfo.remaining} gün`} valueColor={getRemainingColor(subInfo.remaining)} />
          <InfoRow label="Başlangıç" value={formatDate(subInfo.start)} />
          <InfoRow label="Bitiş" value={formatDate(subInfo.end)} />
          <InfoRow label="Fiyat" value={formatMoney(subscription.fiyat || subscription.price || subscription.tutar)} />
          <InfoRow label="Tahmini Aylık Gelir" value={formatMoney(subInfo.revenue.monthly)} valueColor={THEME.green} />
          <InfoRow label="Son Ödeme" value={formatDate(subscription.sonOdemeTarihi || subscription.lastPaymentDate)} />
          <InfoRow label="Not" value={subscription.not || subscription.note || '-'} multiline />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kurum İletişim Bilgileri</Text>
          <InfoRow label="Kurum Adı" value={getKresName(kres)} />
          <InfoRow label="Telefon" value={kres.telefon || kres.phone || '-'} />
          <InfoRow label="E-posta" value={kres.email || kres.eposta || '-'} />
          <InfoRow label="İl / İlçe" value={`${safeText(kres.il, '-')  } / ${safeText(kres.ilce, '-')}`} />
          <InfoRow label="Adres" value={kres.adres || kres.address || '-'} multiline />
          <InfoRow label="Web" value={kres.website || kres.web || '-'} />
          <InfoRow label="Vergi No" value={kres.vergiNo || kres.taxNo || '-'} />
          <InfoRow label="Yetkili" value={kres.yetkiliAd || kres.yoneticiAd || kres.kurumYetkilisi || '-'} />
          <InfoRow label="Yetkili Telefon" value={kres.yetkiliTelefon || kres.yoneticiTelefon || '-'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kurum Sağlığı</Text>
          <HealthRow label="Yönetici" ok={stats.manager > 0} good="Yönetici tanımlı" bad="Yönetici yok" />
          <HealthRow label="Öğretmen" ok={stats.teacher > 0} good="Öğretmen var" bad="Öğretmen yok" />
          <HealthRow label="Veli" ok={stats.parent > 0} good="Veli var" bad="Veli yok" />
          <HealthRow label="Çocuk" ok={stats.child > 0} good="Çocuk kaydı var" bad="Çocuk kaydı yok" />
          <HealthRow label="Sınıf" ok={stats.classCount > 0} good="Sınıf var" bad="Sınıf yok" />
        </View>

        <TouchableOpacity
          style={styles.bulkOnboardingButton}
          onPress={() => navigation.navigate('SuperAdminKresBulkOnboarding', { kresId: kres.id, kresAdi: kres.ad })}
          activeOpacity={0.85}
        >
          <Text style={styles.bulkOnboardingButtonText}>+ Sınıf / Öğretmen / Veli / Öğrenci Toplu Ekle</Text>
        </TouchableOpacity>

        <UserSection title="Yöneticiler" users={groupedUsers.managers} empty="Bu kreşe bağlı yönetici yok." badge="Yönetici" badgeColor={THEME.blue} />
        <UserSection title="Öğretmenler" users={groupedUsers.teachers} empty="Bu kreşe bağlı öğretmen yok." badge="Öğretmen" badgeColor={THEME.purple} />
        <UserSection title="Veliler" users={groupedUsers.parents} empty="Bu kreşe bağlı veli yok." badge="Veli" badgeColor={THEME.orange} limit={12} />
        <ClassSection classes={classes} />
        <ChildSection children={children} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color, sub }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function InfoRow({ label, value, valueColor, multiline }) {
  return (
    <View style={[styles.infoRow, multiline ? styles.infoRowTop : null]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline ? styles.infoValueMultiline : null, valueColor ? { color: valueColor } : null]}>
        {safeText(value, '-')}
      </Text>
    </View>
  );
}

function HealthRow({ label, ok, good, bad }) {
  return (
    <View style={styles.healthRow}>
      <View>
        <Text style={styles.healthLabel}>{label}</Text>
        <Text style={styles.healthText}>{ok ? good : bad}</Text>
      </View>
      <Text style={[styles.healthBadge, ok ? styles.healthOk : styles.healthBad]}>
        {ok ? 'Tamam' : 'Eksik'}
      </Text>
    </View>
  );
}

function QuickAction({ icon, label, value, onPress }) {
  const disabled = !value;

  return (
    <TouchableOpacity
      style={[styles.quickAction, disabled ? styles.quickActionDisabled : null]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function UserSection({ title, users, empty, badge, badgeColor, limit }) {
  const shownUsers = typeof limit === 'number' ? users.slice(0, limit) : users;
  const hiddenCount = typeof limit === 'number' ? Math.max(users.length - limit, 0) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.countTag}>{users.length}</Text>
      </View>

      {users.length === 0 ? (
        <Text style={styles.emptyText}>{empty}</Text>
      ) : (
        shownUsers.map((u) => (
          <View key={u.id} style={styles.userRow}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{getUserName(u)}</Text>
              <Text style={styles.userMeta}>{u.email || u.kullaniciAdi || u.telefon || u.id}</Text>
              {!!u.telefon && <Text style={styles.userMeta}>☎️ {u.telefon}</Text>}
            </View>
            <Text style={[styles.roleBadge, { color: badgeColor, backgroundColor: `${badgeColor}22` }]}>{badge}</Text>
          </View>
        ))
      )}

      {hiddenCount > 0 && (
        <Text style={styles.moreText}>+{hiddenCount} kayıt daha var</Text>
      )}
    </View>
  );
}

function ClassSection({ classes }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sınıflar</Text>
        <Text style={styles.countTag}>{classes.length}</Text>
      </View>

      {classes.length === 0 ? (
        <Text style={styles.emptyText}>Bu kreşe bağlı sınıf yok.</Text>
      ) : (
        classes.map((s) => (
          <View key={s.id} style={styles.simpleRow}>
            <View>
              <Text style={styles.simpleTitle}>{s.ad || s.sinifAdi || s.name || 'İsimsiz Sınıf'}</Text>
              <Text style={styles.simpleMeta}>
                {safeText(s.yasGrubu || s.ageGroup || s.aciklama, 'Yaş grubu bilgisi yok')}
              </Text>
            </View>
            <Text style={styles.simpleBadge}>{isActiveValue(s.aktif ?? s.active ?? s.durum) ? 'Aktif' : 'Pasif'}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function ChildSection({ children }) {
  const shownChildren = children.slice(0, 12);
  const hiddenCount = Math.max(children.length - shownChildren.length, 0);

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Çocuklar</Text>
        <Text style={styles.countTag}>{children.length}</Text>
      </View>

      {children.length === 0 ? (
        <Text style={styles.emptyText}>Bu kreşe bağlı çocuk kaydı yok.</Text>
      ) : (
        shownChildren.map((c) => (
          <View key={c.id} style={styles.simpleRow}>
            <View>
              <Text style={styles.simpleTitle}>{getChildName(c)}</Text>
              <Text style={styles.simpleMeta}>{safeText(c.sinifAdi || c.sinifAd || c.sinifId, 'Sınıf bilgisi yok')}</Text>
            </View>
            <Text style={styles.simpleBadge}>{isActiveValue(c.aktif ?? c.active ?? c.durum) ? 'Aktif' : 'Pasif'}</Text>
          </View>
        ))
      )}

      {hiddenCount > 0 && (
        <Text style={styles.moreText}>+{hiddenCount} çocuk daha var</Text>
      )}
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
    plan: rawSub?.plan || rawSub?.paket || embedded.plan || embedded.paket || kres.abonelikPlan || kres.plan || kres.paket || kres.demoPlan,
    durum: rawSub?.durum || rawSub?.status || embedded.durum || embedded.status || kres.abonelikDurum || kres.status || kres.durum,
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
    fiyat: rawSub?.fiyat || rawSub?.price || rawSub?.tutar || embedded.fiyat || embedded.price || embedded.tutar || kres.abonelikFiyat,
  };
}

function normalizeRole(role) {
  const text = String(role || '')
    .toLowerCase()
    .replace('ö', 'o')
    .replace('ğ', 'g')
    .replace('ı', 'i')
    .replace('ü', 'u')
    .replace('ş', 's')
    .replace('ç', 'c');

  if (text.includes('super')) return 'superadmin';
  if (text.includes('yonetici') || text.includes('admin')) return 'yonetici';
  if (text.includes('ogretmen')) return 'ogretmen';
  if (text.includes('veli') || text.includes('parent')) return 'veli';
  return text || 'diger';
}

function isManager(user = {}) {
  const role = normalizeRole(user.rol);
  return role === 'yonetici' || role === 'admin';
}

function isActiveValue(value) {
  if (value === false) return false;
  if (value === true) return true;

  const text = String(value || '').toLowerCase();
  if (!text) return true;
  if (text.includes('pasif') || text.includes('inactive') || text.includes('silindi') || text.includes('kapali')) return false;
  return true;
}

function getKresName(kres = {}) {
  return kres.ad || kres.kresAdi || kres.kurumAdi || kres.name || 'İsimsiz Kreş';
}

function getUserName(user = {}) {
  const fullName = `${user.ad || user.isim || ''} ${user.soyad || ''}`.trim();
  return fullName || user.adSoyad || user.name || user.kullaniciAdi || user.email || user.id || 'İsimsiz Kullanıcı';
}

function getChildName(child = {}) {
  const fullName = `${child.ad || child.isim || ''} ${child.soyad || ''}`.trim();
  return fullName || child.adSoyad || child.name || child.cocukAdi || child.id || 'İsimsiz Çocuk';
}

function getRemainingDays(sub = {}) {
  const end = sub.bitisTarihi || sub.bitis || sub.endDate || sub.expiresAt;
  if (!end) return null;

  const ms = typeof end === 'number' ? end : new Date(String(end)).getTime();
  if (!ms || Number.isNaN(ms)) return null;

  return Math.ceil((ms - Date.now()) / 86400000);
}

function getSubscriptionStatus(sub = {}) {
  const durum = String(sub.durum || sub.status || '').toLowerCase();
  const plan = String(sub.plan || sub.paket || '').toLowerCase();
  const kalan = getRemainingDays(sub);

  if (!sub || Object.keys(sub).length === 0) return { label: 'Abonelik Yok', color: THEME.muted };

  if (kalan !== null && kalan < 0) return { label: 'Süresi Bitti', color: THEME.red };
  if (kalan !== null && kalan <= 7) return { label: 'Kritik', color: THEME.red };
  if (kalan !== null && kalan <= 30) return { label: 'Bitiyor', color: THEME.orange };

  if (durum.includes('pasif') || durum.includes('iptal') || durum.includes('inactive')) {
    return { label: 'Pasif', color: THEME.red };
  }

  if (durum.includes('demo') || plan.includes('demo')) return { label: 'Demo', color: THEME.blue };
  if (durum.includes('aktif') || durum.includes('active') || kalan === null || kalan > 30) return { label: 'Aktif', color: THEME.green };

  return { label: 'Belirsiz', color: THEME.muted };
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
  if (days === null) return THEME.muted;
  if (days < 0) return THEME.red;
  if (days <= 7) return THEME.red;
  if (days <= 30) return THEME.orange;
  return THEME.green;
}

function buildAlerts({ kres, stats, subInfo }) {
  const list = [];

  if (subInfo.remaining !== null && subInfo.remaining < 0) {
    list.push({
      icon: '⛔',
      title: 'Abonelik süresi bitmiş',
      text: `${getKresName(kres)} için abonelik süresi geçmiş görünüyor.`,
    });
  } else if (subInfo.remaining !== null && subInfo.remaining <= 7) {
    list.push({
      icon: '⏰',
      title: 'Abonelik kritik sürede',
      text: `${subInfo.remaining} gün içinde abonelik bitiyor.`,
    });
  } else if (subInfo.remaining !== null && subInfo.remaining <= 30) {
    list.push({
      icon: '📌',
      title: 'Abonelik yakında bitecek',
      text: `${subInfo.remaining} gün kaldı. Takip edilmesi iyi olur.`,
    });
  }

  if (stats.manager === 0) {
    list.push({
      icon: '👤',
      title: 'Yönetici yok',
      text: 'Bu kuruma bağlı yönetici hesabı görünmüyor.',
    });
  }

  if (stats.teacher === 0) {
    list.push({
      icon: '👩‍🏫',
      title: 'Öğretmen yok',
      text: 'Kurumda öğretmen hesabı görünmüyor.',
    });
  }

  if (stats.child === 0) {
    list.push({
      icon: '🧒',
      title: 'Çocuk kaydı yok',
      text: 'Kurumda çocuk kaydı görünmüyor.',
    });
  }

  return list;
}

function formatDate(value) {
  if (!value) return '-';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})[-.](\d{2})[-.](\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
  }

  const d = new Date(typeof value === 'number' ? value : String(value));
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('tr-TR');
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!amount) return '-';

  return `${amount.toLocaleString('tr-TR')} TL`;
}

function safeText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return fallback;
  return String(value);
}

function capitalize(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function openPhone(phone) {
  if (!phone) return;

  const cleaned = String(phone).replace(/\s/g, '');
  const url = `tel:${cleaned}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error(error);
    Alert.alert('Açılamadı', 'Telefon uygulaması açılamadı.');
  }
}

async function openEmail(email) {
  if (!email) return;

  const url = `mailto:${email}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error(error);
    Alert.alert('Açılamadı', 'E-posta uygulaması açılamadı.');
  }
}

async function openMaps(address) {
  if (!address) return;

  const query = encodeURIComponent(String(address));
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?q=${query}`
    : `geo:0,0?q=${query}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error(error);
    Alert.alert('Açılamadı', 'Harita uygulaması açılamadı.');
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  content: {
    padding: 16,
    paddingBottom: 44,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 70,
  },
  bulkOnboardingButton: {
    backgroundColor: THEME.green,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  bulkOnboardingButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  backText: {
    color: THEME.blue,
    fontWeight: '900',
    fontSize: 16,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: THEME.text,
    fontWeight: '900',
    fontSize: 18,
  },
  headerSubtitle: {
    color: THEME.muted,
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: THEME.blue,
    fontWeight: '900',
    fontSize: 20,
  },
  hero: {
    backgroundColor: THEME.panel,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.line,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    backgroundColor: '#0B2942',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1D4E73',
  },
  heroBadgeText: {
    color: THEME.blue,
    fontWeight: '900',
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontWeight: '900',
    fontSize: 12,
  },
  kicker: {
    color: THEME.blue,
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 11,
    marginTop: 14,
  },
  kresName: {
    color: THEME.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 5,
  },
  location: {
    color: THEME.muted,
    fontWeight: '800',
    marginTop: 4,
  },
  address: {
    color: THEME.muted,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  quickAction: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.line,
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
  quickIcon: {
    fontSize: 20,
  },
  quickLabel: {
    color: THEME.text,
    fontWeight: '900',
    fontSize: 12,
    marginTop: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    color: THEME.text,
    fontWeight: '900',
    marginTop: 3,
  },
  statSub: {
    color: THEME.muted,
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },
  alertCard: {
    backgroundColor: '#2A1F12',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#7C4A12',
    marginBottom: 14,
  },
  alertRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#51310F',
  },
  alertIcon: {
    fontSize: 21,
    width: 30,
  },
  alertBody: {
    flex: 1,
  },
  alertTitle: {
    color: THEME.text,
    fontWeight: '900',
  },
  alertText: {
    color: '#FCD9A1',
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 19,
  },
  card: {
    backgroundColor: THEME.panel,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.line,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: THEME.text,
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 10,
  },
  sectionTag: {
    fontWeight: '900',
    fontSize: 12,
  },
  countTag: {
    color: THEME.blue,
    backgroundColor: '#0B2942',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  infoRowTop: {
    alignItems: 'flex-start',
  },
  infoLabel: {
    color: THEME.muted,
    fontWeight: '800',
    width: 120,
  },
  infoValue: {
    color: THEME.text,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  infoValueMultiline: {
    lineHeight: 20,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingVertical: 10,
  },
  healthLabel: {
    color: THEME.text,
    fontWeight: '900',
  },
  healthText: {
    color: THEME.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '900',
    fontSize: 12,
  },
  healthOk: {
    color: THEME.green,
    backgroundColor: '#12351F',
  },
  healthBad: {
    color: THEME.red,
    backgroundColor: '#3B1515',
  },
  emptyText: {
    color: THEME.muted,
    fontWeight: '700',
    lineHeight: 20,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: THEME.text,
    fontWeight: '900',
  },
  userMeta: {
    color: THEME.muted,
    fontWeight: '700',
    marginTop: 3,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '900',
    fontSize: 12,
  },
  moreText: {
    color: THEME.blue,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  simpleTitle: {
    color: THEME.text,
    fontWeight: '900',
  },
  simpleMeta: {
    color: THEME.muted,
    fontWeight: '700',
    marginTop: 3,
  },
  simpleBadge: {
    color: THEME.green,
    backgroundColor: '#12351F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '900',
    fontSize: 12,
  },
});
