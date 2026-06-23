// ============================================================
// TeacherDashboardScreen.js
// Öğretmen ana ekran
// ============================================================
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTeacherData, LoadingState, EmptyState } from './teacherShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppNotificationButton from '../../components/AppNotificationButton';

const MENU = [
  { icon: '👧', title: 'Çocuklarım', desc: 'Sınıfındaki çocuklar', route: 'TeacherChildren' },
  { icon: '📝', title: 'Günlük Rapor', desc: 'Çocuk seç ve rapor gir', route: 'TeacherChildren' },
  { icon: '✅', title: 'Yoklama', desc: 'Günlük yoklama gir', route: 'TeacherAttendance' },
  { icon: '📚', title: 'Ders Programı', desc: 'Haftalık program', route: 'TeacherSchedule' },
  { icon: '🎉', title: 'Etkinlikler', desc: 'Sınıf etkinlikleri', route: 'TeacherEvents' },
  { icon: '🍽️', title: 'Yemek Listesi', desc: 'Kurum menüsü', route: 'TeacherMeals' },
  { icon: '🖼️', title: 'Galeri', desc: 'Sınıf paylaşımları', route: 'TeacherGallery' },
  { icon: '🩺', title: 'Medikal', desc: 'Alerji ve ilaç bilgileri', route: 'TeacherMedical' },
  { icon: '📈', title: 'Fiziksel Gelişim', desc: 'Boy ve kilo ölçümü gir', route: 'TeacherPhysicalDevelopment' },
  { icon: '📣', title: 'Duyurular', desc: 'Kurum duyuruları', route: 'TeacherAnnouncements' },
  { icon: '💬', title: 'Mesajlar', desc: 'Velilerle yazış', route: 'TeacherMessages' },
  { icon: '👤', title: 'Profil', desc: 'Bilgiler ve çıkış', route: 'TeacherProfile' },
];

export default function TeacherDashboardScreen() {
  const navigation = useNavigation();
  const { loading, kullanici, kresAdi, currentClass, classChildren, reports, attendance } = useTeacherData();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) return <LoadingState text="Öğretmen paneli hazırlanıyor..." />;

  const today = new Date().toISOString().split('T')[0];
  const todayReports = reports.filter((item) => item.tarih === today).length;
  const todayAttendance = attendance.filter((item) => item.tarih === today && item.sinifId === currentClass?.id).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedBackground>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>{kresAdi || 'Kurum'}</Text>
              <Text style={styles.panelLabel}>Öğretmen Paneli</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Merhaba, {kullanici?.ad || kullanici?.kullaniciAdi || 'Öğretmen'} 👋</Text>
            </View>
            <View style={styles.headerActions}>
              <AppNotificationButton navigation={navigation} />
              <View style={styles.avatar}><Text style={styles.avatarText}>👩‍🏫</Text></View>
            </View>
          </View>

          {currentClass ? (
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>{currentClass.ad || 'Sınıfım'}</Text>
              <Text style={styles.heroSub}>Bugünkü sınıf özeti</Text>
              <View style={styles.statsRow}>
                {renderStat(styles, 'Çocuk', classChildren.length)}
                {renderStat(styles, 'Rapor', todayReports)}
                {renderStat(styles, 'Yoklama', todayAttendance)}
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
      </ThemedBackground>
    </SafeAreaView>
  );
}

function renderStat(styles, label, value) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 18, paddingBottom: 56 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  title: { fontSize: 23, fontWeight: '900', color: theme.primary },
  panelLabel: { marginTop: 2, fontSize: 12, color: theme.muted, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 14, color: theme.muted, fontWeight: '700' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  avatarText: { fontSize: 27 },
  hero: { backgroundColor: theme.primary, borderRadius: 24, padding: 18, marginBottom: 22 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: 12, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuCard: { width: '48%', backgroundColor: theme.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  menuIcon: { fontSize: 28, marginBottom: 8 },
  menuTitle: { fontSize: 15, fontWeight: '900', color: theme.text },
  menuDesc: { fontSize: 12, color: theme.muted, marginTop: 4, lineHeight: 17 },
});
