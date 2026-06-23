// ============================================================
// DashboardScreen.js
// Admin ana ekran
// Tema arka planı + kompakt dashboard + kurum adı vitrini
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import AppNotificationButton from '../../components/AppNotificationButton';
import ThemedBackground from '../../components/ThemedBackground';
import { useUnreadMessagesCount } from '../../utils/messageHelpers';

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

const MENU_ITEMS = [
  { title: 'Kurum Bilgileri', icon: '🏫', screen: 'InstitutionSettings', desc: 'Adres ve iletişim', color: THEME.primaryDark, bgColor: THEME.primarySoft },
  { title: 'Tema Ayarları', icon: '🎨', screen: 'ThemeSettings', desc: 'Renk ve arka plan', color: THEME.purple, bgColor: '#F3E8FA' },
  { title: 'Abonelik / Ödeme', icon: '💎', screen: 'Subscription', desc: 'Paket ve promo kod', color: THEME.gold, bgColor: '#FFF5D9' },
  { title: 'Mesajlar', icon: '💬', screen: 'AdminMessages', desc: 'Veli ve öğretmenlerle yazış', color: THEME.primary, bgColor: THEME.primarySoft },
  { title: 'İstatistikler', icon: '📊', screen: 'AdminStatistics', desc: 'Kurum gelişim özeti', color: THEME.blue, bgColor: '#EEF4FF' },
  { title: 'Galeri', icon: '🖼️', screen: 'AdminGallery', desc: 'Fotoğraf / video', color: THEME.teal, bgColor: '#E0F7FA' },
  { title: 'Aylık Yemek Listesi', icon: '🍽️', screen: 'AdminMonthlyMeal', desc: 'Ay bazlı kurum menüsü', color: THEME.orange, bgColor: '#FFF6E8' },
  { title: 'Sınıflar', icon: '🏫', screen: 'ClassList', desc: 'Sınıf yönetimi', color: THEME.blue, bgColor: '#EEF4FF' },
  { title: 'Çocuklar', icon: '👶', screen: 'ChildList', desc: 'Çocuk kayıtları', color: THEME.orange, bgColor: '#FFF6E8' },
  { title: 'Öğretmenler', icon: '👨‍🏫', screen: 'TeacherList', desc: 'Öğretmen hesapları', color: THEME.primary, bgColor: THEME.primarySoft },
  { title: 'Veliler', icon: '👨‍👩‍👧', screen: 'VeliList', desc: 'Veli hesapları', color: THEME.green, bgColor: '#E8F9EF' },
  { title: 'Duyurular', icon: '📢', screen: 'AnnouncementList', desc: 'Duyuru yönetimi', color: THEME.red, bgColor: '#FFE8EC' },
  { title: 'Ödemeler', icon: '💳', screen: 'PaymentList', desc: 'Ödeme takibi', color: THEME.teal, bgColor: '#E0F7FA' },
  { title: 'Anket Yönetimi', icon: '🗳️', screen: 'PollManagement', desc: 'Veli anketleri', color: THEME.purple, bgColor: '#F3E8FA' },
  { title: 'Kurum Zili', icon: '🔔', screen: 'AdminBell', desc: 'Kapı / geliyorum', color: THEME.red, bgColor: '#FFE8EC' },
  { title: 'Ders Programı', icon: '📅', screen: 'LessonScheduleList', desc: 'Haftalık program', color: THEME.purple, bgColor: '#F3E8FA' },
  { title: 'Etkinlikler', icon: '🎉', screen: 'EventList', desc: 'Etkinlik takvimi', color: '#E67E22', bgColor: '#FCEEE0' },
];

