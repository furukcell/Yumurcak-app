// ============================================================
// DashboardScreen.js
// FAZ 19: Fallback tam-tablo taraması kaldırıldı (veri sızıntısı düzeltmesi)
// Boş index artık "yüklenmedi" değil "0" olarak sayılıyor
// FAZ 20: Akordeon kategori kartları + sabit (pinned) Mesajlar/Bildirimler şeridi
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, StatusBar, Alert, LayoutAnimation, UIManager } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import ThemedBackground from '../../components/ThemedBackground';
import { useUnreadMessagesCount } from '../../utils/messageHelpers';
import { rebuildKresRealtimeIndexes } from '../../utils/realtimeIndexBackfill';
import { listenNotifications, isRead } from '../../services/notificationCenter';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  blue: '#3A7BFF',
  red: '#FF4D6D',
  teal: '#00B4D8',
  purple: '#8E44AD',
  gold: '#C98A00',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const backfillRunCache = new Set();

// Yönetim işlemleri artık 7 kategori altında akordeon kart olarak gruplanıyor.
// Her item: title, icon, screen (route adı) veya comingSoon:true (henüz ekranı yok).
const MENU_CATEGORIES = [
  {
    key: 'kurum',
    title: 'Kurum & Kişiler',
    subtitle: 'Sınıflar, öğretmenler, çocuklar, veliler',
    icon: '🏫',
    iconBg: '#EFE9FF',
    items: [
      { title: 'Sınıflar', icon: '🏫', screen: 'ClassList', color: THEME.blue },
      { title: 'Öğretmenler', icon: '👨‍🏫', screen: 'TeacherList', color: THEME.primary },
      { title: 'Çocuklar', icon: '👶', screen: 'ChildList', color: THEME.orange },
      { title: 'Veliler', icon: '👨‍👩‍👧', screen: 'VeliList', color: THEME.green },
      { title: 'Personel Görev Listesi', icon: '📋', screen: 'AdminMonthlyStaffTasks', color: THEME.primary },
      { title: 'Nöbet Çizelgesi', icon: '🗓️', screen: 'AdminMonthlyDutyRoster', color: THEME.red },
    ],
  },
  {
    key: 'iletisim',
    title: 'İletişim',
    subtitle: 'Mesajlar, duyurular, anketler',
    icon: '📣',
    iconBg: '#FFE9F2',
    items: [
      { title: 'Mesajlar', icon: '💬', screen: 'AdminMessages', color: THEME.primary, badgeKey: 'messages' },
      { title: 'Duyurular', icon: '📢', screen: 'AnnouncementList', color: THEME.red },
      { title: 'Anket Yönetimi', icon: '🗳️', screen: 'PollManagement', color: THEME.purple },
    ],
  },
  {
    key: 'program',
    title: 'Program & Takvim',
    subtitle: 'Ders, etkinlik, yemek, doğum günü',
    icon: '🗓️',
    iconBg: '#FFF4E0',
    items: [
      { title: 'Ders Programı', icon: '📅', screen: 'LessonScheduleList', color: THEME.purple },
      { title: 'Etkinlikler', icon: '🎉', screen: 'EventList', color: '#E67E22' },
      { title: 'Aylık Yemek Listesi', icon: '🍽️', screen: 'AdminMonthlyMeal', color: THEME.orange },
      { title: 'Doğum Günü Takvimi', icon: '🎂', screen: 'AdminBirthdayCalendar', color: THEME.orange },
    ],
  },
  {
    key: 'servis',
    title: 'Servis',
    subtitle: 'Servis listesi, araçlar, günlük durum',
    icon: '🚌',
    iconBg: '#E8F0FF',
    items: [
      { title: 'Servis Listesi', icon: '🚌', screen: 'AdminService', color: THEME.blue },
      { title: 'Servis Araçları', icon: '🚐', screen: 'AdminVehicleList', color: THEME.blue },
      { title: 'Servis Durumu', icon: '📊', screen: 'AdminServiceStats', color: THEME.blue },
    ],
  },
  {
    key: 'finans',
    title: 'Finans',
    subtitle: 'Ödemeler ve abonelik',
    icon: '💳',
    iconBg: '#E3F6FF',
    items: [
      { title: 'Ödemeler', icon: '💳', screen: 'PaymentList', color: THEME.teal },
      { title: 'Abonelik / Ödeme', icon: '💎', screen: 'Subscription', color: THEME.gold },
    ],
  },
  {
    key: 'muhasebe',
    title: 'Muhasebe',
    subtitle: 'Bordro, izin hakedişi, personel maliyeti',
    icon: '🧮',
    iconBg: '#FFEDE3',
    // NOT: Bu 5 kalemin henüz ekranı/route'u yok — "Yakında" olarak işaretli.
    items: [
      { title: 'Bordro Hesaplama', icon: '🧾', comingSoon: true },
      { title: 'İzin Yönetimi', icon: '🌴', comingSoon: true },
      { title: 'Personel Hakediş Takibi', icon: '📈', comingSoon: true },
      { title: 'Gider Takibi', icon: '📉', comingSoon: true },
      { title: 'Yıllık Maliyet Özeti', icon: '📋', comingSoon: true },
    ],
  },
  {
    key: 'medya',
    title: 'Medya & Raporlar',
    subtitle: 'Galeri ve istatistikler',
    icon: '📊',
    iconBg: '#E7F8EE',
    items: [
      { title: 'Galeri', icon: '🖼️', screen: 'AdminGallery', color: THEME.teal },
      { title: 'İstatistikler', icon: '📊', screen: 'AdminStatistics', color: THEME.blue },
    ],
  },
  {
    key: 'ayarlar',
    title: 'Ayarlar',
    subtitle: 'Kurum bilgileri, tema, zil',
    icon: '⚙️',
    iconBg: '#F3E9FF',
    items: [
      { title: 'Kurum Bilgileri', icon: '🏫', screen: 'InstitutionSettings', color: THEME.primaryDark },
      { title: 'Tema Ayarları', icon: '🎨', screen: 'ThemeSettings', color: THEME.purple },
      { title: 'Kurum Zili', icon: '🔔', screen: 'AdminBell', color: THEME.red },
    ],
  },
];

