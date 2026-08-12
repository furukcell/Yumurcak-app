// ============================================================
// YUMURCAK — ParentReportsScreen.js
// FAZ 4: Veli tarafı günlük / aylık rapor sekmeleri
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, THEME } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import { formatDisplayDate } from '../../utils/dateFormat';
import { translateMood } from '../../utils/moodLabel';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export default function ParentReportsScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresAdi, kresId } = useParentBase();
  const reports = useNodeList('gunlukRaporlar', kresId);
  const { theme } = useAppTheme();
  const localStyles = useMemo(() => createStyles(theme || THEME), [theme]);
  const [tab, setTab] = useState('daily');

  const childReports = useMemo(() => {
    if (!selectedChild?.id) return [];
    return reports
      .filter((item) => item.cocukId === selectedChild.id || item.childId === selectedChild.id)
      .sort((a, b) => String(b.tarih || b.date || '').localeCompare(String(a.tarih || a.date || '')));
  }, [reports, selectedChild?.id]);

  const monthlyReports = useMemo(() => buildMonthlyReports(childReports, t), [childReports, t]);

  if (loading) return <LoadingScreen text={t('parent.reports.loading')} />;

  return (
    <ScreenShell title={t('parent.reports.title')} emoji="📋" navigation={navigation} subtitle={kresAdi}>
      <View style={localStyles.tabRow}>
        <TouchableOpacity style={[localStyles.tabButton, tab === 'daily' && localStyles.tabActive]} onPress={() => setTab('daily')} activeOpacity={0.85}>
          <Text style={[localStyles.tabText, tab === 'daily' && localStyles.tabActiveText]}>{t('parent.reports.tabDaily')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[localStyles.tabButton, tab === 'monthly' && localStyles.tabActive]} onPress={() => setTab('monthly')} activeOpacity={0.85}>
          <Text style={[localStyles.tabText, tab === 'monthly' && localStyles.tabActiveText]}>{t('parent.reports.tabMonthly')}</Text>
        </TouchableOpacity>
      </View>

      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.reports.noChildTitle')} desc={t('parent.reports.noChildDesc')} />
      ) : childReports.length === 0 ? (
        <EmptyState icon="📝" title={t('parent.reports.noReportsTitle')} desc={t('parent.reports.noReportsDesc')} />
      ) : tab === 'daily' ? (
        <View>
          <View style={localStyles.summaryCard}>
            <Text style={localStyles.summaryTitle}>{t('parent.reports.dailySummaryTitle')}</Text>
            <Text style={localStyles.summaryText}>{t('parent.reports.dailySummaryDesc')}</Text>
          </View>
          {childReports.map((item, index) => <ReportCard key={item.id} item={item} isToday={index === 0} localStyles={localStyles} t={t} />)}
        </View>
      ) : (
        <View>
          <View style={localStyles.summaryCard}>
            <Text style={localStyles.summaryTitle}>{t('parent.reports.monthlySummaryTitle')}</Text>
            <Text style={localStyles.summaryText}>{t('parent.reports.monthlySummaryDesc')}</Text>
          </View>
          {monthlyReports.map((item) => <MonthlyCard key={item.monthKey} item={item} localStyles={localStyles} t={t} />)}
        </View>
      )}
    </ScreenShell>
  );
}

