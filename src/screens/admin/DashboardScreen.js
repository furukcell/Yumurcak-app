// ============================================================
// YUMURCAK — DashboardScreen.js
// Yönetici ana paneli — modern tasarım
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
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const MENU_ITEMS = [
  { title: 'Sınıflar', icon: '🏫', screen: 'ClassList', desc: 'Sınıf listesi ve yönetimi', color: THEME.blue, bgColor: '#EEF4FF' },
  { title: 'Çocuklar', icon: '👶', screen: 'ChildList', desc: 'Kayıtlı çocuklar', color: THEME.orange, bgColor: '#FFF6E8' },
  { title: 'Öğretmenler', icon: '👨‍🏫', screen: 'TeacherList', desc: 'Öğretmen hesapları', color: THEME.primary, bgColor: THEME.primarySoft },
  { title: 'Veliler', icon: '👨‍👩‍👧', screen: 'VeliList', desc: 'Veli hesapları', color: THEME.green, bgColor: '#E8F9EF' },
  { title: 'Duyurular', icon: '📢', screen: 'AnnouncementList', desc: 'Duyuru yönetimi', color: THEME.red, bgColor: '#FFE8EC' },
  { title: 'Ödemeler', icon: '💳', screen: 'PaymentList', desc: 'Ödeme takibi', color: THEME.teal, bgColor: '#E0F7FA' },
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
  const [yukleniyor, setYukleniyor] = useState(true);

  // Gelişmiş istatistikler
  const [bugunRaporDurumu, setBugunRaporDurumu] = useState({ girilen: 0, toplam: 0 });
  const [ogretmenTamamlama, setOgretmenTamamlama] = useState([]);
  const [odemeOzeti, setOdemeOzeti] = useState({ odendi: 0, bekliyor: 0, gecikti: 0 });
  const [istatistikYukleniyor, setIstatistikYukleniyor] = useState(true);

  useEffect(() => {
    const sinifUnsub = onValue(ref(database, 'siniflar'), (snap) => {
      const data = snap.val();
      setIstatistik(prev => ({ ...prev, sinifSayisi: data ? Object.keys(data).length : 0 }));
    });

    const cocukUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      const data = snap.val();
      setIstatistik(prev => ({ ...prev, cocukSayisi: data ? Object.keys(data).length : 0 }));
    });

    const kullaniciUnsub = onValue(ref(database, 'kullanicilar'), (snap) => {
      const data = snap.val();
      if (data) {
        const liste = Object.values(data);
        setIstatistik(prev => ({
          ...prev,
          ogretmenSayisi: liste.filter(u => u.rol === 'ogretmen').length,
          veliSayisi: liste.filter(u => u.rol === 'veli').length,
        }));
      }
      setYukleniyor(false);
    });

    return () => {
      sinifUnsub();
      cocukUnsub();
      kullaniciUnsub();
    };
  }, []);

  // ── Gelişmiş istatistikler: bugünkü rapor durumu + öğretmen tamamlama + ödeme özeti ──
  useEffect(() => {
    let cocuklar = {};
    let kullanicilar = {};
    let raporlar = {};
    let odemeler = {};
    let cocukLoaded = false;
    let kulLoaded = false;
    let raporLoaded = false;
    let odemeLoaded = false;

    function bugunTarihStr() {
      const d = new Date();
      const yil = d.getFullYear();
      const ay = String(d.getMonth() + 1).padStart(2, '0');
      const gun = String(d.getDate()).padStart(2, '0');
      return `${yil}-${ay}-${gun}`;
    }

    function build() {
      if (!cocukLoaded || !kulLoaded || !raporLoaded || !odemeLoaded) return;

      const bugun = bugunTarihStr();
      const cocukListesi = Object.entries(cocuklar);
      const toplamCocuk = cocukListesi.length;

      // Bugün rapor girilen çocukId'leri topla
      const bugunRaporGirilenCocukIdleri = new Set(
        Object.values(raporlar)
          .filter((r) => r && r.tarih === bugun && r.cocukId)
          .map((r) => r.cocukId)
      );

      setBugunRaporDurumu({
        girilen: bugunRaporGirilenCocukIdleri.size,
        toplam: toplamCocuk,
      });

      // Öğretmen bazlı tamamlama: her öğretmenin sınıfındaki çocuk sayısı vs bugün rapor girilen sayısı
      const ogretmenler = Object.entries(kullanicilar).filter(([, u]) => u?.rol === 'ogretmen');

      const ogretmenIstatistik = ogretmenler.map(([ogId, og]) => {
        const ogSinifId = og.sinifId;
        const ogCocuklari = cocukListesi.filter(([, c]) => c.sinifId === ogSinifId);
        const ogToplam = ogCocuklari.length;
        const ogGirilen = ogCocuklari.filter(([cid]) => bugunRaporGirilenCocukIdleri.has(cid)).length;
        const ad = `${og.ad || ''} ${og.soyad || ''}`.trim() || og.kullaniciAdi || 'İsimsiz Öğretmen';
        return { id: ogId, ad, girilen: ogGirilen, toplam: ogToplam };
      });

      setOgretmenTamamlama(ogretmenIstatistik);

      // Ödeme özeti — bu ay
      const simdi = new Date();
      const guncelAy = simdi.getMonth() + 1;
      const guncelYil = simdi.getFullYear();

      const buAyOdemeleri = Object.values(odemeler).filter(
        (o) => o && o.ay === guncelAy && o.yil === guncelYil
      );

      setOdemeOzeti({
        odendi: buAyOdemeleri.filter((o) => o.durum === 'odendi').length,
        bekliyor: buAyOdemeleri.filter((o) => o.durum === 'bekliyor').length,
        gecikti: buAyOdemeleri.filter((o) => o.durum === 'gecikti').length,
      });

      setIstatistikYukleniyor(false);
    }

    const cocukUnsub2 = onValue(ref(database, 'cocuklar'), (snap) => {
      cocuklar = snap.val() || {};
      cocukLoaded = true;
      build();
    });

    const kulUnsub2 = onValue(ref(database, 'kullanicilar'), (snap) => {
      kullanicilar = snap.val() || {};
      kulLoaded = true;
      build();
    });

    const raporUnsub = onValue(ref(database, 'gunlukRaporlar'), (snap) => {
      raporlar = snap.val() || {};
      raporLoaded = true;
      build();
    });

    const odemeUnsub = onValue(ref(database, 'odemeler'), (snap) => {
      odemeler = snap.val() || {};
      odemeLoaded = true;
      build();
    });

    return () => {
      cocukUnsub2();
      kulUnsub2();
      raporUnsub();
      odemeUnsub();
    };
  }, []);

  const adSoyad = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Yönetici';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Üst Başlık ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🍼</Text>
            </View>
            <View>
              <Text style={styles.appName}>Yumurcak</Text>
              <Text style={styles.panelLabel}>Yönetim Paneli</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cikisBtn} onPress={cikisYap} activeOpacity={0.8}>
            <Text style={styles.cikisBtnText}>↩ Çıkış</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hoş Geldin Kartı ── */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreeting}>Hoş Geldiniz 👋</Text>
            <Text style={styles.welcomeName}>{adSoyad}</Text>
            <Text style={styles.welcomeSub}>Yumurcak Kreş Yöneticisi</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Text style={styles.welcomeIconText}>👑</Text>
          </View>
        </View>

        {/* ── Genel Özet ── */}
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

        {/* ── Bugünkü Durum ── */}
        <Text style={styles.sectionTitle}>Bugünkü Durum</Text>
        {istatistikYukleniyor ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={THEME.primary} />
          </View>
        ) : (
          <>
            {/* Bugün rapor girilen/girilmeyen */}
            <View style={styles.istatistikKart}>
              <View style={styles.istatistikKartUst}>
                <Text style={styles.istatistikIkon}>📋</Text>
                <Text style={styles.istatistikBaslik}>Günlük Rapor Durumu</Text>
              </View>
              <Text style={styles.istatistikDeger}>
                {bugunRaporDurumu.girilen} / {bugunRaporDurumu.toplam}
                <Text style={styles.istatistikAltMetin}> çocuk için rapor girildi</Text>
              </Text>
              {bugunRaporDurumu.toplam > 0 ? (
                <View style={styles.ilerlemeCubuguArkaplan}>
                  <View
                    style={[
                      styles.ilerlemeCubugu,
                      {
                        width: `${Math.min(100, Math.round((bugunRaporDurumu.girilen / bugunRaporDurumu.toplam) * 100))}%`,
                        backgroundColor: THEME.green,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            {/* Öğretmen bazlı tamamlama */}
            {ogretmenTamamlama.length > 0 ? (
              <View style={styles.istatistikKart}>
                <View style={styles.istatistikKartUst}>
                  <Text style={styles.istatistikIkon}>👨‍🏫</Text>
                  <Text style={styles.istatistikBaslik}>Öğretmen Bazlı Tamamlama</Text>
                </View>
                {ogretmenTamamlama.map((og) => (
                  <View key={og.id} style={styles.ogretmenSatir}>
                    <Text style={styles.ogretmenAd}>{og.ad}</Text>
                    <Text style={[
                      styles.ogretmenOran,
                      { color: og.toplam > 0 && og.girilen === og.toplam ? THEME.green : THEME.orange }
                    ]}>
                      {og.girilen} / {og.toplam}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Ödeme özeti */}
            <View style={styles.istatistikKart}>
              <View style={styles.istatistikKartUst}>
                <Text style={styles.istatistikIkon}>💳</Text>
                <Text style={styles.istatistikBaslik}>Bu Ayki Ödeme Özeti</Text>
              </View>
              <View style={styles.odemeOzetGrid}>
                <View style={styles.odemeOzetKutu}>
                  <Text style={[styles.odemeOzetSayi, { color: THEME.green }]}>{odemeOzeti.odendi}</Text>
                  <Text style={styles.odemeOzetLabel}>Ödendi</Text>
                </View>
                <View style={styles.odemeOzetKutu}>
                  <Text style={[styles.odemeOzetSayi, { color: THEME.orange }]}>{odemeOzeti.bekliyor}</Text>
                  <Text style={styles.odemeOzetLabel}>Bekliyor</Text>
                </View>
                <View style={styles.odemeOzetKutu}>
                  <Text style={[styles.odemeOzetSayi, { color: THEME.red }]}>{odemeOzeti.gecikti}</Text>
                  <Text style={styles.odemeOzetLabel}>Gecikti</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Yönetim İşlemleri ── */}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoEmoji: { fontSize: 22 },
  appName: { fontSize: 18, fontWeight: '900', color: THEME.primary },
  panelLabel: { fontSize: 11, color: THEME.muted, fontWeight: '700' },
  cikisBtn: { backgroundColor: THEME.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: THEME.border },
  cikisBtnText: { fontSize: 13, fontWeight: '800', color: THEME.primary },

  welcomeCard: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24, shadowColor: THEME.primary, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  welcomeLeft: { flex: 1 },
  welcomeGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  welcomeName: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 3 },
  welcomeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  welcomeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  welcomeIconText: { fontSize: 28 },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: THEME.text, marginBottom: 12 },

  loadingBox: { alignItems: 'center', paddingVertical: 20, marginBottom: 24 },
  ozetGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  ozetKart: { width: '23%', backgroundColor: THEME.card, borderRadius: 18, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  ozetIcon: { fontSize: 22, marginBottom: 6 },
  ozetSayi: { fontSize: 24, fontWeight: '900', marginBottom: 3 },
  ozetLabel: { fontSize: 10, color: THEME.muted, fontWeight: '800', textAlign: 'center' },

  menuKart: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  menuIconWrapper: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIcon: { fontSize: 26 },
  menuTextBlock: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '900', color: THEME.text, marginBottom: 3 },
  menuDesc: { fontSize: 12, color: THEME.muted, fontWeight: '600' },
  menuArrow: { fontSize: 28, fontWeight: '700', lineHeight: 32 },

  istatistikKart: {
    backgroundColor: THEME.card, borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  istatistikKartUst: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  istatistikIkon: { fontSize: 18, marginRight: 8 },
  istatistikBaslik: { fontSize: 14, fontWeight: '800', color: THEME.text },
  istatistikDeger: { fontSize: 20, fontWeight: '900', color: THEME.text, marginBottom: 10 },
  istatistikAltMetin: { fontSize: 12, fontWeight: '600', color: THEME.muted },

  ilerlemeCubuguArkaplan: { height: 8, borderRadius: 4, backgroundColor: '#EEEAF8', overflow: 'hidden' },
  ilerlemeCubugu: { height: 8, borderRadius: 4 },

  ogretmenSatir: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: THEME.border,
  },
  ogretmenAd: { fontSize: 13, fontWeight: '700', color: THEME.text, flex: 1 },
  ogretmenOran: { fontSize: 13, fontWeight: '900' },

  odemeOzetGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  odemeOzetKutu: { flex: 1, alignItems: 'center' },
  odemeOzetSayi: { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  odemeOzetLabel: { fontSize: 11, color: THEME.muted, fontWeight: '700' },
});
