// ============================================================
// YUMURCAK — ServisciProfileScreen.js
// Servis görevlisi (abla/hostes) için "Hesabım" ekranı — kişisel
// bilgiler + şifre değiştirme. TeacherProfileScreen.js ile aynı deseni
// kullanır, ServisciDashboardScreen.js'in THEME renklerine uyumlu.
// ============================================================
import React from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordCard from '../../components/ChangePasswordCard';

const THEME = {
  primary: '#3A7BFF',
  primaryDark: '#2A5FD6',
  red: '#FF4D6D',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  border: '#EAEFF8',
};

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value || '-'}</Text>
      </View>
    </View>
  );
}

export default function ServisciProfileScreen() {
  const navigation = useNavigation();
  const { kullanici, kres, cikisYap } = useAuth();
  const userId = kullanici?.uid || kullanici?.id;
  const adSoyad = kullanici?.ad || kullanici?.kullaniciAdi || 'Servis Görevlisi';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hesabım</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.avatar}>🚐</Text>
          <Text style={styles.name} numberOfLines={1}>{adSoyad}</Text>
          <Text style={styles.sub} numberOfLines={1}>{kres?.ad || 'Servis Görevlisi'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hesap Bilgileri</Text>
          <InfoRow icon="🏫" label="Kurum" value={kres?.ad} />
          <InfoRow icon="👤" label="Kullanıcı Adı" value={kullanici?.kullaniciAdi} />
        </View>

        <ChangePasswordCard userId={userId} primaryColor={THEME.primary} />

        <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.logoutText}>↩ Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: THEME.primary, fontWeight: '900', marginTop: -2 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: THEME.text },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 22, alignItems: 'center', marginVertical: 14 },
  avatar: { fontSize: 52, marginBottom: 8 },
  name: { color: '#FFF', fontSize: 21, fontWeight: '900', maxWidth: '100%' },
  sub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '700', maxWidth: '100%' },
  card: { backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  cardTitle: { color: THEME.text, fontSize: 17, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: THEME.border },
  infoIcon: { fontSize: 18, marginRight: 10 },
  infoLabel: { color: THEME.muted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: THEME.text, fontSize: 14, fontWeight: '800', marginTop: 1 },
  logoutButton: { backgroundColor: THEME.red, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
