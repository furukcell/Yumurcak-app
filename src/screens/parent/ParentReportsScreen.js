// ============================================================
// YUMURCAK — ParentReportsScreen.js
// FAZ 4: Veli tarafı günlük / aylık rapor sekmeleri
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, THEME, MONTH_LABELS } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import { formatDisplayDate } from '../../utils/dateFormat';

const MEAL_LABELS = {
  kahvalti: 'Kahvaltı',
  ogle: 'Öğle Yemeği',
  araOgun: 'Ara Öğün',
};

const STATUS_LABELS = {
  yemedi: 'Yemedi',
  az_yedi: 'Az yedi',
  bitirdi: 'Bitirdi',
};

export default function ParentReportsScreen({ navigation }) {
  const { loading, selectedChild, kresAdi } = useParentBase();
  const reports = useNodeList('gunlukRaporlar');
  const { theme } = useAppTheme();
  const localStyles = useMemo(() => createStyles(theme || THEME), [theme]);
  const [tab, setTab] = useState('daily');

  const childReports = useMemo(() => {
    if (!selectedChild?.id) return [];
    return reports
      .filter((item) => item.cocukId === selectedChild.id || item.childId === selectedChild.id)
      .sort((a, b) => String(b.tarih || b.date || '').localeCompare(String(a.tarih || a.date || '')));
  }, [reports, selectedChild?.id]);

  const monthlyReports = useMemo(() => buildMonthlyReports(childReports), [childReports]);

  if (loading) return <LoadingScreen text="Raporlar hazırlanıyor..." />;

  return (
    <ScreenShell title="Raporlar" emoji="📋" navigation={navigation} subtitle={kresAdi}>
      <View style={localStyles.tabRow}>
        <TouchableOpacity style={[localStyles.tabButton, tab === 'daily' && localStyles.tabActive]} onPress={() => setTab('daily')} activeOpacity={0.85}>
          <Text style={[localStyles.tabText, tab === 'daily' && localStyles.tabActiveText]}>Günlük</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[localStyles.tabButton, tab === 'monthly' && localStyles.tabActive]} onPress={() => setTab('monthly')} activeOpacity={0.85}>
          <Text style={[localStyles.tabText, tab === 'monthly' && localStyles.tabActiveText]}>Aylık</Text>
        </TouchableOpacity>
      </View>

      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Rapor görmek için çocuğunuzun veli hesabına bağlı olması gerekir." />
      ) : childReports.length === 0 ? (
        <EmptyState icon="📝" title="Henüz rapor yok" desc="Öğretmen günlük rapor girdiğinde burada görünecek." />
      ) : tab === 'daily' ? (
        <View>
          <View style={localStyles.summaryCard}>
            <Text style={localStyles.summaryTitle}>Günlük Raporlar</Text>
            <Text style={localStyles.summaryText}>Son raporlar tarih sırasına göre listelenir. En güncel kayıt üsttedir.</Text>
          </View>
          {childReports.map((item, index) => <ReportCard key={item.id} item={item} isToday={index === 0} localStyles={localStyles} />)}
        </View>
      ) : (
        <View>
          <View style={localStyles.summaryCard}>
            <Text style={localStyles.summaryTitle}>Aylık Özet</Text>
            <Text style={localStyles.summaryText}>Bu bölüm günlük raporlardan otomatik özet çıkarır. Tanı/teşhis değildir.</Text>
          </View>
          {monthlyReports.map((item) => <MonthlyCard key={item.monthKey} item={item} localStyles={localStyles} />)}
        </View>
      )}
    </ScreenShell>
  );
}

