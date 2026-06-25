import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';

function parseDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const tr = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = parseDate(value);
  if (!d) return 'Belirtilmemiş';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function getAge(value) {
  const birth = parseDate(value);
  if (!birth) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const thisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (thisYear > now) age -= 1;
  return age >= 0 ? `${age} yaşında` : '';
}

function getDaysLeft(value) {
  const birth = parseDate(value);
  if (!birth) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let target = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (target < today) target = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function getInitials(child) {
  return getChildName(child).split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr-TR') || 'Ç';
}

export default function TeacherBirthdaysScreen() {
  const navigation = useNavigation();
  const { loading, currentClass, classChildren } = useTeacherData();

  const list = useMemo(() => {
    return (classChildren || [])
      .map((child) => ({ ...child, daysLeft: getDaysLeft(child.dogumTarihi) }))
      .filter((child) => child.daysLeft !== null)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [classChildren]);

  const thisMonth = useMemo(() => {
    const month = new Date().getMonth();
    return list.filter((child) => parseDate(child.dogumTarihi)?.getMonth() === month).length;
  }, [list]);

  const next30 = list.filter((child) => child.daysLeft <= 30).length;

  if (loading) return <LoadingState text="Doğum günleri hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Doğum Günleri" subtitle={currentClass?.ad || 'Sınıfım'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title="Sınıf bulunamadı" desc="Öğretmen hesabı bir sınıfa bağlı olmalı." />
        ) : list.length === 0 ? (
          <EmptyState icon="🎂" title="Doğum tarihi yok" desc="Çocukların doğum tarihi eklendiğinde burada sıralanacak." />
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Yaklaşan Doğum Günleri</Text>
                <Text style={styles.heroText}>Sınıfınızdaki doğum günlerini en erkenden en geç olana doğru gösterir.</Text>
              </View>
              <Text style={styles.heroIcon}>🎂</Text>
            </View>

            <View style={styles.statsRow}>
              <Stat icon="📅" label="Bu Ay" value={thisMonth} sub="çocuk" />
              <Stat icon="🎁" label="Yaklaşan" value={next30} sub="30 gün" />
              <Stat icon="🎉" label="Bu Yıl" value={list.length} sub="doğum günü" />
            </View>

            <Text style={styles.sectionTitle}>En erken doğum gününden en geç olana</Text>

            {list.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(child)}</Text></View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{getChildName(child)}</Text>
                  <Text style={styles.birthText}>Doğum: {formatDate(child.dogumTarihi)}</Text>
                  <Text style={styles.ageText}>{getAge(child.dogumTarihi) || 'Yaş hesaplanamadı'}</Text>
                </View>
                <View style={[styles.daysBox, child.daysLeft === 0 && styles.todayBox]}>
                  <Text style={styles.daysNumber}>{child.daysLeft === 0 ? '🎉' : child.daysLeft}</Text>
                  <Text style={styles.daysText}>{child.daysLeft === 0 ? 'Bugün' : 'gün sonra'}</Text>
                </View>
              </View>
            ))}

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>Günü geçmiş doğum günleri otomatik olarak bir sonraki yıl için hesaplanır.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, label, value, sub }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: '#F7F1FF', borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#D9C9FF', flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: THEME.primary, fontWeight: '900', fontSize: 21, marginBottom: 8 },
  heroText: { color: THEME.text, fontWeight: '700', lineHeight: 22, fontSize: 14 },
  heroIcon: { fontSize: 54, marginLeft: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: THEME.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  statIcon: { fontSize: 23, marginBottom: 5 },
  statLabel: { color: THEME.muted, fontWeight: '800', fontSize: 12 },
  statValue: { color: THEME.text, fontWeight: '900', fontSize: 22, marginTop: 3 },
  statSub: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 1 },
  sectionTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  childCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: THEME.primary, fontWeight: '900', fontSize: 18 },
  childInfo: { flex: 1, minWidth: 0 },
  childName: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  birthText: { color: THEME.primary, fontWeight: '800', marginTop: 5 },
  ageText: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  daysBox: { minWidth: 84, backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center', marginLeft: 8 },
  todayBox: { backgroundColor: '#FFE8F0' },
  daysNumber: { color: THEME.primary, fontWeight: '900', fontSize: 23 },
  daysText: { color: THEME.primary, fontWeight: '800', fontSize: 12 },
  infoCard: { backgroundColor: '#FFF9E9', borderRadius: 20, padding: 14, marginTop: 6, borderWidth: 1, borderColor: '#FFE6A8', flexDirection: 'row', alignItems: 'center' },
  infoIcon: { fontSize: 27, marginRight: 10 },
  infoText: { flex: 1, color: THEME.muted, fontWeight: '800', lineHeight: 19 },
});