const OZET_ITEMS = [
  { key: 'sinifSayisi', label: 'Sınıf', icon: '🏫', color: THEME.blue },
  { key: 'cocukSayisi', label: 'Çocuk', icon: '👶', color: THEME.orange },
  { key: 'ogretmenSayisi', label: 'Öğretmen', icon: '👨‍🏫', color: THEME.primary },
  { key: 'veliSayisi', label: 'Veli', icon: '👨‍👩‍👧', color: THEME.green },
];

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { kullanici, cikisYap } = useAuth();

  const [istatistik, setIstatistik] = useState({
    sinifSayisi: 0,
    cocukSayisi: 0,
    ogretmenSayisi: 0,
    veliSayisi: 0,
  });
  const [kresAdi, setKresAdi] = useState('Kurum');
  const [abonelik, setAbonelik] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const kresId = kullanici?.kresId || 'kres001';
  const adminId = kullanici?.uid || kullanici?.id;
  const unreadMessages = useUnreadMessagesCount(adminId);

  useEffect(() => {
    const kresUnsub = onValue(ref(database, `kresler/${kresId}`), (snap) => {
      const data = snap.val();
      if (data?.ad) setKresAdi(data.ad);
    });

    const subUnsub = onValue(ref(database, `abonelikler/${kresId}`), (snap) => {
      setAbonelik(snap.val() || null);
    });

    const sinifUnsub = onValue(ref(database, 'siniflar'), (snap) => {
      const data = snap.val();
      setIstatistik((prev) => ({
        ...prev,
        sinifSayisi: data ? Object.values(data).filter((x) => !x.kresId || x.kresId === kresId).length : 0,
      }));
    });

    const cocukUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      const data = snap.val();
      setIstatistik((prev) => ({
        ...prev,
        cocukSayisi: data ? Object.values(data).filter((x) => !x.kresId || x.kresId === kresId).length : 0,
      }));
    });

    const kullaniciUnsub = onValue(ref(database, 'kullanicilar'), (snap) => {
      const data = snap.val();
      if (data) {
        const liste = Object.values(data).filter((u) => !u.kresId || u.kresId === kresId);
        setIstatistik((prev) => ({
          ...prev,
          ogretmenSayisi: liste.filter((u) => u.rol === 'ogretmen').length,
          veliSayisi: liste.filter((u) => u.rol === 'veli').length,
        }));
      }
      setYukleniyor(false);
    });

    return () => {
      kresUnsub();
      subUnsub();
      sinifUnsub();
      cocukUnsub();
      kullaniciUnsub();
    };
  }, [kresId]);

  const adSoyad = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Yönetici';

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>🍼</Text>
              </View>

              <View style={styles.topTitleBlock}>
                <Text style={styles.brandLabel} numberOfLines={1} ellipsizeMode="tail">
                  YUMURCAK KREŞ
                </Text>
                <View style={styles.brandNamePill}>
                  <Text style={styles.appName} numberOfLines={1} ellipsizeMode="tail">
                    {kresAdi}
                  </Text>
                </View>
                <Text style={styles.panelLabel} numberOfLines={1} ellipsizeMode="tail">
                  Yönetim Paneli
                </Text>
              </View>
            </View>

            <View style={styles.topActions}>
              <AppNotificationButton navigation={navigation} />
              <TouchableOpacity style={styles.cikisBtn} onPress={cikisYap} activeOpacity={0.8}>
                <Text style={styles.cikisBtnText}>↩</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.welcomeCard}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.welcomeGreeting}>Hoş Geldiniz 👋</Text>
              <Text style={styles.welcomeName} numberOfLines={1} ellipsizeMode="tail">
                {adSoyad}
              </Text>
              <Text style={styles.welcomeSub} numberOfLines={2} ellipsizeMode="tail">
                {getSubscriptionText(abonelik)}
              </Text>
            </View>

            <View style={styles.welcomeIcon}>
              <Text style={styles.welcomeIconText}>👑</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Genel Özet</Text>

          {yukleniyor ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={THEME.primary} />
            </View>
          ) : (
            <View style={styles.ozetGrid}>
              {OZET_ITEMS.map((item) => (
                <View key={item.key} style={styles.ozetKart}>
                  <Text style={styles.ozetIcon}>{item.icon}</Text>
                  <Text style={[styles.ozetSayi, { color: item.color }]} numberOfLines={1}>
                    {istatistik[item.key]}
                  </Text>
                  <Text style={styles.ozetLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Yönetim İşlemleri</Text>

          {MENU_ITEMS.map((item) => {
            const isMessages = item.screen === 'AdminMessages';
            const badgeCount = isMessages ? unreadMessages : 0;

            return (
              <TouchableOpacity
                key={item.title}
                style={styles.menuKart}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: item.bgColor }]}> 
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  {badgeCount > 0 ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.menuTextBlock}>
                  <Text style={[styles.menuTitle, badgeCount > 0 && styles.menuTitleUnread]} numberOfLines={1} ellipsizeMode="tail">
                    {item.title}
                  </Text>
                  <Text style={styles.menuDesc} numberOfLines={1} ellipsizeMode="tail">
                    {item.desc}
                  </Text>
                </View>

                <Text style={[styles.menuArrow, { color: item.color }]}>›</Text>
              </TouchableOpacity>
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
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 34 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  topTitleBlock: { flex: 1, minWidth: 0 },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(108,61,235,0.16)',
    shadowColor: '#6C3DEB',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  logoEmoji: { fontSize: 22 },
  brandLabel: {
    color: THEME.muted,
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  brandNamePill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(108,61,235,0.14)',
  },
  appName: { fontSize: 18, fontWeight: '900', color: THEME.primary, flexShrink: 1, letterSpacing: 0.1 },
  panelLabel: { fontSize: 11, color: THEME.muted, fontWeight: '700', flexShrink: 1, marginTop: 2 },
  cikisBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cikisBtnText: { color: THEME.primary, fontWeight: '900', fontSize: 18 },
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
  menuKart: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 12, marginBottom: 9, borderWidth: 1, borderColor: 'rgba(238,234,248,0.94)', flexDirection: 'row', alignItems: 'center' },
  menuIconWrapper: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0, position: 'relative' },
  menuIcon: { fontSize: 22 },
  menuBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#FFFFFF' },
  menuBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 10 },
  menuTextBlock: { flex: 1, minWidth: 0 },
  menuTitle: { fontSize: 15, fontWeight: '900', color: THEME.text, flexShrink: 1 },
  menuTitleUnread: { color: THEME.primary },
  menuDesc: { color: THEME.muted, marginTop: 2, fontWeight: '600', fontSize: 12, lineHeight: 16, flexShrink: 1 },
  menuArrow: { fontSize: 26, fontWeight: '900', marginLeft: 6, flexShrink: 0 },
});
