// ============================================================
// YUMURCAK — DashboardScreen.js
// Yönetici ana paneli — FAZ 7 Mesajlar menüsü eklendi
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

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
  { title: 'Kurum Bilgileri', icon: '🏫', screen: 'InstitutionSettings', desc: 'Adres, telefon ve iletişim bilgileri', color: THEME.primaryDark, bgColor: THEME.primarySoft },
  { title: 'Abonelik / Ödeme', icon: '💎', screen: 'Subscription', desc: 'Demo, aylık/yıllık paket ve promo kod', color: THEME.gold, bgColor: '#FFF5D9' },
  { title: 'Mesajlar', icon: '💬', screen: 'AdminMessages', desc: 'Veli ve öğretmenlerle yazış', color: THEME.primary, bgColor: THEME.primarySoft },
  { title: 'Sınıflar', icon: '🏫', screen: 'ClassList', desc: 'Sınıf listesi ve yönetimi', color: THEME.blue, bgColor: '#EEF4FF' },
  { title: 'Çocuklar', icon: '👶', screen: 'ChildList', desc: 'Kayıtlı çocuklar', color: THEME.orange, bgColor: '#FFF6E8' },
  { title: 'Öğretmenler', icon: '👨‍🏫', screen: 'TeacherList', desc: 'Öğretmen hesapları', color: THEME.primary, bgColor: THEME.primarySoft },
  { title: 'Veliler', icon: '👨‍👩‍👧', screen: 'VeliList', desc: 'Veli hesapları', color: THEME.green, bgColor: '#E8F9EF' },
  { title: 'Duyurular', icon: '📢', screen: 'AnnouncementList', desc: 'Duyuru yönetimi', color: THEME.red, bgColor: '#FFE8EC' },
  { title: 'Ödemeler', icon: '💳', screen: 'PaymentList', desc: 'Veli ödeme takibi', color: THEME.teal, bgColor: '#E0F7FA' },
  { title: 'Ders Programı', icon: '📅', screen: 'LessonScheduleList', desc: 'Sınıf bazlı haftalık program', color: THEME.purple, bgColor: '#F3E8FA' },
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
  const [kresAdi, setKresAdi] = useState('Yumurcak');
  const [abonelik, setAbonelik] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const kresId = kullanici?.kresId || 'kres001';

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
      setIstatistik((prev) => ({ ...prev, sinifSayisi: data ? Object.values(data).filter((x) => !x.kresId || x.kresId === kresId).length : 0 }));
    });

    const cocukUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      const data = snap.val();
      setIstatistik((prev) => ({ ...prev, cocukSayisi: data ? Object.values(data).filter((x) => !x.kresId || x.kresId === kresId).length : 0 }));
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🍼</Text>
            </View>
            <View>
              <Text style={styles.appName}>{kresAdi}</Text>
              <Text style={styles.panelLabel}>Yumurcak Yönetim Paneli</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cikisBtn} onPress={cikisYap} activeOpacity={0.8}>
            <Text style={styles.cikisBtnText}>↩ Çıkış</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreeting}>Hoş Geldiniz 👋</Text>
            <Text style={styles.welcomeName}>{adSoyad}</Text>
            <Text style={styles.welcomeSub}>{getSubscriptionText(abonelik)}</Text>
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
                <Text style={[styles.ozetSayi, { color: item.color }]}>{istatistik[item.key]}</Text>
                <Text style={styles.ozetLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Yönetim İşlemleri</Text>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.menuKart}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: item.bgColor }]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuTextBlock}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Text style={[styles.menuArrow, { color: item.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function getSubscriptionText(sub) {
  if (!sub) return 'İlk 1 ay ücretsiz deneme';
  if (sub.durum === 'aktif') return sub.plan === 'yillik' ? 'Yıllık abonelik aktif' : 'Aylık abonelik aktif';
  if (sub.durum === 'demo') return `Demo aktif · ${sub.demoBitisTarihi || sub.bitisTarihi || ''}`;
  return 'Abonelik durumu kontrol edilmeli';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoEmoji: { fontSize: 22 },
  appName: { fontSize: 21, fontWeight: '900', color: THEME.primary },
  panelLabel: { fontSize: 12, color: THEME.muted, fontWeight: '700' },
  cikisBtn: { backgroundColor: THEME.card, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: THEME.border },
  cikisBtnText: { color: THEME.primary, fontWeight: '900' },
  welcomeCard: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeLeft: { flex: 1 },
  welcomeGreeting: { color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  welcomeName: { color: '#fff', fontSize: 23, fontWeight: '900', marginTop: 4 },
  welcomeSub: { color: 'rgba(255,255,255,0.78)', marginTop: 4, fontWeight: '700' },
  welcomeIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  welcomeIconText: { fontSize: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12, marginTop: 6 },
  loadingBox: { backgroundColor: THEME.card, borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 18 },
  ozetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  ozetKart: { width: '48%', backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  ozetIcon: { fontSize: 27 },
  ozetSayi: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  ozetLabel: { color: THEME.muted, fontWeight: '800', marginTop: 2 },
  menuKart: { backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  menuIconWrapper: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuIcon: { fontSize: 24 },
  menuTextBlock: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
  menuDesc: { color: THEME.muted, marginTop: 3, fontWeight: '600' },
  menuArrow: { fontSize: 28, fontWeight: '900' },
});
