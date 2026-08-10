import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNodeList, useParentBase, LoadingScreen, EmptyState } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemePatternBackground from '../../components/ThemePatternBackground';
import AppNotificationButton from '../../components/AppNotificationButton';
import { useUnreadMessagesCount } from '../../utils/messageHelpers';
import { uyumGorunurMu } from '../../utils/uyum';
import { getChildBirthDate, calculateChildAge } from '../../utils/childDates';

function getPhysicalValue(item, key) {
  const value = item?.[key];
  if (typeof value === 'number') return value;
  const text = String(value || '').replace(',', '.');
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatMeasurement(item, key, suffix) {
  const value = getPhysicalValue(item, key);
  if (!value) return '-';
  return `${value}${suffix}`;
}

function getSortableDate(item) {
  const key = item?.tarih || item?.dateKey || '';
  if (key) return new Date(key).getTime() || 0;
  return Number(item?.createdAt || item?.updatedAt || 0);
}

function formatAllergySummary(raw, t) {
  const tags = String(raw || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!tags.length) return { text: t('parent.dashboard.none'), hasAllergy: false };
  const shown = tags.slice(0, 2).join(', ');
  const extra = tags.length > 2 ? ` +${tags.length - 2}` : '';
  return { text: `${shown}${extra}`, hasAllergy: true };
}

export default function ParentDashboardScreen({ navigation }) {
  
const base = useParentBase();
const { theme } = useAppTheme();
const { t } = useTranslation();
const styles = useMemo(() => createStyles(theme), [theme]);
const { loading, selectedChild, childName, parentName, cikisYap, kresAdi, parentPhotoUrl, parentId, kresId, sinif, ogretmen } = base;
const physicalRaw = useNodeList('fizikselGelisim', kresId);
const unreadMessages = useUnreadMessagesCount(parentId);
const [medical, setMedical] = useState(null);

useEffect(() => {
  if (!selectedChild?.id) {
    setMedical(null);
    return undefined;
  }
  const r = ref(database, `medikalBilgiler/${selectedChild.id}`);
  const unsub = onValue(r, (snap) => setMedical(snap.val()));
  return () => unsub();
}, [selectedChild?.id]);

  const lastPhysical = useMemo(() => {
    if (!selectedChild?.id) return null;
    return physicalRaw
      .filter((item) => item.cocukId === selectedChild.id)
      .sort((a, b) => getSortableDate(b) - getSortableDate(a))[0] || null;
  }, [physicalRaw, selectedChild?.id]);

  if (loading) return <LoadingScreen text={t('parent.dashboard.loading')} />;

  const childAge = calculateChildAge(getChildBirthDate(selectedChild));
  const sinifAdi = sinif?.ad || selectedChild?.sinifAdi || selectedChild?.sinifAd || '';
  const ogretmenAdi = `${ogretmen?.ad || ''} ${ogretmen?.soyad || ''}`.trim();
  const metaParts = [childAge, sinifAdi, ogretmenAdi].filter(Boolean);
  const allergy = formatAllergySummary(medical?.alerjiler, t);
  const showUyumCard = selectedChild && uyumGorunurMu(selectedChild);

  const featuredActions = [
    ['🔔', t('parent.dashboard.institutionBell'), 'ParentBell', t('parent.dashboard.bellDesc'), '#FFF4C7', '#F5C84B'],
    ['💳', t('parent.dashboard.paymentTracking'), 'ParentPayments', t('parent.dashboard.paymentTrackingDesc'), '#E8FBEA', '#7DDC8C'],
    ['🗳️', t('parent.dashboard.polls'), 'ParentPolls', t('parent.dashboard.pollsDesc'), '#DFF4FF', '#7CCAF0'],
    ['☎️', t('parent.dashboard.institutionContact'), 'ParentContact', t('parent.dashboard.institutionContactDesc'), '#F1E6FF', '#C69AF6'],
  ];

  const quickActions = [
    ['📋', t('parent.dashboard.dailyReport'), 'ParentReports', '#FFF0DD', '#F3B36C'],
    ['✅', t('parent.dashboard.attendance'), 'ParentAttendance', '#E7FAD9', '#8ED36A'],
    ['🍽️', t('parent.dashboard.mealList'), 'ParentMeals', '#FFE4EA', '#F5A0B3'],
    ['📘', t('parent.dashboard.lessonSchedule'), 'ParentSchedule', '#E4ECFF', '#8FA6F5'],
    ['💬', t('parent.dashboard.messages'), 'ParentMessages', '#E9F0FF', '#94AFFF'],
    ['🖼️', t('parent.dashboard.gallery'), 'ParentGallery', '#E8F8E9', '#86D78B'],
    ['🎉', t('parent.dashboard.events'), 'ParentEvents', '#EFE4FF', '#B99BF6'],
    ['📈', t('parent.dashboard.development'), 'ParentDevelopment', '#E0F5FF', '#81CFF1'],
    ['🩺', t('parent.dashboard.medical'), 'ParentMedical', '#DDF8F4', '#67D6C9'],
    ['🚌', t('parent.dashboard.service'), 'ParentService', '#FFF1D5', '#EDBA5E'],
    ['📣', t('parent.dashboard.announcements'), 'ParentAnnouncements', '#FFE6F5', '#EE99D0'],
    ...(showUyumCard ? [['🌱', t('parent.dashboard.adaptationScore'), 'ParentUyum', '#E8FBEA', '#7DDC8C']] : []),
    ['🏅', t('parent.dashboard.myBadges'), 'ParentBadges', '#FFF7E8', '#F0C36A'],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemePatternBackground />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo} numberOfLines={1}>{kresAdi || t('parent.dashboard.institutionFallback')}</Text>
            <Text style={styles.brandSub}>{t('parent.dashboard.parentPanel')}</Text>
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

        <Text style={styles.greeting}>{t('parent.dashboard.greeting', { parentName })} 👋</Text>
        <Text style={styles.greetingSub}>{t('parent.dashboard.greetingSub')}</Text>

        {selectedChild ? (
          <View style={styles.idCard}>
            <View style={styles.idTop}>
              <View style={styles.idAvatar}>
                {parentPhotoUrl ? (
                  <Image source={{ uri: parentPhotoUrl }} style={styles.idAvatarImage} />
                ) : (
                  <Text style={styles.idAvatarText}>👧</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.idName} numberOfLines={1}>{childName}</Text>
                <Text style={styles.idMeta} numberOfLines={1}>{metaParts.length ? metaParts.join(' · ') : kresAdi || t('parent.dashboard.daycareStudent')}</Text>
              </View>
            </View>
            <View style={styles.idStatsBar}>
              <View style={styles.idStat}>
                <Text style={styles.idStatIcon}>📏</Text>
                <Text style={styles.idStatLabel}>{t('parent.dashboard.height')}</Text>
                <Text style={styles.idStatValue}>{formatMeasurement(lastPhysical, 'boy', ' cm')}</Text>
              </View>
              <View style={styles.idStatDivider} />
              <View style={styles.idStat}>
                <Text style={styles.idStatIcon}>⚖️</Text>
                <Text style={styles.idStatLabel}>{t('parent.dashboard.weight')}</Text>
                <Text style={styles.idStatValue}>{formatMeasurement(lastPhysical, 'kilo', ' kg')}</Text>
              </View>
              <View style={styles.idStatDivider} />
              <View style={styles.idStat}>
                <Text style={styles.idStatIcon}>⚠️</Text>
                <Text style={styles.idStatLabel}>{t('parent.dashboard.allergy')}</Text>
                <Text style={[styles.idStatValue, allergy.hasAllergy && styles.idStatValueWarn]} numberOfLines={1}>{allergy.text}</Text>
              </View>
            </View>
          </View>
        ) : (
          <EmptyState icon="👧" title={t('parent.summary.noChildTitle')} desc={t('parent.summary.noChildDesc')} />
        )}

        <Text style={styles.sectionTitle}>{t('parent.dashboard.quickActionsTitle')}</Text>
        <View style={styles.quickGrid}>
          {featuredActions.map(([icon, label, route, desc, bg, border]) => (
            <TouchableOpacity key={route} style={[styles.quickAction, styles.featuredAction, { backgroundColor: bg, borderColor: border }]} onPress={() => navigation.navigate(route)} activeOpacity={0.82}>
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
              <Text style={styles.quickDesc}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('parent.dashboard.otherActionsTitle')}</Text>
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
          <Text style={styles.logoutText}>↩ {t('parent.dashboard.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  idCard: { borderRadius: 24, marginBottom: 24, shadowColor: theme.primary, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6, overflow: 'hidden' },
  idTop: { backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22 },
  idAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.65)', overflow: 'hidden' },
  idAvatarImage: { width: 60, height: 60, borderRadius: 30 },
  idAvatarText: { fontSize: 28 },
  idName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  idMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 3, fontWeight: '700' },
  idStatsBar: { backgroundColor: theme.card, marginTop: -10, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row' },
  idStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  idStatDivider: { width: 1, backgroundColor: theme.border, marginVertical: 2 },
  idStatIcon: { fontSize: 17 },
  idStatLabel: { color: theme.muted, fontSize: 10, fontWeight: '800', marginTop: 3 },
  idStatValue: { color: theme.text, fontSize: 13, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  idStatValueWarn: { color: theme.red },
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
