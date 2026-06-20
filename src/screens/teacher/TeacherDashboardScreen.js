// ============================================================
// YUMURCAK — TeacherDashboardScreen.js
// Öğretmen ana menüsü - FAZ 1 mesajlar butonu eklendi
// ============================================================
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, LoadingState, EmptyState } from './teacherShared';

const MENU = [
  { icon: '👧', title: 'Çocuklarım', desc: 'Sınıfındaki çocuklar', route: 'TeacherChildren' },
  { icon: '📝', title: 'Günlük Rapor', desc: 'Çocuk seç ve rapor gir', route: 'TeacherChildren' },
  { icon: '✅', title: 'Yoklama', desc: 'Günlük yoklama gir', route: 'TeacherAttendance' },
  { icon: '📚', title: 'Ders Programı', desc: 'Haftalık program', route: 'TeacherSchedule' },
  { icon: '🎉', title: 'Etkinlikler', desc: 'Sınıf etkinlikleri', route: 'TeacherEvents' },
  { icon: '🍽️', title: 'Yemek Listesi', desc: 'Kurum menüsü', route: 'TeacherMeals' },
  { icon: '🩺', title: 'Medikal', desc: 'Alerji ve ilaç bilgileri', route: 'TeacherMedical' },
  { icon: '📣', title: 'Duyurular', desc: 'Kurum duyuruları', route: 'TeacherAnnouncements' },
  { icon: '💬', title: 'Mesajlar', desc: 'Velilerle yazış', route: 'TeacherMessages' },
  { icon: '👤', title: 'Profil', desc: 'Bilgiler ve çıkış', route: 'TeacherProfile' },
];

export default function TeacherDashboardScreen() {
  const navigation = useNavigation();
  const { loading, kullanici, currentClass, classChildren, reports, attendance } = useTeacherData();

  if (loading) return <LoadingState text="Öğretmen paneli hazırlanıyor..." />;

  const today = new Date().toISOString().split('T')[0];
  const todayReports = reports.filter((item) => item.tarih === today).length;
  const todayAttendance = attendance.filter((item) => item.tarih === today && item.sinifId === currentClass?.id).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Öğretmen Paneli</Text>
            <Text style={styles.subtitle}>Merhaba, {kullanici?.ad || kullanici?.kullaniciAdi || 'Öğretmen'} 👋</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>👩‍🏫</Text></View>
        </View>

        {currentClass ? (
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{currentClass.ad || 'Sınıfım'}</Text>
            <Text style={styles.heroSub}>Bugünkü sınıf özeti</Text>
            <View style={styles.statsRow}>
              {renderStat('Çocuk', classChildren.length)}
              {renderStat('Rapor', todayReports)}
              {renderStat('Yoklama', todayAttendance)}
            </View>
          </View>
        ) : (
          <EmptyState icon="🏫" title="Sınıf ataması bulunamadı" desc="Yönetici öğretmeni bir sınıfa bağladığında panel aktifleşir." />
        )}

        <Text style={styles.sectionTitle}>Sınıf İşlemleri</Text>
        <View style={styles.grid}>
          {MENU.map((item) => (
            <TouchableOpacity key={item.title} style={styles.menuCard} onPress={() => navigation.navigate(item.route)} activeOpacity={0.85}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function renderStat(label, value) {
    return (
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1 },
  content: { padding: 18, paddingBottom: 28 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 25, fontWeight: '900', color: THEME.primary },
  subtitle: { marginTop: 4, fontSize: 14, color: THEME.muted, fontWeight: '700' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: THEME.card, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 27 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 18, marginBottom: 22 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: 12, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuCard: { width: '48%', backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  menuIcon: { fontSize: 28, marginBottom: 8 },
  menuTitle: { fontSize: 15, fontWeight: '900', color: THEME.text },
  menuDesc: { fontSize: 12, color: THEME.muted, marginTop: 4, lineHeight: 17 },
});
