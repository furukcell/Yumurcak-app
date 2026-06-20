import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNodeList, useParentBase, LoadingScreen, EmptyState, THEME } from './parentShared';

export default function ParentDashboardScreen({ navigation }) {
  const base = useParentBase();
  const reports = useNodeList('gunlukRaporlar');
  const { loading, selectedChild, childName, parentName, cikisYap } = base;

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

  const quickActions = [
    ['📋', 'Günlük Rapor', 'ParentReports'],
    ['✅', 'Yoklama', 'ParentAttendance'],
    ['🍽️', 'Yemek Listesi', 'ParentMeals'],
    ['🎉', 'Etkinlikler', 'ParentEvents'],
    ['📈', 'Gelişim', 'ParentDevelopment'],
    ['🩺', 'Medikal', 'ParentMedical'],
    ['☎️', 'Kurum İletişim', 'ParentContact'],
    ['🚌', 'Servis', 'ParentService'],
    ['📣', 'Duyurular', 'ParentAnnouncements'],
    ['💬', 'Mesajlar', 'ParentMessages'],
    ['🖼️', 'Galeri', 'ParentGallery'],
    ['📁', 'Belgeler', 'ParentDocuments'],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <Text style={styles.logo}>Yumurcak</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ParentProfile')} style={styles.profileButton}>
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.greeting}>Merhaba, {parentName} 👋</Text>
        <Text style={styles.greetingSub}>Bugünün özetini senin için hazırladık.</Text>

        {selectedChild ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}><Text style={styles.avatarText}>👧</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{childName}</Text>
                <Text style={styles.heroSub}>Bugünün özeti</Text>
              </View>
            </View>
            <View style={styles.summaryPanel}>
              {renderSummaryItem('😊', 'Ruh Hali', getMood(), THEME.orange)}
              {renderSummaryItem('🍴', 'Yemek', getMeal(), THEME.primary)}
              {renderSummaryItem('🌙', 'Uyku', getSleep(), THEME.blue)}
              {renderSummaryItem('☑️', 'Yoklama', selectedChild ? 'Geldi' : '-', THEME.green)}
            </View>
          </View>
        ) : (
          <EmptyState icon="👧" title="Sisteme kayıtlı çocuk bulunmuyor" desc="Yönetici panelinden çocuğa bu veli bağlanmalı." />
        )}

        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
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

function renderSummaryItem(icon, label, value, color) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryIcon, { color }]}>{icon}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 36 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  logo: { color: THEME.primary, fontSize: 25, fontWeight: '900' },
  profileButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },
  profileButtonText: { fontSize: 20 },
  greeting: { fontSize: 20, fontWeight: '900', color: THEME.text, marginBottom: 4 },
  greetingSub: { fontSize: 13, color: THEME.muted, marginBottom: 18 },
  heroCard: { backgroundColor: THEME.primary, borderRadius: 24, padding: 16, marginBottom: 24, shadowColor: THEME.primary, shadowOpacity: 0.22, shadowRadius: 18, elevation: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.65)' },
  avatarText: { fontSize: 36 },
  heroName: { color: '#fff', fontSize: 21, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  summaryPanel: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 10, flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  summaryIcon: { fontSize: 20, marginBottom: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '700' },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickAction: { width: '48%', backgroundColor: THEME.card, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  quickIcon: { fontSize: 27, marginBottom: 8 },
  quickLabel: { fontSize: 13, color: THEME.text, fontWeight: '900', textAlign: 'center' },
  logoutButton: { backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  logoutText: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
});