function ReportCard({ item, isToday, localStyles }) {
  const mood = item?.mood || item?.ruhHali || item?.durum || '-';
  const sleep = item?.uyku?.sure ? `${item.uyku.sure} saat` : (item?.uykuDurumu || '-');
  const toilet = item?.tuvalet?.sayi ? `${item.tuvalet.sayi} kez` : (item?.tuvaletDurumu || '-');
  const note = item?.not || item?.ogretmenNotu || item?.notlar || 'Öğretmen notu yok.';
  const reportDate = item.tarih || item.date || 'Rapor';
  const displayReportDate = formatDisplayDate(reportDate);

  return (
    <View style={localStyles.card}>
      <View style={localStyles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={localStyles.cardTitle}>{isToday ? 'En Güncel Rapor' : displayReportDate}</Text>
          <Text style={localStyles.cardSub}>{displayReportDate}</Text>
        </View>
        {isToday ? <Text style={localStyles.todayBadge}>Güncel</Text> : null}
      </View>

      <View style={localStyles.infoGrid}>
        <InfoPill localStyles={localStyles} icon="😊" label="Ruh hali" value={mood} />
        <InfoPill localStyles={localStyles} icon="🌙" label="Uyku" value={sleep} />
        <InfoPill localStyles={localStyles} icon="🚽" label="Tuvalet" value={toilet} />
      </View>

      <MealDetail yemek={item?.yemek} yemekDurumu={item?.yemekDurumu} localStyles={localStyles} />
      <Text style={localStyles.noteText}>👩‍🏫 {note}</Text>
    </View>
  );
}

function InfoPill({ localStyles, icon, label, value }) {
  return (
    <View style={localStyles.infoPill}>
      <Text style={localStyles.infoIcon}>{icon}</Text>
      <Text style={localStyles.infoLabel}>{label}</Text>
      <Text style={localStyles.infoValue} numberOfLines={1}>{value || '-'}</Text>
    </View>
  );
}

function MealDetail({ yemek, yemekDurumu, localStyles }) {
  if (!yemek) {
    return <Text style={localStyles.mealLine}>🍴 Yemek: {yemekDurumu || '-'}</Text>;
  }

  if (typeof yemek === 'boolean') {
    return <Text style={localStyles.mealLine}>🍴 Yemek: {yemek ? 'İyi' : '-'}</Text>;
  }

  const keys = ['kahvalti', 'ogle', 'araOgun'];
  const hasDetailed = keys.some((key) => typeof yemek[key] === 'object' && yemek[key]?.durum);

  if (!hasDetailed) {
    const oldSelected = keys.filter((key) => yemek[key]).map((key) => MEAL_LABELS[key]);
    return <Text style={localStyles.mealLine}>🍴 Yemek: {oldSelected.length ? oldSelected.join(', ') : (yemekDurumu || '-')}</Text>;
  }

  return (
    <View style={localStyles.mealBox}>
      <Text style={localStyles.mealTitle}>🍴 Yemek Detayları</Text>
      {keys.map((key) => {
        const status = yemek[key]?.durum;
        if (!status) return null;
        return (
          <Text key={key} style={localStyles.mealItem}>
            • {MEAL_LABELS[key]}: {STATUS_LABELS[status] || status}
          </Text>
        );
      })}
    </View>
  );
}

function MonthlyCard({ item, localStyles }) {
  return (
    <View style={localStyles.monthCard}>
      <View style={localStyles.monthTop}>
        <View>
          <Text style={localStyles.monthTitle}>{item.label}</Text>
          <Text style={localStyles.monthSub}>{item.count} günlük rapor</Text>
        </View>
        <Text style={localStyles.monthBadge}>{item.count} kayıt</Text>
      </View>

      <View style={localStyles.monthStats}>
        <MonthStat localStyles={localStyles} icon="😊" label="En sık ruh hali" value={item.topMood} />
        <MonthStat localStyles={localStyles} icon="🌙" label="Uyku ort." value={item.avgSleep ? `${item.avgSleep} saat` : '-'} />
        <MonthStat localStyles={localStyles} icon="🍴" label="Yemek" value={item.mealSummary} />
      </View>

      <Text style={localStyles.monthNote}>Not: Bu aylık özet, girilen günlük raporlardan otomatik oluşturulur.</Text>
    </View>
  );
}

function MonthStat({ localStyles, icon, label, value }) {
  return (
    <View style={localStyles.monthStatBox}>
      <Text style={localStyles.monthStatIcon}>{icon}</Text>
      <Text style={localStyles.monthStatLabel}>{label}</Text>
      <Text style={localStyles.monthStatValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );
}

function buildMonthlyReports(reports) {
  const groups = {};
  reports.forEach((report) => {
    const rawDate = String(report.tarih || report.date || '');
    const monthKey = rawDate.length >= 7 ? rawDate.slice(0, 7) : 'unknown';
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(report);
  });

  return Object.entries(groups)
    .filter(([monthKey]) => monthKey !== 'unknown')
    .sort(([a], [b]) => String(b).localeCompare(String(a)))
    .map(([monthKey, list]) => ({
      monthKey,
      label: getMonthTitle(monthKey),
      count: list.length,
      topMood: mostCommon(list.map((item) => item?.mood || item?.ruhHali || item?.durum).filter(Boolean)) || '-',
      avgSleep: averageSleep(list),
      mealSummary: mealSummary(list),
    }));
}

function getMonthTitle(monthKey) {
  const [year, month] = String(monthKey || '').split('-');
  const index = Number(month) - 1;
  return `${MONTH_LABELS[index] || monthKey} ${year || ''}`.trim();
}

function mostCommon(values) {
  const counts = {};
  values.forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function averageSleep(list) {
  const values = list
    .map((item) => {
      if (item?.uyku?.sure) return Number(item.uyku.sure);
      const raw = String(item?.uykuDurumu || '').replace(',', '.');
      const match = raw.match(/[0-9]+(\.[0-9]+)?/);
      return match ? Number(match[0]) : null;
    })
    .filter((value) => Number.isFinite(value));
  if (!values.length) return '';
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return avg.toFixed(avg % 1 === 0 ? 0 : 1);
}

function mealSummary(list) {
  let good = 0;
  let total = 0;
  list.forEach((item) => {
    const yemek = item?.yemek;
    if (yemek && typeof yemek === 'object') {
      ['kahvalti', 'ogle', 'araOgun'].forEach((key) => {
        const status = yemek[key]?.durum;
        if (status) {
          total += 1;
          if (status === 'bitirdi') good += 1;
        }
      });
      return;
    }
    if (item?.yemekDurumu || typeof yemek === 'boolean') {
      total += 1;
      if (String(item?.yemekDurumu || '').toLowerCase().includes('iyi') || yemek === true) good += 1;
    }
  });
  if (!total) return '-';
  return `${good}/${total} iyi`;
}

const createStyles = (theme) => {
  const t = { ...THEME, ...(theme || {}) };
  return StyleSheet.create({
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tabButton: { flex: 1, backgroundColor: t.card, borderRadius: 18, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
    tabActive: { backgroundColor: t.primary, borderColor: t.primary },
    tabText: { color: t.text, fontWeight: '900', fontSize: 15 },
    tabActiveText: { color: '#FFFFFF' },
    summaryCard: { backgroundColor: t.primarySoft, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: t.border },
    summaryTitle: { color: t.primary, fontSize: 17, fontWeight: '900' },
    summaryText: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 5, lineHeight: 18 },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    cardTitle: { color: t.text, fontSize: 17, fontWeight: '900' },
    cardSub: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
    todayBadge: { color: t.primary, backgroundColor: t.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
    infoGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    infoPill: { flex: 1, backgroundColor: t.bg, borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: t.border },
    infoIcon: { fontSize: 18, marginBottom: 3 },
    infoLabel: { color: t.muted, fontSize: 10, fontWeight: '800' },
    infoValue: { color: t.text, fontSize: 12, fontWeight: '900', marginTop: 2, textAlign: 'center' },
    mealLine: { color: t.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
    mealBox: { backgroundColor: t.bg, borderRadius: 16, padding: 12, marginTop: 4, borderWidth: 1, borderColor: t.border },
    mealTitle: { color: t.text, fontSize: 13, fontWeight: '900', marginBottom: 5 },
    mealItem: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    noteText: { color: t.text, fontSize: 13, fontWeight: '700', marginTop: 10, lineHeight: 19 },
    monthCard: { backgroundColor: t.card, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border },
    monthTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    monthTitle: { color: t.text, fontSize: 17, fontWeight: '900' },
    monthSub: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
    monthBadge: { color: t.primary, backgroundColor: t.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
    monthStats: { flexDirection: 'row', gap: 8 },
    monthStatBox: { flex: 1, backgroundColor: t.bg, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
    monthStatIcon: { fontSize: 18, marginBottom: 3 },
    monthStatLabel: { color: t.muted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
    monthStatValue: { color: t.text, fontSize: 12, fontWeight: '900', marginTop: 3, textAlign: 'center' },
    monthNote: { color: t.muted, fontSize: 11, fontWeight: '700', marginTop: 12, lineHeight: 16 },
  });
};
