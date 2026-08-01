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
import { useUnreadMessagesCount } from '../../utils/messageHelpers';

const MENU = [
  { icon: '👧', title: 'Çocuklarım', desc: 'Sınıfındaki çocuklar', route: 'TeacherChildren', bg: '#FFE8F0', border: '#F7A8C4' },
  { icon: '✅', title: 'Yoklama', desc: 'Günlük yoklama gir', route: 'TeacherAttendance', bg: '#E7F8D8', border: '#9EDC7A' },
  { icon: '📝', title: 'Günlük Rapor', desc: 'Çocuk seç ve rapor gir', route: 'TeacherChildren', params: { mode: 'report' }, bg: '#FFF0D9', border: '#F0B86A' },
  { icon: '📚', title: 'Ders Programı', desc: 'Haftalık program', route: 'TeacherSchedule', bg: '#E6F3FF', border: '#8AC3F5' },
  { icon: '🍽️', title: 'Yemek Listesi', desc: 'Kurum menüsü', route: 'TeacherMeals', bg: '#FFE8DC', border: '#F4A47E' },
  { icon: '💬', title: 'Mesajlar', desc: 'Velilerle yazış', route: 'TeacherMessages', bg: '#EAF7FF', border: '#77C7EA' },
  { icon: '🖼️', title: 'Galeri', desc: 'Sınıf paylaşımları', route: 'TeacherGallery', bg: '#E8F5F0', border: '#7CC8AA' },
  { icon: '📣', title: 'Duyurular', desc: 'Kurum duyuruları', route: 'TeacherAnnouncements', bg: '#FFF6CF', border: '#E8C94F' },
  { icon: '🎉', title: 'Etkinlikler', desc: 'Sınıf etkinlikleri', route: 'TeacherEvents', bg: '#F0E7FF', border: '#B99AF5' },
  { icon: '🌱', title: 'Uyum Modülü', desc: 'Yeni başlayan çocukların 30 günlük uyumu', route: 'TeacherAdaptationTracking', bg: '#EAF2FF', border: '#8DB2FF' },
  { icon: '🌟', title: 'Haftanın Yıldızı', desc: 'Cuma rozeti ver', route: 'TeacherWeeklyStar', bg: '#FFF7E8', border: '#FFE0A3' },
  { icon: '🩺', title: 'Medikal', desc: 'Alerji ve ilaç bilgileri', route: 'TeacherMedical', bg: '#E4FAF7', border: '#6DD3C8' },
  { icon: '🎂', title: 'Doğum Günleri', desc: 'Yaklaşan doğum günleri', route: 'TeacherBirthdays', bg: '#F7F1FF', border: '#D9C9FF' },
  { icon: '📈', title: 'Fiziksel Gelişim', desc: 'Boy ve kilo ölçümü gir', route: 'TeacherPhysicalDevelopment', bg: '#E9EEFF', border: '#9AAEF5' },
  { icon: '🎨', title: 'Tema Ayarları', desc: 'Sınıf temasını değiştir', route: 'TeacherTheme', bg: '#F0E7FF', border: '#B99AF5' },
  { icon: '👤', title: 'Profil', desc: 'Bilgiler ve çıkış', route: 'TeacherProfile', bg: '#F2EDE7', border: '#CDB8A6' },
  
   
];

export default function TeacherDashboardScreen() {
  const navigation = useNavigation();
  const { loading, kullanici, kresAdi, currentClass, classChildren, reports, attendance } = useTeacherData();
  const teacherId = kullanici?.uid || kullanici?.id;
  const unreadMessages = useUnreadMessagesCount(teacherId);
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
              <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('TeacherProfile')} activeOpacity={0.85}>
                <Text style={styles.avatarText}>👩‍🏫</Text>
              </TouchableOpacity>
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
            {MENU.map((item) => {
              const isMessages = item.route === 'TeacherMessages';
              const badgeCount = isMessages ? unreadMessages : 0;

              return (
                <TouchableOpacity key={item.title} style={[styles.menuCard, { backgroundColor: item.bg, borderColor: item.border }]} onPress={() => navigation.navigate(item.route, item.params || undefined)} activeOpacity={0.85}>
                  <View style={styles.menuIconRow}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                    {badgeCount > 0 ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text></View> : null}
                  </View>
                  <Text style={[styles.menuTitle, badgeCount > 0 && styles.menuTitleUnread]}>{item.title}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </TouchableOpacity>
              );
            })}
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
  safeArea: { flex: 1, backgroundColor: theme.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
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
  menuCard: { width: '48%', borderRadius: 22, padding: 15, marginBottom: 12, borderWidth: 1.2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  menuIcon: { fontSize: 28, marginBottom: 8 },
  menuIconRow: { flexDirection: 'row', alignItems: 'center' },
  menuBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8, marginBottom: 8 },
  menuBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 11 },
  menuTitle: { fontSize: 15, fontWeight: '900', color: theme.text },
  menuTitleUnread: { color: theme.primary },
  menuDesc: { fontSize: 12, color: theme.muted, marginTop: 4, lineHeight: 17 },
});
