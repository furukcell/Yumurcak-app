import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { useNodeList, useParentBase, LoadingScreen, EmptyState } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemePatternBackground from '../../components/ThemePatternBackground';
import AppNotificationButton from '../../components/AppNotificationButton';
import { useUnreadMessagesCount } from '../../utils/messageHelpers';
import { uyumGorunurMu } from '../../utils/uyum';

export default function ParentDashboardScreen({ navigation }) {
  
const base = useParentBase();
const { theme } = useAppTheme();
const styles = useMemo(() => createStyles(theme), [theme]);
const { loading, selectedChild, childName, parentName, cikisYap, kresAdi, parentPhotoUrl, parentId, kresId } = base;
const reports = useNodeList('gunlukRaporlar', kresId);
const unreadMessages = useUnreadMessagesCount(parentId);

  const childReports = useMemo(() => {
    if (!selectedChild?.id) return [];
    return reports
      .filter((item) => item.cocukId === selectedChild.id)
      .sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
  }, [reports, selectedChild?.id]);

  const todayReport = childReports[0];

  if (loading) return <LoadingScreen text="Veli ekranı hazırlanıyor..." />;

  const getMood = () => todayReport?.mood || todayReport?.ruhHali || todayReport?.durum || 'Mutlu';
  const getMeal = () => todayReport?.yemekDurumu || (todayReport?.yemek ? 'İyi' : 'İyi');
  const getSleep = () => todayReport?.uyku?.sure ? `${todayReport.uyku.sure} saat` : (todayReport?.uykuDurumu || 'İyi');
  const showUyumCard = selectedChild && uyumGorunurMu(selectedChild);

  const featuredActions = [
    ['🔔', 'Kurum Zili', 'ParentBell', 'Geliyorum / kapıdayım bildir', '#FFF4C7', '#F5C84B'],
    ['💳', 'Ödeme Takibi', 'ParentPayments', 'Aidat ve ücret kayıtları', '#E8FBEA', '#7DDC8C'],
    ['🗳️', 'Anketler', 'ParentPolls', 'Kurum anketleri ve oylamalar', '#DFF4FF', '#7CCAF0'],
    ['☎️', 'Kurum İletişim', 'ParentContact', 'Telefon, adres ve yetkili', '#F1E6FF', '#C69AF6'],
  ];

  const quickActions = [
    ['📋', 'Günlük Rapor', 'ParentReports', '#FFF0DD', '#F3B36C'],
    ['✅', 'Yoklama', 'ParentAttendance', '#E7FAD9', '#8ED36A'],
    ['🍽️', 'Yemek Listesi', 'ParentMeals', '#FFE4EA', '#F5A0B3'],
    ['💬', 'Mesajlar', 'ParentMessages', '#E9F0FF', '#94AFFF'],
    ['🖼️', 'Galeri', 'ParentGallery', '#E8F8E9', '#86D78B'],
    ['🎉', 'Etkinlikler', 'ParentEvents', '#EFE4FF', '#B99BF6'],
    ['📈', 'Gelişim', 'ParentDevelopment', '#E0F5FF', '#81CFF1'],
    ['🩺', 'Medikal', 'ParentMedical', '#DDF8F4', '#67D6C9'],
    ['🚌', 'Servis', 'ParentService', '#FFF1D5', '#EDBA5E'],
    ['📣', 'Duyurular', 'ParentAnnouncements', '#FFE6F5', '#EE99D0'],
    ['📁', 'Belgeler', 'ParentDocuments', '#F2EAFE', '#BA9BEA'],
    ...(showUyumCard ? [['🌱', 'Uyum Skoru', 'ParentUyum', '#E8FBEA', '#7DDC8C']] : []),
    ['🏅', 'Rozetlerim', 'ParentBadges', '#FFF7E8', '#F0C36A'],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemePatternBackground />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo} numberOfLines={1}>{kresAdi || 'Kurum'}</Text>
            <Text style={styles.brandSub}>Veli Paneli</Text>
          </View>
         <View style={styles.headerActions}>
         <AppNotificationButton navigation={navigation} />
         <TouchableOpacity onPress={() => navigation.navigate('ParentProfile')} style={styles.profileButton}>
         {parentPhotoUrl ? (
         <Image source={{ uri: parentPhotoUrl }} style={styles.profileImage} />
       ) : (
         <Text style={styles.profileButtonText}>👤</Text>
       )}
      </TouchableOpacity>
   </View>
    </View>

        <Text style={styles.greeting}>Merhaba, {parentName} 👋</Text>
        <Text style={styles.greetingSub}>Bilgi ve işlemlere buradan hızlıca ulaşabilirsin.</Text>

        {selectedChild ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                {parentPhotoUrl ? (
                  <Image source={{ uri: parentPhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>👧</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{childName}</Text>
                <Text style={styles.heroSub}>Bugünün özeti</Text>
              </View>
            </View>
            <View style={styles.summaryPanel}>
              {renderSummaryItem(styles, '😊', 'Ruh Hali', getMood(), theme.orange)}
              {renderSummaryItem(styles, '🍴', 'Yemek', getMeal(), theme.primary)}
              {renderSummaryItem(styles, '🌙', 'Uyku', getSleep(), theme.blue)}
              {renderSummaryItem(styles, '☑️', 'Yoklama', selectedChild ? 'Geldi' : '-', theme.green)}
            </View>
          </View>
        ) : (
          <EmptyState icon="👧" title="Sisteme kayıtlı çocuk bulunmuyor" desc="Yönetici panelinden çocuğa bu veli bağlanmalı." />
        )}

        <Text style={styles.sectionTitle}>Hızlı Aksiyonlar</Text>
        <View style={styles.quickGrid}>
          {featuredActions.map(([icon, label, route, desc, bg, border]) => (
            <TouchableOpacity key={route} style={[styles.quickAction, styles.featuredAction, { backgroundColor: bg, borderColor: border }]} onPress={() => navigation.navigate(route)} activeOpacity={0.82}>
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
              <Text style={styles.quickDesc}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Diğer İşlemler</Text>
        <View style={styles.quickGrid}>
          {quickActions.map(([icon, label, route, bg, border]) => {
            const isMessages = route === 'ParentMessages';
            const badgeCount = isMessages ? unreadMessages : 0;

            return (
              <TouchableOpacity key={route} style={[styles.quickAction, { backgroundColor: bg, borderColor: border }]} onPress={() => navigation.navigate(route)} activeOpacity={0.82}>
                <View style={styles.quickIconRow}>
                  <Text style={styles.quickIcon}>{icon}</Text>
                  {badgeCount > 0 ? (
                    <View style={styles.quickBadge}>
                      <Text style={styles.quickBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.quickLabel, badgeCount > 0 && styles.quickLabelUnread]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.logoutText}>↩ Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function renderSummaryItem(styles, icon, label, value, color) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryIcon, { color }]}>{icon}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 96 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { color: theme.primary, fontSize: 23, fontWeight: '900' },
  brandSub: { color: theme.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  profileButtonText: { fontSize: 20 },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  greeting: { fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 4 },
  greetingSub: { fontSize: 13, color: theme.muted, marginBottom: 18 },
  heroCard: { backgroundColor: theme.primary, borderRadius: 24, padding: 16, marginBottom: 24, shadowColor: theme.primary, shadowOpacity: 0.22, shadowRadius: 18, elevation: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.65)', overflow: 'hidden' },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  avatarText: { fontSize: 36 },
  heroName: { color: '#fff', fontSize: 21, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  summaryPanel: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 10, flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  summaryIcon: { fontSize: 20, marginBottom: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '700' },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 12, marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  quickAction: { width: '48%', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  featuredAction: { minHeight: 118, justifyContent: 'center' },
  quickIcon: { fontSize: 29, marginBottom: 8 },
  quickIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  quickBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 6, marginBottom: 8 },
  quickBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 11 },
  quickLabel: { fontSize: 13, color: theme.text, fontWeight: '900', textAlign: 'center' },
  quickLabelUnread: { color: theme.primary },
  quickDesc: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 5, textAlign: 'center', lineHeight: 15 },
  logoutButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  logoutText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
});
