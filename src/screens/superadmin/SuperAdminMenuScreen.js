import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  bg: '#0F172A',
  panel: '#111827',
  card: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#38BDF8',
  green: '#22C55E',
  orange: '#F59E0B',
  purple: '#A78BFA',
  red: '#EF4444',
};

const ITEMS = [
  { title: 'Platform Dashboard', desc: 'Kreşler, abonelik ve genel istatistikler', icon: '📊', screen: 'SuperAdminDashboard', color: COLORS.blue },
  { title: 'Gelen Destek Mesajları', desc: 'İstek, şikayet, görüş ve cevaplama kutusu', icon: '💬', screen: 'SuperAdminSupport', color: COLORS.green },
  { title: 'Yeni Kreş Ekle', desc: 'Kurum + yönetici hesabı + demo abonelik oluştur', icon: '🏫', screen: 'SuperAdminKresCreate', color: COLORS.orange },
  { title: 'Firebase Index / Veri Düzeni', desc: 'Kreş, kullanıcı, çocuk ve mesaj indexlerini oluştur', icon: '🧩', screen: 'SuperAdminIndexMigration', color: COLORS.purple },
];

export default function SuperAdminMenuScreen({ navigation }) {
  const { kullanici, cikisYap } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>YUMURCAK PLATFORM</Text>
            <Text style={styles.title}>Süper Admin Menü</Text>
            <Text style={styles.subtitle}>{kullanici?.ad || kullanici?.kullaniciAdi || 'Platform Sahibi'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🌈</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Yumurcak Yönetim</Text>
            <Text style={styles.heroDesc}>Destek talepleri ve platform yönetimi buradan kontrol edilir.</Text>
          </View>
        </View>

        {ITEMS.map((item) => (
          <TouchableOpacity key={item.screen} style={styles.card} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.86}>
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
            <Text style={[styles.arrow, { color: item.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
  content: { flex: 1, padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kicker: { color: COLORS.blue, fontWeight: '900', fontSize: 11, letterSpacing: 1.4 },
  title: { color: COLORS.text, fontSize: 27, fontWeight: '900', marginTop: 2 },
  subtitle: { color: COLORS.muted, fontWeight: '700', marginTop: 2 },
  logoutButton: { backgroundColor: '#3A1F2A', borderWidth: 1, borderColor: '#7F1D1D', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  logoutText: { color: COLORS.red, fontWeight: '900' },
  hero: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, padding: 18, marginBottom: 16, alignItems: 'center' },
  heroIcon: { fontSize: 42 },
  heroTitle: { color: COLORS.text, fontWeight: '900', fontSize: 20 },
  heroDesc: { color: COLORS.muted, fontWeight: '700', lineHeight: 19, marginTop: 5 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, marginBottom: 12 },
  cardIcon: { width: 42, fontSize: 28 },
  cardBody: { flex: 1 },
  cardTitle: { color: COLORS.text, fontWeight: '900', fontSize: 17 },
  cardDesc: { color: COLORS.muted, fontWeight: '700', lineHeight: 18, marginTop: 4 },
  arrow: { fontSize: 30, fontWeight: '900', marginLeft: 10 },
});
