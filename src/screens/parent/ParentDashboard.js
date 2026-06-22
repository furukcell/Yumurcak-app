import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { useNodeList, useParentBase, LoadingScreen, EmptyState } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemePatternBackground from '../../components/ThemePatternBackground';

export default function ParentDashboardScreen({ navigation }) {
  const base = useParentBase();
  const reports = useNodeList('gunlukRaporlar');
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { loading, selectedChild, childName, parentName, cikisYap, kresAdi, parentPhotoUrl } = base;

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

  const featuredActions = [
    ['🔔', 'Kurum Zili', 'ParentBell', 'Geliyorum / kapıdayım bildir'],
    ['💳', 'Ödeme Takibi', 'ParentPayments', 'Aidat ve ücret kayıtları'],
    ['🗳️', 'Anketler', 'ParentPolls', 'Kurum anketleri ve oylamalar'],
    ['☎️', 'Kurum İletişim', 'ParentContact', 'Telefon, adres ve yetkili'],
  ];

  const quickActions = [
    ['📋', 'Günlük Rapor', 'ParentReports'],
    ['✅', 'Yoklama', 'ParentAttendance'],
    ['🍽️', 'Yemek Listesi', 'ParentMeals'],
    ['🎉', 'Etkinlikler', 'ParentEvents'],
    ['📈', 'Gelişim', 'ParentDevelopment'],
    ['🩺', 'Medikal', 'ParentMedical'],
    ['🚌', 'Servis', 'ParentService'],
    ['📣', 'Duyurular', 'ParentAnnouncements'],
    ['💬', 'Mesajlar', 'ParentMessages'],
    ['🖼️', 'Galeri', 'ParentGallery'],
    ['📁', 'Belgeler', 'ParentDocuments'],
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
          <TouchableOpacity onPress={() => navigation.navigate('ParentProfile')} style={styles.profileButton}>
            {parentPhotoUrl ? (
              <Image source={{ uri: parentPhotoUrl }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileButtonText}>👤</Text>
            )}
          </TouchableOpacity>
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
          {featuredActions.map(([icon, label, route, desc]) => (
            <TouchableOpacity key={route} style={[styles.quickAction, styles.featuredAction]} onPress={() => navigation.navigate(route)} activeOpacity={0.82}>
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
              <Text style={styles.quickDesc}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Diğer İşlemler</Text>
        <View style={styles.quickGrid}>
          {quickActions.map(([icon, label, route]) => (
            <TouchableOpacity key={route} style={styles.quickAction} onPress={() => navigation.navigate(route)} activeOpacity={0.82}>
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
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
  quickAction: { width: '48%', backgroundColor: theme.card, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  featuredAction: { minHeight: 118, justifyContent: 'center' },
  quickIcon: { fontSize: 27, marginBottom: 8 },
  quickLabel: { fontSize: 13, color: theme.text, fontWeight: '900', textAlign: 'center' },
  quickDesc: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 5, textAlign: 'center', lineHeight: 15 },
  logoutButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  logoutText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
});