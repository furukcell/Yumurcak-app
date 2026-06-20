// ============================================================
// YUMURCAK — ParentDashboard.js
// Modern veli arayüzü — ana sayfa, raporlar, duyurular, profil
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  orange: '#FF9F1C',
  green: '#20B45B',
  red: '#FF4D6D',
  blue: '#3A7BFF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function ParentDashboardScreen() {
  const { kullanici, cikisYap } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [children, setChildren] = useState([]);
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const parentId = kullanici?.uid;
  const selectedChild = children[0];

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return undefined;
    }

    const childrenRef = ref(database, 'cocuklar');
    const unsubscribe = onValue(childrenRef, (snapshot) => {
      const data = snapshot.val();
      const myChildren = [];

      if (data) {
        Object.entries(data).forEach(([id, childData]) => {
          if (childData.veliIds?.includes(parentId)) {
            myChildren.push({ id, ...childData });
          }
        });
      }

      setChildren(myChildren);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [parentId]);

  useEffect(() => {
    const reportsRef = ref(database, 'gunlukRaporlar');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];

      if (data) {
        Object.entries(data).forEach(([id, reportData]) => {
          list.push({ id, ...reportData });
        });
      }

      list.sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
      setReports(list);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const duyuruRef = ref(database, 'duyurular');
    const unsubscribe = onValue(duyuruRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];

      if (data) {
        Object.entries(data).forEach(([id, item]) => {
          list.push({ id, ...item });
        });
      }

      list.sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));
      setAnnouncements(list);
    });

    return () => unsubscribe();
  }, []);

  const childReports = useMemo(() => {
    if (!selectedChild?.id) return [];
    return reports.filter((item) => item.cocukId === selectedChild.id);
  }, [reports, selectedChild?.id]);

  const todayReport = childReports[0];

  const getChildName = () => selectedChild?.ad || selectedChild?.adSoyad || 'Çocuğum';
  const getParentName = () => kullanici?.ad || `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || 'Veli';
  const getMood = (report) => report?.mood || report?.ruhHali || report?.durum || 'Mutlu';
  const getMeal = (report) => {
    if (!report) return 'İyi';
    if (report.yemekDurumu) return report.yemekDurumu;
    if (report.yemek?.kahvalti || report.yemek?.ogle || report.yemek?.araOgun) return 'İyi';
    return 'İyi';
  };
  const getSleep = (report) => {
    if (!report) return 'İyi';
    if (report.uyku?.sure) return `${report.uyku.sure} saat`;
    if (report.uykuDurumu) return report.uykuDurumu;
    return 'İyi';
  };
  const getAttendance = () => selectedChild ? 'Geldi' : '-';
  const getTeacherNote = (report) => report?.not || report?.ogretmenNotu || report?.notlar || 'Bugün için henüz öğretmen notu girilmedi.';

  const handleLogout = async () => {
    await cikisYap();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Veli ekranı hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        {activeTab === 'home' ? renderHome() : null}
        {activeTab === 'reports' ? renderReports() : null}
        {activeTab === 'announcements' ? renderAnnouncements() : null}
        {activeTab === 'profile' ? renderProfile() : null}
        {renderTabBar()}
      </View>
    </SafeAreaView>
  );

  function renderHome() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Yumurcak', '🔔')}

        <Text style={styles.greeting}>Merhaba, {getParentName()} 👋</Text>
        <Text style={styles.greetingSub}>Bugünün özetini senin için hazırladık.</Text>

        {selectedChild ? renderChildHero() : renderEmptyChildCard()}

        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.quickGrid}>
          {renderQuickAction('📋', 'Günlük Rapor', () => setActiveTab('reports'))}
          {renderQuickAction('📣', 'Duyurular', () => setActiveTab('announcements'))}
          {renderQuickAction('💬', 'Mesajlar', null)}
          {renderQuickAction('🖼️', 'Galeri', null)}
          {renderQuickAction('🍽️', 'Yemek Listesi', null)}
          {renderQuickAction('📁', 'Belgeler', null)}
        </View>
      </ScrollView>
    );
  }

  function renderReports() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Raporlar', '📅')}

        {!selectedChild ? renderEmptyChildCard() : null}

        {selectedChild && childReports.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Henüz rapor yok</Text>
            <Text style={styles.emptyDesc}>Öğretmen günlük rapor girdiğinde burada görünecek.</Text>
          </View>
        ) : null}

        {selectedChild && childReports.map((item, index) => renderReportCard(item, index))}
      </ScrollView>
    );
  }

  function renderAnnouncements() {
    const visibleAnnouncements = announcements.slice(0, 10);

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Duyurular', '⚙️')}

        {visibleAnnouncements.length === 0 ? (
          <>
            {renderAnnouncementCard({
              baslik: 'Yaz Okulu Kayıtları Başladı',
              icerik: 'Yaz okulu kayıtlarımız başlamıştır. Detaylar için kurum yönetimiyle iletişime geçebilirsiniz.',
              tarih: 'Örnek Duyuru',
              onem: 'Normal',
            })}
            {renderAnnouncementCard({
              baslik: 'Yarın Piknik Etkinliğimiz Var!',
              icerik: 'Çocuklarımızın rahat kıyafetler giymesi ve yanında su matarası getirmesi rica olunur.',
              tarih: 'Örnek Duyuru',
              onem: 'Acil',
            })}
          </>
        ) : (
          visibleAnnouncements.map((item) => renderAnnouncementCard(item))
        )}
      </ScrollView>
    );
  }

  function renderProfile() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Profil', '')}

        <View style={styles.profileHero}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileChildName}>{getChildName()}</Text>
            <Text style={styles.profileChildSub}>{selectedChild?.yas || selectedChild?.dogumTarihi || 'Kreş öğrencisi'}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Veli Bilgileri</Text>
          {renderInfoRow('👤', 'Veli Adı', getParentName())}
          {renderInfoRow('☎️', 'Telefon', kullanici?.telefon || '-')}
          {renderInfoRow('✉️', 'Kullanıcı Adı', kullanici?.kullaniciAdi || '-')}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Kurum Bilgileri</Text>
          {renderInfoRow('🏫', 'Sınıf', selectedChild?.sinifAdi || selectedChild?.sinifId || '-')}
          {renderInfoRow('👩‍🏫', 'Öğretmen', selectedChild?.ogretmenAdi || '-')}
          {renderInfoRow('🆘', 'Acil Durum', selectedChild?.acilDurumKisi || '-')}
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>✏️ Bilgileri Güncelle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>↩ Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderTopHeader(title, rightIcon) {
    return (
      <View style={styles.topHeader}>
        <View style={styles.headerSpacer} />
        <Text style={styles.topTitle}>{title}</Text>
        <Text style={styles.headerIcon}>{rightIcon}</Text>
      </View>
    );
  }

  function renderChildHero() {
    return (
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{getChildName()}</Text>
            <Text style={styles.heroSub}>Bugünün özeti</Text>
          </View>
          <View style={styles.heartCircle}><Text style={styles.heartText}>♡</Text></View>
        </View>

        <View style={styles.summaryPanel}>
          {renderSummaryItem('😊', 'Ruh Hali', getMood(todayReport), THEME.orange)}
          {renderSummaryItem('🍴', 'Yemek', getMeal(todayReport), THEME.primary)}
          {renderSummaryItem('🌙', 'Uyku', getSleep(todayReport), THEME.blue)}
          {renderSummaryItem('☑️', 'Yoklama', getAttendance(), THEME.green)}
        </View>
      </View>
    );
  }

  function renderEmptyChildCard() {
    return (
      <View style={styles.emptyStateCard}>
        <Text style={styles.emptyIcon}>👧</Text>
        <Text style={styles.emptyTitle}>Sisteme kayıtlı çocuk bulunmuyor</Text>
        <Text style={styles.emptyDesc}>Yönetici panelinden çocuğa bu veli bağlanmalı.</Text>
        <TouchableOpacity style={styles.smallLogoutButton} onPress={handleLogout}>
          <Text style={styles.smallLogoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSummaryItem(icon, label, value, color) {
    return (
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryIcon, { color }]}>{icon}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    );
  }

  function renderQuickAction(icon, label, onPress) {
    return (
      <TouchableOpacity
        key={label}
        style={styles.quickAction}
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress || undefined}
      >
        <Text style={styles.quickIcon}>{icon}</Text>
        <Text style={styles.quickLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function renderReportCard(item, index) {
    const isToday = index === 0;
    return (
      <View key={item.id} style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View>
              <Text style={styles.reportDay}>{isToday ? 'Bugün' : item.tarih || 'Rapor'}</Text>
              <Text style={styles.reportDate}>{item.tarih || '-'}</Text>
            </View>
            {isToday ? <Text style={styles.todayBadge}>Bugün</Text> : null}
          </View>

          <View style={styles.reportSummaryRow}>
            {renderMiniMetric('😊', getMood(item))}
            {renderMiniMetric('🍴', getMeal(item))}
            {renderMiniMetric('🌙', getSleep(item))}
            {renderMiniMetric('✅', 'Geldi')}
          </View>

          <View style={styles.teacherNoteBox}>
            <Text style={styles.teacherAvatar}>👩‍🏫</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherNoteTitle}>Öğretmen Notu</Text>
              <Text style={styles.teacherNote}>{getTeacherNote(item)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderMiniMetric(icon, value) {
    return (
      <View style={styles.miniMetric}>
        <Text style={styles.miniIcon}>{icon}</Text>
        <Text style={styles.miniValue}>{value}</Text>
      </View>
    );
  }

  function renderAnnouncementCard(item) {
    const isUrgent = item.onem === 'Acil' || item.acil === true || item.tip === 'acil';
    return (
      <View key={item.id || item.baslik} style={styles.announcementCard}>
        <View style={styles.announcementTop}>
          <Text style={[styles.announcementBadge, isUrgent && styles.announcementBadgeUrgent]}>Yeni Duyuru</Text>
          <Text style={[styles.importanceBadge, isUrgent && styles.importanceBadgeUrgent]}>{isUrgent ? 'Acil' : 'Normal'}</Text>
        </View>
        <Text style={styles.announcementTitle}>{item.baslik || item.title || 'Duyuru'}</Text>
        <Text style={styles.announcementBody}>{item.icerik || item.metin || item.aciklama || 'Duyuru içeriği burada görünecek.'}</Text>
        <View style={styles.announcementFooter}>
          <Text style={styles.announcementDate}>📅 {item.tarih || 'Bugün'}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
    );
  }

  function renderInfoRow(icon, label, value) {
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  }

  function renderTabBar() {
    return (
      <View style={styles.tabBar}>
        {renderTab('home', '⌂', 'Ana Sayfa')}
        {renderTab('reports', '▥', 'Raporlar')}
        {renderTab('announcements', '🔔', 'Duyurular')}
        {renderTab('profile', '♙', 'Profil')}
      </View>
    );
  }

  function renderTab(key, icon, label) {
    const active = activeTab === key;
    return (
      <TouchableOpacity key={key} style={styles.tabItem} onPress={() => setActiveTab(key)} activeOpacity={0.8}>
        <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  appShell: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 108 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '600' },

  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerSpacer: { width: 34 },
  topTitle: { color: THEME.primary, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  headerIcon: { width: 34, textAlign: 'right', fontSize: 20 },

  greeting: { fontSize: 20, fontWeight: '900', color: THEME.text, marginBottom: 4 },
  greetingSub: { fontSize: 13, color: THEME.muted, marginBottom: 18 },

  heroCard: {
    backgroundColor: THEME.primary,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    shadowColor: THEME.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  avatarLarge: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  avatarText: { fontSize: 36 },
  heroName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  heartCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heartText: { color: THEME.primary, fontSize: 25, fontWeight: '900' },

  summaryPanel: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 14, flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: THEME.border },
  summaryIcon: { fontSize: 22, marginBottom: 5 },
  summaryLabel: { fontSize: 11, color: THEME.text, fontWeight: '800' },
  summaryValue: { fontSize: 11, color: THEME.green, fontWeight: '900', marginTop: 4, textAlign: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickAction: {
    width: '31.5%',
    aspectRatio: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  quickIcon: { fontSize: 30, marginBottom: 10 },
  quickLabel: { fontSize: 12, fontWeight: '900', color: THEME.text, textAlign: 'center' },

  emptyStateCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: THEME.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  smallLogoutButton: { marginTop: 18, backgroundColor: THEME.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18 },
  smallLogoutText: { color: '#FFFFFF', fontWeight: '900' },

  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.primary, marginTop: 20 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#DED2FF', marginTop: 4 },
  reportCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  reportDay: { fontSize: 16, fontWeight: '900', color: THEME.text },
  reportDate: { fontSize: 12, color: THEME.muted, marginTop: 2 },
  todayBadge: { backgroundColor: THEME.primarySoft, color: THEME.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  reportSummaryRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: THEME.border, paddingVertical: 12, marginBottom: 12 },
  miniMetric: { flex: 1, alignItems: 'center' },
  miniIcon: { fontSize: 22, marginBottom: 4 },
  miniValue: { fontSize: 11, color: THEME.text, fontWeight: '700', textAlign: 'center' },
  teacherNoteBox: { flexDirection: 'row', alignItems: 'flex-start' },
  teacherAvatar: { fontSize: 28, marginRight: 9 },
  teacherNoteTitle: { fontSize: 12, color: THEME.muted, fontWeight: '900' },
  teacherNote: { fontSize: 12, color: THEME.text, marginTop: 3, lineHeight: 17 },

  announcementCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  announcementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  announcementBadge: { backgroundColor: THEME.primary, color: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  announcementBadgeUrgent: { backgroundColor: '#FF5A1F' },
  importanceBadge: { backgroundColor: '#F0EEF7', color: THEME.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  importanceBadgeUrgent: { backgroundColor: '#FFE5EB', color: THEME.red },
  announcementTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 9 },
  announcementBody: { fontSize: 14, color: THEME.text, lineHeight: 21 },
  announcementFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  announcementDate: { fontSize: 12, color: THEME.muted, fontWeight: '700' },
  chevron: { fontSize: 30, color: THEME.muted },

  profileHero: {
    backgroundColor: THEME.primary,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileChildName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  profileChildSub: { color: 'rgba(255,255,255,0.86)', marginTop: 4, fontWeight: '700' },
  infoCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  infoTitle: { fontSize: 16, color: THEME.text, fontWeight: '900', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  infoIcon: { width: 28, fontSize: 16 },
  infoLabel: { flex: 1, color: THEME.muted, fontSize: 13, fontWeight: '700' },
  infoValue: { flex: 1.2, color: THEME.text, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#D9CCFF' },
  secondaryButtonText: { color: THEME.primary, fontSize: 15, fontWeight: '900' },

  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 22, color: THEME.muted, marginBottom: 4 },
  tabIconActive: { color: THEME.primary },
  tabLabel: { fontSize: 10, color: THEME.muted, fontWeight: '800' },
  tabLabelActive: { color: THEME.primary, fontWeight: '900' },
});