const OZET_ITEMS = [
  { key: 'sinifSayisi', label: 'Sınıf', icon: '🏫', color: THEME.blue },
  { key: 'cocukSayisi', label: 'Çocuk', icon: '👶', color: THEME.orange },
  { key: 'ogretmenSayisi', label: 'Öğretmen', icon: '👨‍🏫', color: THEME.primary },
  { key: 'veliSayisi', label: 'Veli', icon: '👨‍👩‍👧', color: THEME.green },
];

const EMPTY_STATS = {
  sinifSayisi: 0,
  cocukSayisi: 0,
  ogretmenSayisi: 0,
  veliSayisi: 0,
};

function hasSummaryCounts(data) {
  if (!data || typeof data !== 'object') return false;
  return ['sinifSayisi', 'cocukSayisi', 'ogretmenSayisi', 'veliSayisi'].some((key) => typeof data[key] === 'number');
}

function normalizeStats(data = {}) {
  return {
    sinifSayisi: Number(data.sinifSayisi || 0),
    cocukSayisi: Number(data.cocukSayisi || 0),
    ogretmenSayisi: Number(data.ogretmenSayisi || 0),
    veliSayisi: Number(data.veliSayisi || 0),
  };
}

// Boş/olmayan index artık 0 olarak sayılır — "yüklenmedi" varsayımı kaldırıldı
function countIndex(data) {
  if (!data || typeof data !== 'object') return 0;
  return Object.values(data).filter((value) => value !== false && value !== null).length;
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { kullanici, cikisYap } = useAuth();

  const [istatistik, setIstatistik] = useState(EMPTY_STATS);
  const [kresAdi, setKresAdi] = useState('Kurum');
  const [kresLogoUrl, setKresLogoUrl] = useState('');
  const [abonelik, setAbonelik] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acikKategori, setAcikKategori] = useState('kurum');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [kurumZiliUnread, setKurumZiliUnread] = useState(0);

  const kresId = kullanici?.kresId || 'kres001';
  const adminId = kullanici?.uid || kullanici?.id;
  const unreadMessages = useUnreadMessagesCount(adminId);

  useEffect(() => {
    if (!kullanici) return undefined;
    const off = listenNotifications(kullanici, (items) => {
      setUnreadNotifications(items.filter((x) => !isRead(x, kullanici)).length);
    });
    return () => off();
  }, [kullanici]);

  // Kurum Zili: veli tarafından bırakılan "kapıdayım / geliyorum" bildirimleri.
  // Okunmamış ve henüz tamamlanmamış kayıtlar rozet sayısını oluşturur.
  useEffect(() => {
    if (!kresId) return undefined;
    const off = onValue(ref(database, 'kurumZili'), (snap) => {
      const data = snap.val() || {};
      const count = Object.values(data).filter((item) => {
        if (!item || typeof item !== 'object') return false;
        const sameKres = !item.kresId || item.kresId === kresId || item.kurumId === kresId;
        if (!sameKres) return false;
        const okundu = !!(item.okundu || item.read);
        const tamamlandi = !!(item.tamamlandi || item.tamamlandı);
        return !okundu && !tamamlandi;
      }).length;
      setKurumZiliUnread(count);
    });
    return () => off();
  }, [kresId]);

  const kategoriAc = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAcikKategori((prev) => (prev === key ? null : key));
  };

  const itemeGit = (item) => {
    if (item.comingSoon) {
      Alert.alert('Yakında', `"${item.title}" özelliği yakında eklenecek.`);
      return;
    }
    navigation.navigate(item.screen);
  };

  useEffect(() => {
    if (!kresId || backfillRunCache.has(kresId)) return;
    backfillRunCache.add(kresId);
    rebuildKresRealtimeIndexes(kresId).catch((error) => {
      console.warn('Realtime index backfill çalıştırılamadı:', error?.message || error);
    });
  }, [kresId]);

  useEffect(() => {
    const kresUnsub = onValue(ref(database, `kresler/${kresId}`), (snap) => {
      const data = snap.val();
      if (data?.ad) setKresAdi(data.ad);
      setKresLogoUrl(data?.logoUrl || '');
    });

    const subUnsub = onValue(ref(database, `abonelikler/${kresId}`), (snap) => {
      setAbonelik(snap.val() || null);
    });

    let summaryActive = false;
    const indexCounts = {
      sinifSayisi: 0,
      cocukSayisi: 0,
      ogretmenSayisi: 0,
      veliSayisi: 0,
    };

    const publishIndexCounts = () => {
      if (summaryActive) return;
      setIstatistik({ ...indexCounts });
      setYukleniyor(false);
    };

    const summaryUnsub = onValue(ref(database, `kresOzetleri/${kresId}`), (snap) => {
      const data = snap.val();
      if (hasSummaryCounts(data)) {
        summaryActive = true;
        setIstatistik(normalizeStats(data));
        setYukleniyor(false);
        return;
      }

      summaryActive = false;
      publishIndexCounts();
    });

    const indexListeners = [
      ['sinifSayisi', `kresSiniflari/${kresId}`],
      ['cocukSayisi', `kresCocuklari/${kresId}`],
      ['ogretmenSayisi', `kresKullanicilari/${kresId}/ogretmenler`],
      ['veliSayisi', `kresKullanicilari/${kresId}/veliler`],
    ].map(([key, path]) => onValue(ref(database, path), (snap) => {
      indexCounts[key] = countIndex(snap.val());
      publishIndexCounts();
    }));

    return () => {
      kresUnsub();
      subUnsub();
      summaryUnsub();
      indexListeners.forEach((unsub) => unsub && unsub());
    };
  }, [kresId]);

  const adSoyad = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Yönetici';

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <TouchableOpacity style={styles.logoCircle} onPress={() => navigation.navigate('InstitutionSettings')} activeOpacity={0.85}>
                {kresLogoUrl ? (
                  <Image source={{ uri: kresLogoUrl }} style={styles.logoImage} />
                ) : (
                  <Text style={styles.logoEmoji}>🍼</Text>
                )}
              </TouchableOpacity>
              <View style={styles.topTitleBlock}>
                <Text style={styles.brandLabel} numberOfLines={1} ellipsizeMode="tail">YUMURCAK KREŞ</Text>
                <View style={styles.brandNamePill}><Text style={styles.appName} numberOfLines={1} ellipsizeMode="tail">{kresAdi}</Text></View>
                <Text style={styles.panelLabel} numberOfLines={1} ellipsizeMode="tail">Yönetim Paneli</Text>
              </View>
            </View>
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('AdminBell')} activeOpacity={0.82}>
                <Text style={styles.bellBtnIcon}>🛎️</Text>
                {kurumZiliUnread > 0 ? (
                  <View style={styles.bellBtnBadge}><Text style={styles.bellBtnBadgeText}>{kurumZiliUnread > 99 ? '99+' : kurumZiliUnread}</Text></View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cikisBtn} onPress={cikisYap} activeOpacity={0.8}><Text style={styles.cikisBtnText}>↩</Text></TouchableOpacity>
            </View>
          </View>

          {/* Sabit (pinned) Mesajlar / Bildirimler şeridi — her zaman en üstte */}
          <View style={styles.inboxStrip}>
            <TouchableOpacity style={styles.inboxItem} onPress={() => navigation.navigate('AdminMessages')} activeOpacity={0.8}>
              <Text style={styles.inboxEmoji}>💬</Text>
              <View style={styles.inboxTextBlock}>
                <Text style={styles.inboxTitle}>Mesajlar</Text>
                <Text style={styles.inboxSub}>{unreadMessages > 0 ? `${unreadMessages} yeni` : 'Güncel'}</Text>
              </View>
              {unreadMessages > 0 ? (
                <View style={styles.inboxCount}><Text style={styles.inboxCountText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View>
              ) : null}
            </TouchableOpacity>
            <View style={styles.inboxDivider} />
            <TouchableOpacity style={styles.inboxItem} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.8}>
              <Text style={styles.inboxEmoji}>🔔</Text>
              <View style={styles.inboxTextBlock}>
                <Text style={styles.inboxTitle}>Bildirimler</Text>
                <Text style={styles.inboxSub}>{unreadNotifications > 0 ? `${unreadNotifications} yeni` : 'Güncel'}</Text>
              </View>
              {unreadNotifications > 0 ? (
                <View style={styles.inboxCount}><Text style={styles.inboxCountText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text></View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeCard}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.welcomeGreeting}>Hoş Geldiniz 👋</Text>
              <Text style={styles.welcomeName} numberOfLines={1} ellipsizeMode="tail">{adSoyad}</Text>
              <Text style={styles.welcomeSub} numberOfLines={2} ellipsizeMode="tail">{getSubscriptionText(abonelik)}</Text>
            </View>
            <View style={styles.welcomeIcon}><Text style={styles.welcomeIconText}>👑</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Genel Özet</Text>
          {yukleniyor ? (
            <View style={styles.loadingBox}><ActivityIndicator color={THEME.primary} /></View>
          ) : (
            <View style={styles.ozetGrid}>
              {OZET_ITEMS.map((item) => (
                <View key={item.key} style={styles.ozetKart}>
                  <Text style={styles.ozetIcon}>{item.icon}</Text>
                  <Text style={[styles.ozetSayi, { color: item.color }]} numberOfLines={1}>{istatistik[item.key]}</Text>
                  <Text style={styles.ozetLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Yönetim İşlemleri</Text>
          {MENU_CATEGORIES.map((kategori) => {
            const acik = acikKategori === kategori.key;
            return (
              <View key={kategori.key} style={styles.catCard}>
                <TouchableOpacity style={styles.catHead} onPress={() => kategoriAc(kategori.key)} activeOpacity={0.8}>
                  <View style={[styles.catIcon, { backgroundColor: kategori.iconBg }]}>
                    <Text style={styles.catIconText}>{kategori.icon}</Text>
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.catTitle} numberOfLines={1} ellipsizeMode="tail">{kategori.title}</Text>
                    <Text style={styles.catSub} numberOfLines={1} ellipsizeMode="tail">{kategori.subtitle}</Text>
                  </View>
                  <Text style={[styles.catChevron, acik && styles.catChevronOpen]}>›</Text>
                </TouchableOpacity>
                {acik ? (
                  <View style={styles.catBody}>
                    {kategori.items.map((item, index) => {
                      const badgeCount = item.badgeKey === 'messages' ? unreadMessages : 0;
                      return (
                        <TouchableOpacity key={item.title} style={[styles.catItem, index === 0 && styles.catItemFirst]} onPress={() => itemeGit(item)} activeOpacity={0.8}>
                          <Text style={styles.catItemEmoji}>{item.icon}</Text>
                          <Text style={[styles.catItemName, badgeCount > 0 && styles.catItemNameUnread]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                          {item.comingSoon ? (
                            <View style={styles.soonBadge}><Text style={styles.soonBadgeText}>Yakında</Text></View>
                          ) : badgeCount > 0 ? (
                            <View style={styles.catItemBadge}><Text style={styles.catItemBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text></View>
                          ) : null}
                          <Text style={[styles.catItemArrow, item.comingSoon && styles.catItemArrowMuted]}>›</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

function getSubscriptionText(sub) {
  if (!sub) return 'İlk 1 ay ücretsiz deneme';
  if (sub.durum === 'aktif') return sub.plan === 'yillik' ? 'Yıllık abonelik aktif' : 'Aylık abonelik aktif';
  if (sub.durum === 'demo') return `Demo aktif · ${sub.demoBitisTarihi || sub.bitisTarihi || ''}`;
  return 'Abonelik durumu kontrol edilmeli';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 0 },
  screen: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 34 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  topTitleBlock: { flex: 1, minWidth: 0 },
  logoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', marginRight: 9, flexShrink: 0, borderWidth: 1, borderColor: 'rgba(108,61,235,0.16)', shadowColor: '#6C3DEB', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, overflow: 'hidden' },
  logoImage: { width: 44, height: 44, borderRadius: 22 },
  logoEmoji: { fontSize: 22 },
  brandLabel: { color: THEME.muted, fontWeight: '900', fontSize: 9, letterSpacing: 1.1, marginBottom: 2 },
  brandNamePill: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(108,61,235,0.14)' },
  appName: { fontSize: 18, fontWeight: '900', color: THEME.primary, flexShrink: 1, letterSpacing: 0.1 },
  panelLabel: { fontSize: 11, color: THEME.muted, fontWeight: '700', flexShrink: 1, marginTop: 2 },
  cikisBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cikisBtnText: { color: THEME.primary, fontWeight: '900', fontSize: 18 },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border, position: 'relative' },
  bellBtnIcon: { fontSize: 20 },
  bellBtnBadge: { position: 'absolute', top: -4, right: -5, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#FFFFFF' },
  bellBtnBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  welcomeCard: { backgroundColor: 'rgba(108,61,235,0.96)', borderRadius: 20, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeLeft: { flex: 1, minWidth: 0 },
  welcomeGreeting: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 },
  welcomeName: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 3, flexShrink: 1 },
  welcomeSub: { color: 'rgba(255,255,255,0.78)', marginTop: 3, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  welcomeIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginLeft: 10, flexShrink: 0 },
  welcomeIconText: { fontSize: 27 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: THEME.text, marginBottom: 9, marginTop: 2 },
  loadingBox: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 14 },
  ozetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  ozetKart: { width: '48.5%', minWidth: 0, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 9, borderWidth: 1, borderColor: 'rgba(238,234,248,0.92)', alignItems: 'center' },
  ozetIcon: { fontSize: 23 },
  ozetSayi: { fontSize: 22, fontWeight: '900', marginTop: 3, maxWidth: '100%' },
  ozetLabel: { color: THEME.muted, fontWeight: '800', marginTop: 1, maxWidth: '100%', fontSize: 12 },
  // Sabit (pinned) Mesajlar / Bildirimler şeridi
  inboxStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 18, padding: 5, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(238,234,248,0.94)' },
  inboxItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 13, minWidth: 0 },
  inboxEmoji: { fontSize: 18 },
  inboxTextBlock: { flex: 1, minWidth: 0 },
  inboxTitle: { fontSize: 12.5, fontWeight: '900', color: THEME.text },
  inboxSub: { fontSize: 10.5, fontWeight: '700', color: THEME.muted, marginTop: 1 },
  inboxCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: 4, flexShrink: 0 },
  inboxCountText: { color: '#FFF', fontWeight: '900', fontSize: 10 },
  inboxDivider: { width: 1, backgroundColor: THEME.border, marginVertical: 6 },

  // Yönetim İşlemleri — akordeon kategori kartları
  catCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(238,234,248,0.94)', overflow: 'hidden' },
  catHead: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  catIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catIconText: { fontSize: 20 },
  catInfo: { flex: 1, minWidth: 0 },
  catTitle: { fontSize: 14.5, fontWeight: '900', color: THEME.text },
  catSub: { fontSize: 11.5, fontWeight: '600', color: THEME.muted, marginTop: 2 },
  catChevron: { fontSize: 20, fontWeight: '900', color: THEME.muted, marginLeft: 4 },
  catChevronOpen: { transform: [{ rotate: '90deg' }], color: THEME.primary },
  catBody: { paddingBottom: 6 },
  catItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 8, borderRadius: 12, borderTopWidth: 1, borderTopColor: THEME.border },
  catItemFirst: { borderTopWidth: 0 },
  catItemEmoji: { fontSize: 17 },
  catItemName: { flex: 1, fontSize: 13.5, fontWeight: '800', color: THEME.text, minWidth: 0 },
  catItemNameUnread: { color: THEME.primary },
  catItemBadge: { minWidth: 19, height: 19, borderRadius: 10, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, flexShrink: 0 },
  catItemBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 10 },
  soonBadge: { backgroundColor: '#FFF0DC', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  soonBadgeText: { color: THEME.gold, fontWeight: '900', fontSize: 9.5 },
  catItemArrow: { fontSize: 18, fontWeight: '900', color: THEME.muted, flexShrink: 0 },
  catItemArrowMuted: { opacity: 0.35 },
});