function ReportCard({ item, isToday, localStyles, t }) {
  const rawMood = item?.mood || item?.ruhHali || item?.durum;
  const mood = rawMood ? translateMood(rawMood, t) : '-';
  // Not: sure/sayi 0 olabilir (hiç uyumadı / hiç tuvalete gitmedi) — 0 JS'te
  // falsy olduğu için eski `?.sure ?` kontrolü bu durumda yanlış dala düşüp
  // string olmayan bir değeri (obje veya boş) gösterebiliyordu. undefined/
  // null kontrolüyle 0'ı geçerli bir değer olarak kabul ediyoruz.
  const sleepSure = item?.uyku?.sure;
  const sleep = (sleepSure !== undefined && sleepSure !== null)
    ? t('parent.reports.sleepHours', { count: sleepSure })
    : (typeof item?.uykuDurumu === 'string' && item.uykuDurumu) || '-';
  const toiletSayi = item?.tuvalet?.sayi;
  const toilet = (toiletSayi !== undefined && toiletSayi !== null)
    ? t('parent.reports.toiletCount', { count: toiletSayi })
    : (typeof item?.tuvaletDurumu === 'string' && item.tuvaletDurumu) || '-';
  const note = item?.not || item?.ogretmenNotu || item?.notlar || t('parent.reports.noTeacherNote');
  const reportDate = item.tarih || item.date || t('parent.reports.title');
  const displayReportDate = formatDisplayDate(reportDate);

  return (
    <View style={localStyles.card}>
      <View style={localStyles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={localStyles.cardTitle}>{isToday ? t('parent.reports.latestReport') : displayReportDate}</Text>
          <Text style={localStyles.cardSub}>{displayReportDate}</Text>
        </View>
        {isToday ? <Text style={localStyles.todayBadge}>{t('parent.reports.current')}</Text> : null}
      </View>

      <View style={localStyles.infoGrid}>
        <InfoPill localStyles={localStyles} icon="😊" label={t('parent.reports.moodLabel')} value={mood} />
        <InfoPill localStyles={localStyles} icon="🌙" label={t('parent.reports.sleepLabel')} value={sleep} />
        <InfoPill localStyles={localStyles} icon="🚽" label={t('parent.reports.toiletLabel')} value={toilet} />
      </View>

      <MealDetail yemek={item?.yemek} yemekDurumu={item?.yemekDurumu} localStyles={localStyles} t={t} />
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

function MealDetail({ yemek, yemekDurumu, localStyles, t }) {
  const mealLabels = {
    kahvalti: t('parent.reports.mealBreakfast'),
    ogle: t('parent.reports.mealLunch'),
    araOgun: t('parent.reports.mealSnack'),
  };
  const statusLabels = {
    yemedi: t('parent.reports.statusNotEaten'),
    az_yedi: t('parent.reports.statusAteLittle'),
    bitirdi: t('parent.reports.statusFinished'),
  };

  if (!yemek) {
    return <Text style={localStyles.mealLine}>🍴 {t('parent.reports.mealLabel')}: {yemekDurumu || '-'}</Text>;
  }

  if (typeof yemek === 'boolean') {
    return <Text style={localStyles.mealLine}>🍴 {t('parent.reports.mealLabel')}: {yemek ? t('parent.reports.mealGood') : '-'}</Text>;
  }

  const keys = ['kahvalti', 'ogle', 'araOgun'];
  const hasDetailed = keys.some((key) => typeof yemek[key] === 'object' && yemek[key]?.durum);

  if (!hasDetailed) {
    const oldSelected = keys.filter((key) => yemek[key]).map((key) => mealLabels[key]);
    return <Text style={localStyles.mealLine}>🍴 {t('parent.reports.mealLabel')}: {oldSelected.length ? oldSelected.join(', ') : (yemekDurumu || '-')}</Text>;
  }

  return (
    <View style={localStyles.mealBox}>
      <Text style={localStyles.mealTitle}>🍴 {t('parent.reports.mealDetailsTitle')}</Text>
      {keys.map((key) => {
        const status = yemek[key]?.durum;
        if (!status) return null;
        return (
          <Text key={key} style={localStyles.mealItem}>
            • {mealLabels[key]}: {statusLabels[status] || status}
          </Text>
        );
      })}
    </View>
  );
}

function MonthlyCard({ item, localStyles, t }) {
  return (
    <View style={localStyles.monthCard}>
      <View style={localStyles.monthTop}>
        <View>
          <Text style={localStyles.monthTitle}>{item.label}</Text>
          <Text style={localStyles.monthSub}>{t('parent.reports.monthlyReportCount', { count: item.count })}</Text>
        </View>
        <Text style={localStyles.monthBadge}>{t('parent.reports.recordCount', { count: item.count })}</Text>
      </View>

      <View style={localStyles.monthStats}>
        <MonthStat localStyles={localStyles} icon="😊" label={t('parent.reports.topMoodLabel')} value={item.topMood} />
        <MonthStat localStyles={localStyles} icon="🌙" label={t('parent.reports.avgSleepLabel')} value={item.avgSleep ? t('parent.reports.sleepHours', { count: item.avgSleep }) : '-'} />
        <MonthStat localStyles={localStyles} icon="🍴" label={t('parent.reports.mealSummaryLabel')} value={item.mealSummary} />
      </View>

      <Text style={localStyles.monthNote}>{t('parent.reports.monthlyNote')}</Text>
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

function buildMonthlyReports(reports, t) {
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
    .map(([monthKey, list]) => {
      const rawTopMood = mostCommon(list.map((item) => item?.mood || item?.ruhHali || item?.durum).filter(Boolean));
      return {
        monthKey,
        label: getMonthTitle(monthKey, t),
        count: list.length,
        topMood: rawTopMood ? translateMood(rawTopMood, t) : '-',
        avgSleep: averageSleep(list),
        mealSummary: mealSummary(list, t),
      };
    });
}

function getMonthTitle(monthKey, t) {
  const [year, month] = String(monthKey || '').split('-');
  const index = Number(month) - 1;
  const monthName = MONTH_KEYS[index] ? t(`common.months.${MONTH_KEYS[index]}`) : monthKey;
  return `${monthName} ${year || ''}`.trim();
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

function mealSummary(list, t) {
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
  return t('parent.reports.mealSummaryGood', { good, total });
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
