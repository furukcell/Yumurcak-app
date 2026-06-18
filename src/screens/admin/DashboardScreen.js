// ============================================================
// YUMURCAK — DashboardScreen.js
// Yönetici ana paneli
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    // Sınıf sayısı
    const sinifUnsub = onValue(ref(database, 'siniflar'), (snap) => {
      const data = snap.val();
      setIstatistik(prev => ({ ...prev, sinifSayisi: data ? Object.keys(data).length : 0 }));
    });

    // Çocuk sayısı
    const cocukUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      const data = snap.val();
      setIstatistik(prev => ({ ...prev, cocukSayisi: data ? Object.keys(data).length : 0 }));
    });

    // Kullanıcılar (öğretmen + veli)
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

  const menuItems = [
    { title: 'Sınıflar', icon: '🏫', screen: 'ClassList', color: '#0C447C' },
    { title: 'Çocuklar', icon: '👶', screen: 'ChildList', color: '#712B13' },
    { title: 'Öğretmenler', icon: '👨‍🏫', screen: 'TeacherList', color: '#633806' },
    { title: 'Veliler', icon: '👨‍👩‍👧', screen: 'VeliList', color: '#1a6b3c' },
    { title: 'Duyurular', icon: '📢', screen: 'AnnouncementList', color: '#27500A' },
  ];

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.hosgeldin}>Hoş Geldiniz 👋</Text>
        <Text style={s.altyazi}>{kullanici?.ad || 'Yönetici'} — Yumurcak Kreş</Text>
        <TouchableOpacity style={s.cikisBtn} onPress={cikisYap}>
          <Text style={s.cikisBtnYazi}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      <View style={s.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[s.menuKart, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={s.menuIkon}>{item.icon}</Text>
            <Text style={s.menuYazi}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.istatistikKutu}>
        <Text style={s.istatistikBaslik}>Hızlı İstatistikler</Text>
        {yukleniyor ? (
          <ActivityIndicator color="#3C3489" />
        ) : (
          <View style={s.istatistikSatir}>
            <View style={s.istatistikKart}>
              <Text style={s.sayi}>{istatistik.sinifSayisi}</Text>
              <Text style={s.etiket}>Sınıf</Text>
            </View>
            <View style={s.istatistikKart}>
              <Text style={s.sayi}>{istatistik.cocukSayisi}</Text>
              <Text style={s.etiket}>Çocuk</Text>
            </View>
            <View style={s.istatistikKart}>
              <Text style={s.sayi}>{istatistik.ogretmenSayisi}</Text>
              <Text style={s.etiket}>Öğretmen</Text>
            </View>
            <View style={s.istatistikKart}>
              <Text style={s.sayi}>{istatistik.veliSayisi}</Text>
              <Text style={s.etiket}>Veli</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#3C3489', padding: 24, paddingTop: 40 },
  hosgeldin: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  altyazi: { fontSize: 14, color: '#CECBF6', marginBottom: 16 },
  cikisBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  cikisBtnYazi: { color: '#fff', fontSize: 13, fontWeight: '600' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, justifyContent: 'space-between' },
  menuKart: { width: '47%', aspectRatio: 1, borderRadius: 16, padding: 20, marginBottom: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  menuIkon: { fontSize: 44, marginBottom: 10 },
  menuYazi: { fontSize: 16, fontWeight: '600', color: '#fff', textAlign: 'center' },
  istatistikKutu: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, elevation: 2 },
  istatistikBaslik: { fontSize: 17, fontWeight: '600', marginBottom: 16, color: '#333' },
  istatistikSatir: { flexDirection: 'row', justifyContent: 'space-around' },
  istatistikKart: { alignItems: 'center' },
  sayi: { fontSize: 30, fontWeight: 'bold', color: '#3C3489' },
  etiket: { fontSize: 13, color: '#666', marginTop: 4 },
});
