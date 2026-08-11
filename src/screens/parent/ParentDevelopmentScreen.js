import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ScreenShell,
  EmptyState,
  LoadingScreen,
  useNodeList,
  useParentBase,
  styles,
  THEME,
  getMonthKey,
  getMonthLabel,
} from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';
import { sortWeeklyBadgesNewestFirst } from '../../utils/weeklyBadges';
import {
  MOOD_LABELS,
  getMoodLabel,
  computeMonthlyAggregate,
  buildMonthlyComment,
  formatSleep,
  percent,
  getPhysicalValue,
  buildDelta,
} from '../../utils/developmentInsights';

const MIN_AVERAGE_COUNT = 5;

export default function ParentDevelopmentScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, childName, kresId, sinifId } = useParentBase();
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeTab, setActiveTab] = useState('monthly');

 
 const physicalRaw = useNodeList('fizikselGelisim', kresId);
 const reportsRaw = useNodeList('gunlukRaporlar', kresId);
 const attendanceRaw = useNodeList('yoklamalar', kresId);
 const eventsRaw = useNodeList('etkinlikler', kresId);
 const mealsRaw = useNodeList('yemekListeleri', kresId);
 const badgesRaw = useNodeList('haftaninRozetleri', kresId);

  const targetMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthKey = getMonthKey(targetMonth);
  const previousMonthKey = getMonthKey(new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1));

  const badgeHistory = useMemo(() => {
    if (!selectedChild?.id) return [];
    return badgesRaw
      .filter((item) => item.aktif !== false)
      .filter((item) => String(item.cocukId || '') === String(selectedChild.id))
      .sort(sortWeeklyBadgesNewestFirst);
  }, [badgesRaw, selectedChild?.id]);

  // Belirli bir ay (monthKey) için ham listeleri filtreleyip computeMonthlyAggregate'e
  // uygun şekle sokar. Hem mevcut hem önceki ay için aynı fonksiyon çağrılır.
  const filterForMonth = (targetKey) => {
    const reports = reportsRaw.filter((item) => item.cocukId === selectedChild.id && isInMonth(item, targetKey));
    const attendance = attendanceRaw.filter((item) => item.cocukId === selectedChild.id && isInMonth(item, targetKey));

    const events = eventsRaw.filter((item) => {
      if (item.aktif === false) return false;
      if (item.kresId && kresId && item.kresId !== kresId) return false;
      if (Array.isArray(item.sinifIds) && sinifId) return item.sinifIds.includes(sinifId) && isInMonth(item, targetKey);
      if (item.sinifId && sinifId) return item.sinifId === sinifId && isInMonth(item, targetKey);
      return isInMonth(item, targetKey);
    });

    const menuDays = mealsRaw.filter((item) => {
      if (item.aktif === false) return false;
      if (item.kresId && kresId && item.kresId !== kresId) return false;
      if (item.sinifId && sinifId && item.sinifId !== sinifId) return false;
      return isInMonth(item, targetKey);
    }).length;

    return { reports, attendance, events, menuDays };
  };

  const monthly = useMemo(() => {
    if (!selectedChild?.id) return null;

    const currentRaw = filterForMonth(monthKey);
    const previousRaw = filterForMonth(previousMonthKey);

    const current = computeMonthlyAggregate(currentRaw);
    const previous = computeMonthlyAggregate(previousRaw);
    const hasPreviousData = previousRaw.attendance.length > 0 || previousRaw.reports.length > 0 || previousRaw.events.length > 0;

    const physicalAll = physicalRaw
      .filter((item) => item.cocukId === selectedChild.id)
      .sort((a, b) => getSortableDate(b) - getSortableDate(a));
    const physical = physicalAll.filter((item) => isInMonth(item, monthKey));
    const physicalChart = physicalAll.slice(0, 6).reverse();
    const lastPhysical = physicalAll[0] || null;
    const previousPhysical = physicalAll[1] || null;

    return {
      reports: currentRaw.reports,
      attendance: currentRaw.attendance,
      physical,
      physicalAll,
      physicalChart,
      lastPhysical,
      previousPhysical,
      heightDelta: buildDelta(lastPhysical, previousPhysical, 'boy'),
      weightDelta: buildDelta(lastPhysical, previousPhysical, 'kilo'),
      events: currentRaw.events,
      menuDays: current.menuDays,
      presentDays: current.presentDays,
      absentDays: current.absentDays,
      attendanceTotal: current.attendanceTotal,
      moodCounts: current.moodCounts,
      topMood: current.topMood,
      positiveMoodDays: current.positiveMoodDays,
      averageSleep: current.averageSleep,
      sleepDays: current.sleepDays,
      mealGoodTotal: current.mealGoodTotal,
      mealTotal: current.mealTotal,
      comment: buildMonthlyComment({
        childName,
        current,
        previous: hasPreviousData ? previous : null,
      }),
    };
  }, [selectedChild?.id, reportsRaw, attendanceRaw, physicalRaw, eventsRaw, mealsRaw, monthKey, previousMonthKey, kresId, sinifId, childName]);

  const classAverage = useMemo(() => {
    if (!selectedChild?.id || !sinifId) return null;
    return buildClassAverageData({ physicalRaw, selectedChild, sinifId, kresId, monthKey });
  }, [physicalRaw, selectedChild?.id, sinifId, kresId, monthKey]);

  if (loading) return <LoadingScreen text={t('parent.development.loading')} />;

  return (
    <ScreenShell
      title={t('nav.development')}
      emoji="📈"
      subtitle={activeTab === 'monthly' ? getMonthLabel(monthKey) : t('parent.development.anonClassAverage')}
      navigation={navigation}
    >
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.development.noChildTitle')} desc={t('parent.development.noChildDesc')} />
      ) : !monthly ? (
        <EmptyState icon="📈" title={t('parent.development.reportUnavailableTitle')} desc={t('parent.development.reportUnavailableDesc')} />
      ) : (
        <>
          <DevelopmentTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
          <MonthSelector monthKey={monthKey} monthOffset={monthOffset} setMonthOffset={setMonthOffset} t={t} />

          {activeTab === 'monthly' ? (
            <MonthlyDevelopmentContent monthly={monthly} childName={childName} badgeHistory={badgeHistory} t={t} />
          ) : (
            <ClassAverageContent data={classAverage} childName={childName} monthKey={monthKey} t={t} />
          )}
        </>
      )}
    </ScreenShell>
  );
}

function DevelopmentTabs({ activeTab, setActiveTab, t }) {
  return (
    <View style={localStyles.tabRow}>
      <TouchableOpacity style={[localStyles.tabButton, activeTab === 'monthly' && localStyles.tabButtonActive]} onPress={() => setActiveTab('monthly')} activeOpacity={0.85}>
        <Text style={[localStyles.tabText, activeTab === 'monthly' && localStyles.tabTextActive]}>📅 {t('parent.development.monthlyTab')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[localStyles.tabButton, activeTab === 'classAverage' && localStyles.tabButtonActive]} onPress={() => setActiveTab('classAverage')} activeOpacity={0.85}>
        <Text style={[localStyles.tabText, activeTab === 'classAverage' && localStyles.tabTextActive]}>📊 {t('parent.development.classAverageTab')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MonthlyDevelopmentContent({ monthly, childName, badgeHistory, t }) {
  return (
    <>
      <View style={[styles.card, localStyles.heroCard]}>
        <Text style={localStyles.heroEmoji}>📊</Text>
        <Text style={localStyles.heroTitle}>{childName}</Text>
        <Text style={localStyles.heroSub}>{t('parent.development.monthlySummarySub')}</Text>
        <Text style={localStyles.heroText}>{monthly.comment}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('parent.development.monthSummaryTitle')}</Text>
      <View style={localStyles.grid}>
        <MetricCard icon="✅" value={`${monthly.presentDays}`} label={t('parent.development.daysPresent')} />
        <MetricCard icon="🏠" value={`${monthly.absentDays}`} label={t('parent.development.absences')} />
        <MetricCard icon="😊" value={`${monthly.positiveMoodDays}`} label={t('parent.development.positiveMood')} />
        <MetricCard icon="🎨" value={`${monthly.events.length}`} label={t('parent.development.activity')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('parent.development.attendanceStatus')}</Text>
        <ProgressLine label={t('parent.development.presentOutOf', { present: monthly.presentDays, total: monthly.attendanceTotal || 0 })} percent={percent(monthly.presentDays, monthly.attendanceTotal)} color={THEME.green} />
        <Text style={styles.cardText}>{t('parent.development.absencesCount', { count: monthly.absentDays })}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('parent.development.moodDistribution')}</Text>
        {Object.entries(monthly.moodCounts).length === 0 ? (
          <Text style={styles.cardText}>{t('parent.development.noMoodRecord')}</Text>
        ) : (
          Object.entries(monthly.moodCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => (
              <ProgressLine key={key} label={t('parent.development.moodDaysCount', { mood: getMoodLabel(key), count })} percent={percent(count, monthly.reports.length)} color={getMoodColor(key)} />
            ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('parent.development.sleepAndMeals')}</Text>
        <ProgressLine label={t('parent.development.averageSleep', { sleep: formatSleep(monthly.averageSleep) })} percent={Math.min(100, Math.round((monthly.averageSleep / 2) * 100))} color={THEME.blue} />
        <ProgressLine label={t('parent.development.mealsGood', { good: monthly.mealGoodTotal, total: monthly.mealTotal || 0 })} percent={percent(monthly.mealGoodTotal, monthly.mealTotal)} color={THEME.orange} />
        <Text style={styles.cardText}>{t('parent.development.menuDaysPublished', { count: monthly.menuDays })}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('parent.development.physicalGrowth')}</Text>
        {monthly.physicalAll.length === 0 ? (
          <Text style={styles.cardText}>{t('parent.development.noMeasurementYet')}</Text>
        ) : (
          <>
            <View style={localStyles.physicalSummary}>
              <View style={localStyles.physicalBox}>
                <Text style={localStyles.physicalLabel}>{t('parent.development.lastHeight')}</Text>
                <Text style={localStyles.physicalValue}>{formatMeasurement(monthly.lastPhysical, 'boy', 'cm')}</Text>
                <Text style={localStyles.physicalDelta}>{monthly.heightDelta}</Text>
              </View>
              <View style={localStyles.physicalBox}>
                <Text style={localStyles.physicalLabel}>{t('parent.development.lastWeight')}</Text>
                <Text style={localStyles.physicalValue}>{formatMeasurement(monthly.lastPhysical, 'kilo', 'kg')}</Text>
                <Text style={localStyles.physicalDelta}>{monthly.weightDelta}</Text>
              </View>
            </View>

            <Text style={styles.cardText}>{t('parent.development.lastMeasurement')}: {formatDate(monthly.lastPhysical)}</Text>
            {monthly.lastPhysical?.basCevresi ? <Text style={styles.cardText}>{t('parent.development.headCircumference')}: {monthly.lastPhysical.basCevresi} cm</Text> : null}
            {monthly.physical.length === 0 ? (
              <Text style={localStyles.miniNote}>{t('parent.development.noNewMeasurementThisMonth')}</Text>
            ) : (
              <Text style={localStyles.miniNote}>{t('parent.development.measurementsThisMonth', { count: monthly.physical.length })}</Text>
            )}

            <Text style={localStyles.subTitle}>{t('parent.development.growthView')}</Text>
            <PhysicalGrowthChart measurements={monthly.physicalChart} t={t} />

            <Text style={localStyles.subTitle}>{t('parent.development.recentMeasurements')}</Text>
            {monthly.physicalAll.slice(0, 6).map((item) => (
              <MeasurementRow key={item.id || `${item.tarih}-${item.createdAt}`} item={item} t={t} />
            ))}
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={localStyles.badgeAlbumHead}>
          <View>
            <Text style={styles.cardTitle}>🎖️ {t('parent.development.badgeAlbum')}</Text>
            <Text style={localStyles.miniNote}>{t('parent.development.badgeAlbumDesc')}</Text>
          </View>
          <Text style={localStyles.badgeCount}>{badgeHistory.length}</Text>
        </View>
        {badgeHistory.length === 0 ? (
          <Text style={styles.cardText}>{t('parent.development.noBadgeYet')}</Text>
        ) : (
          badgeHistory.map((item) => <BadgeHistoryRow key={item.id || `${item.weekKey}_${item.cocukId}`} item={item} t={t} />)
        )}
      </View>
    </>
  );
}

function ClassAverageContent({ data, childName, monthKey, t }) {
  const firstName = getFirstName(childName, t);

  if (!data?.childMeasurement) {
    return (
      <>
        <AnonHeader childName={childName} monthKey={monthKey} dataCount={0} t={t} />
        <EmptyState icon="📏" title={t('parent.development.noMeasurementFoundTitle')} desc={t('parent.development.noMeasurementFoundDesc')} />
      </>
    );
  }

  if (!data.canShowAverage) {
    return (
      <>
        <AnonHeader childName={childName} monthKey={monthKey} dataCount={data.count || 0} t={t} />
        <View style={localStyles.privacyCard}>
          <Text style={localStyles.privacyIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.privacyTitle}>{t('parent.development.notEnoughDataTitle')}</Text>
            <Text style={localStyles.privacyText}>{t('parent.development.notEnoughDataDesc', { count: MIN_AVERAGE_COUNT })}</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <AnonHeader childName={childName} monthKey={monthKey} dataCount={data.count} t={t} />
      <View style={localStyles.privacyCard}>
        <Text style={localStyles.privacyIcon}>🛡️</Text>
        <Text style={localStyles.privacyText}><Text style={localStyles.privacyStrong}>{t('parent.development.fullyAnonymous')}</Text> {t('parent.development.onlyClassAverageShown')}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('parent.development.physicalComparison')}</Text>
      <CompareMetricCard icon="📏" title={t('parent.development.height')} suffix="cm" childName={firstName} childValue={data.child.boy} avgValue={data.average.boy} color="#7C5CBF" t={t} />
      <CompareMetricCard icon="⚖️" title={t('parent.development.weight')} suffix="kg" childName={firstName} childValue={data.child.kilo} avgValue={data.average.kilo} color="#F472B6" t={t} />
      {data.child.basCevresi || data.average.basCevresi ? (
        <CompareMetricCard icon="🙂" title={t('parent.development.headCircumference')} suffix="cm" childName={firstName} childValue={data.child.basCevresi} avgValue={data.average.basCevresi} color="#34D399" t={t} />
      ) : null}

      <View style={localStyles.infoCard}>
        <Text style={localStyles.infoIcon}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text style={localStyles.infoTitle}>{t('parent.development.infoTitle')}</Text>
          <Text style={localStyles.infoText}>{t('parent.development.infoText')}</Text>
        </View>
      </View>

      <View style={localStyles.dataCountCard}>
        <Text style={localStyles.dataCountIcon}>👥</Text>
        <Text style={localStyles.dataCountText}>{t('parent.development.averageCalculatedFrom', { month: getMonthLabel(monthKey), count: data.count })}</Text>
      </View>
    </>
  );
}

function AnonHeader({ childName, monthKey, dataCount, t }) {
  return (
    <View style={localStyles.averageHero}>
      <View style={{ flex: 1 }}>
        <Text style={localStyles.averageLabel}>{t('parent.development.percentAnonymous')}</Text>
        <Text style={localStyles.averageTitle}>{t('parent.development.classAverage')}</Text>
        <Text style={localStyles.averageSub}>{childName} · {getMonthLabel(monthKey)} · {t('parent.development.recordCount', { count: dataCount || 0 })}</Text>
      </View>
      <View style={localStyles.lockBadge}><Text style={localStyles.lockIcon}>🔒</Text></View>
    </View>
  );
}

function CompareMetricCard({ icon, title, suffix, childName, childValue, avgValue, color, t }) {
  const child = Number(childValue || 0);
  const avg = Number(avgValue || 0);
  if (!child || !avg) return null;
  const max = Math.max(child, avg, 1);
  const childPercent = Math.max(12, Math.round((child / max) * 100));
  const avgPercent = Math.max(12, Math.round((avg / max) * 100));
  const diff = Number((child - avg).toFixed(1));
  const status = getComparisonStatus(diff, suffix, t);

  return (
    <View style={localStyles.compareCard}>
      <View style={localStyles.compareHead}>
        <View style={localStyles.compareTitleRow}>
          <View style={[localStyles.compareIconBox, { backgroundColor: `${color}22` }]}><Text style={localStyles.compareIcon}>{icon}</Text></View>
          <View>
            <Text style={localStyles.compareTitle}>{title}</Text>
            <Text style={localStyles.compareUnit}>{suffix}</Text>
          </View>
        </View>
        <Text style={[localStyles.statusBadge, { color: status.color, backgroundColor: status.bg }]}>{status.label}</Text>
      </View>

      <CompareBar label={childName} value={`${child}${suffix}`} percent={childPercent} color={color} strong />
      <CompareBar label={t('parent.development.classAverageShort')} value={`${avg}${suffix}`} percent={avgPercent} color="#D4C5F5" />

      <View style={[localStyles.diffBox, { backgroundColor: status.bg }]}>
        <Text style={localStyles.diffIcon}>{status.icon}</Text>
        <Text style={localStyles.diffText}>{status.message}</Text>
      </View>
    </View>
  );
}

function CompareBar({ label, value, percent: widthPercent, color, strong }) {
  return (
    <View style={localStyles.compareBarRow}>
      <Text style={[localStyles.compareBarLabel, strong && { color }]}>{label}</Text>
      <View style={localStyles.compareTrack}><View style={[localStyles.compareFill, { width: `${widthPercent}%`, backgroundColor: color }]} /></View>
      <Text style={[localStyles.compareBarValue, strong && { color }]}>{value}</Text>
    </View>
  );
}

function MonthSelector({ monthKey, monthOffset, setMonthOffset, t }) {
  return (
    <View style={localStyles.monthRow}>
      <TouchableOpacity style={localStyles.monthButton} onPress={() => setMonthOffset((value) => value - 1)} activeOpacity={0.8}>
        <Text style={localStyles.monthButtonText}>‹ {t('parent.development.previous')}</Text>
      </TouchableOpacity>
      <View style={localStyles.monthPill}>
        <Text style={localStyles.monthPillText}>{getMonthLabel(monthKey)}</Text>
      </View>
      <TouchableOpacity style={[localStyles.monthButton, monthOffset >= 0 && localStyles.monthButtonDisabled]} onPress={() => setMonthOffset((value) => Math.min(0, value + 1))} disabled={monthOffset >= 0} activeOpacity={0.8}>
        <Text style={[localStyles.monthButtonText, monthOffset >= 0 && localStyles.monthButtonDisabledText]}>{t('parent.development.next')} ›</Text>
      </TouchableOpacity>
    </View>
  );
}

function MetricCard({ icon, value, label }) {
  return (
    <View style={localStyles.metricCard}>
      <Text style={localStyles.metricIcon}>{icon}</Text>
      <Text style={localStyles.metricValue}>{value}</Text>
      <Text style={localStyles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProgressLine({ label, percent: progressPercent, color }) {
  const safePercent = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, progressPercent)) : 0;
  return (
    <View style={localStyles.progressWrap}>
      <View style={localStyles.progressTop}>
        <Text style={localStyles.progressLabel}>{label}</Text>
        <Text style={localStyles.progressValue}>{safePercent}%</Text>
      </View>
      <View style={localStyles.progressTrack}>
        <View style={[localStyles.progressFill, { width: `${safePercent}%`, backgroundColor: color || THEME.primary }]} />
      </View>
    </View>
  );
}

function PhysicalGrowthChart({ measurements, t }) {
  const clean = (measurements || []).filter((item) => getPhysicalValue(item, 'boy') || getPhysicalValue(item, 'kilo'));
  if (clean.length === 0) return <Text style={styles.cardText}>{t('parent.development.notEnoughChartData')}</Text>;

  const maxHeight = Math.max(...clean.map((item) => getPhysicalValue(item, 'boy') || 0), 1);
  const maxWeight = Math.max(...clean.map((item) => getPhysicalValue(item, 'kilo') || 0), 1);

  return (
    <View style={localStyles.chartBox}>
      {clean.map((item) => {
        const height = getPhysicalValue(item, 'boy');
        const weight = getPhysicalValue(item, 'kilo');
        return (
          <View key={item.id || `${item.tarih}-${item.createdAt}`} style={localStyles.chartItem}>
            <Text style={localStyles.chartDate}>{shortDate(item)}</Text>
            <MiniBar label={t('parent.development.heightShort')} value={height} max={maxHeight} suffix="cm" color={THEME.primary} />
            <MiniBar label={t('parent.development.weightShort')} value={weight} max={maxWeight} suffix="kg" color={THEME.green} />
          </View>
        );
      })}
    </View>
  );
}

function MiniBar({ label, value, max, suffix, color }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const safePercent = safeValue > 0 && max > 0 ? Math.max(8, Math.round((safeValue / max) * 100)) : 0;
  return (
    <View style={localStyles.miniBarRow}>
      <Text style={localStyles.miniBarLabel}>{label}</Text>
      <View style={localStyles.miniBarTrack}>
        <View style={[localStyles.miniBarFill, { width: `${safePercent}%`, backgroundColor: color }]} />
      </View>
      <Text style={localStyles.miniBarValue}>{safeValue ? `${safeValue}${suffix}` : '-'}</Text>
    </View>
  );
}

function MeasurementRow({ item, t }) {
  return (
    <View style={localStyles.measurementRow}>
      <View style={localStyles.measurementDatePill}>
        <Text style={localStyles.measurementDate}>{shortDate(item)}</Text>
      </View>
      <View style={localStyles.measurementInfo}>
        <Text style={localStyles.measurementMain}>{t('parent.development.heightShort')}: {formatMeasurement(item, 'boy', 'cm')} · {t('parent.development.weightShort')}: {formatMeasurement(item, 'kilo', 'kg')}</Text>
        {item.basCevresi ? <Text style={localStyles.measurementSub}>{t('parent.development.headCircumference')}: {item.basCevresi} cm</Text> : null}
      </View>
    </View>
  );
}

function BadgeHistoryRow({ item, t }) {
  return (
    <View style={localStyles.badgeRow}>
      <View style={localStyles.badgeIconBox}><Text style={localStyles.badgeIcon}>{item.badgeEmoji || item.rozetEmoji || '🌟'}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={localStyles.badgeTitle}>{item.badgeTitle || item.rozetAdi || t('parent.summary.badge')}</Text>
        <Text style={localStyles.badgeWeek}>{item.haftaLabel || `${item.haftaBaslangic || ''} - ${item.haftaBitis || ''}`}</Text>
        {item.note || item.not ? <Text style={localStyles.badgeNote}>{item.note || item.not}</Text> : null}
      </View>
    </View>
  );
}

function buildClassAverageData({ physicalRaw, selectedChild, sinifId, kresId, monthKey }) {
  const monthRecords = physicalRaw
    .filter((item) => item.aktif !== false)
    .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
    .filter((item) => String(item.sinifId || '') === String(sinifId || ''))
    .filter((item) => isInMonth(item, monthKey))
    .sort((a, b) => getSortableDate(b) - getSortableDate(a));

  const latestByChild = new Map();
  monthRecords.forEach((item) => {
    const id = String(item.cocukId || '');
    if (!id || latestByChild.has(id)) return;
    latestByChild.set(id, item);
  });

  const childMeasurement = latestByChild.get(String(selectedChild.id || '')) || null;
  const values = Array.from(latestByChild.values());
  const count = values.length;

  const average = {
    boy: averageOf(values, 'boy'),
    kilo: averageOf(values, 'kilo'),
    basCevresi: averageOf(values, 'basCevresi'),
  };

  return {
    count,
    canShowAverage: count >= MIN_AVERAGE_COUNT,
    childMeasurement,
    child: {
      boy: getPhysicalValue(childMeasurement, 'boy'),
      kilo: getPhysicalValue(childMeasurement, 'kilo'),
      basCevresi: getPhysicalValue(childMeasurement, 'basCevresi'),
    },
    average,
  };
}

function averageOf(items, key) {
  const values = items.map((item) => getPhysicalValue(item, key)).filter((value) => value > 0);
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function getComparisonStatus(diff, suffix, t) {
  const abs = Math.abs(diff);
  const threshold = suffix === 'kg' ? 0.8 : 2;
  if (abs <= threshold) {
    return { label: t('parent.development.closeToAverage'), icon: '✅', color: '#2563EB', bg: '#EFF6FF', message: t('parent.development.closeToAverageMsg') };
  }
  if (diff > 0) {
    return { label: t('parent.development.aboveAverage'), icon: '↗', color: '#059669', bg: '#ECFDF5', message: t('parent.development.aboveAverageMsg', { diff: abs, suffix }) };
  }
  return { label: t('parent.development.belowAverage'), icon: '↘', color: '#D97706', bg: '#FFF7ED', message: t('parent.development.belowAverageMsg', { diff: abs, suffix }) };
}

function isInMonth(item, monthKey) {
  const dateKey = getItemDateKey(item);
  return dateKey ? dateKey.startsWith(monthKey) : false;
}

function getItemDateKey(item) {
  const direct = item?.tarih || item?.date || item?.gun || item?.sonOdemeTarihi;
  if (typeof direct === 'string' && /^\d{4}-\d{2}/.test(direct)) return direct.slice(0, 10);

  const timestamp = Number(item?.createdAt || item?.updatedAt || 0);
  if (Number.isFinite(timestamp) && timestamp > 1000000000) {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  return '';
}

function getSortableDate(item) {
  const key = getItemDateKey(item);
  if (key) return new Date(key).getTime();
  const raw = Number(item?.createdAt || item?.updatedAt || 0);
  return Number.isFinite(raw) ? raw : 0;
}

function formatMeasurement(item, key, suffix) {
  const value = getPhysicalValue(item, key);
  if (!value) return '-';
  return `${value}${suffix}`;
}

function formatDate(item) {
  if (!item) return '-';
  return formatDisplayDate(getItemDateKey(item));
}

function shortDate(item) {
  const key = getItemDateKey(item);
  if (!key) return '-';
  const parts = key.split('-');
  if (parts.length < 3) return key;
  return `${parts[2]}.${parts[1]}`;
}

function getMoodColor(key) {
  if (key === 'mutlu' || key === 'iyi' || key === 'sakin') return THEME.green;
  if (key === 'huzursuz' || key === 'uzgun') return THEME.red;
  if (key === 'yorgun') return THEME.orange;
  return THEME.primary;
}

function getFirstName(value, t) {
  const fallback = t('parent.summary.defaultChildName');
  return String(value || fallback).trim().split(' ')[0] || fallback;
}

const localStyles = StyleSheet.create({
  tabRow: { flexDirection: 'row', backgroundColor: THEME.card, borderRadius: 18, padding: 4, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 14, alignItems: 'center' },
  tabButtonActive: { backgroundColor: THEME.primary },
  tabText: { color: THEME.muted, fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  heroCard: { alignItems: 'flex-start' },
  heroEmoji: { fontSize: 34, marginBottom: 6 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: THEME.text },
  heroSub: { color: THEME.primary, fontWeight: '900', marginTop: 4 },
  heroText: { color: THEME.muted, marginTop: 10, fontWeight: '700', lineHeight: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  monthButton: { flex: 1, backgroundColor: THEME.primarySoft, paddingVertical: 11, borderRadius: 14, alignItems: 'center' },
  monthButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  monthButtonDisabled: { opacity: 0.45 },
  monthButtonDisabledText: { color: THEME.muted },
  monthPill: { flex: 1.2, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  monthPillText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metricCard: { width: '47.5%', backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border },
  metricIcon: { fontSize: 24 },
  metricValue: { fontSize: 22, fontWeight: '900', color: THEME.text, marginTop: 6 },
  metricLabel: { fontSize: 12, color: THEME.muted, fontWeight: '800', marginTop: 2 },
  progressWrap: { marginTop: 12 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  progressLabel: { flex: 1, color: THEME.text, fontWeight: '800', fontSize: 13 },
  progressValue: { color: THEME.muted, fontWeight: '900', fontSize: 12 },
  progressTrack: { height: 9, backgroundColor: THEME.primarySoft, borderRadius: 99, marginTop: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  physicalSummary: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 10 },
  physicalBox: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: THEME.border },
  physicalLabel: { color: THEME.muted, fontSize: 12, fontWeight: '800' },
  physicalValue: { color: THEME.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  physicalDelta: { color: THEME.primary, fontSize: 12, fontWeight: '900', marginTop: 4 },
  miniNote: { color: THEME.muted, fontSize: 12, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  subTitle: { color: THEME.text, fontWeight: '900', fontSize: 14, marginTop: 16, marginBottom: 8 },
  chartBox: { backgroundColor: '#FFFFFFAA', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: THEME.border },
  chartItem: { marginBottom: 12 },
  chartDate: { color: THEME.text, fontWeight: '900', fontSize: 12, marginBottom: 6 },
  miniBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  miniBarLabel: { width: 32, color: THEME.muted, fontWeight: '900', fontSize: 11 },
  miniBarTrack: { flex: 1, height: 8, backgroundColor: THEME.primarySoft, borderRadius: 99, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 99 },
  miniBarValue: { width: 48, textAlign: 'right', color: THEME.text, fontWeight: '900', fontSize: 11 },
  measurementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: THEME.border },
  measurementDatePill: { backgroundColor: THEME.primarySoft, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  measurementDate: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  measurementInfo: { flex: 1 },
  measurementMain: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  measurementSub: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 2 },
  badgeAlbumHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  badgeCount: { minWidth: 34, textAlign: 'center', backgroundColor: '#FFF7E8', color: '#B46A00', fontWeight: '900', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 7 },
  badgeRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF7E8', borderRadius: 18, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#FFE0A3' },
  badgeIconBox: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#FFE0A3' },
  badgeIcon: { fontSize: 28 },
  badgeTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  badgeWeek: { color: '#B46A00', fontWeight: '900', fontSize: 12, marginTop: 3 },
  badgeNote: { color: THEME.muted, fontWeight: '700', lineHeight: 18, marginTop: 6 },
  averageHero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C5CBF', borderRadius: 24, padding: 18, marginBottom: 12 },
  averageLabel: { color: 'rgba(255,255,255,0.82)', fontWeight: '900', fontSize: 12, letterSpacing: 0.4 },
  averageTitle: { color: '#fff', fontSize: 23, fontWeight: '900', marginTop: 3 },
  averageSub: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 5 },
  lockBadge: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  lockIcon: { fontSize: 28 },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#F7F3FF', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#E9DDFB', marginBottom: 14 },
  privacyIcon: { fontSize: 28 },
  privacyTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  privacyText: { flex: 1, color: THEME.text, fontWeight: '700', lineHeight: 20 },
  privacyStrong: { fontWeight: '900', color: '#7C5CBF' },
  compareCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 15, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  compareHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  compareTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compareIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compareIcon: { fontSize: 24 },
  compareTitle: { color: THEME.text, fontWeight: '900', fontSize: 17 },
  compareUnit: { color: THEME.muted, fontWeight: '800', fontSize: 12 },
  statusBadge: { fontWeight: '900', fontSize: 11, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  compareBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  compareBarLabel: { width: 72, color: THEME.muted, fontWeight: '900', fontSize: 12 },
  compareTrack: { flex: 1, height: 10, backgroundColor: '#F0EDF8', borderRadius: 99, overflow: 'hidden' },
  compareFill: { height: '100%', borderRadius: 99 },
  compareBarValue: { width: 62, textAlign: 'right', color: THEME.muted, fontWeight: '900', fontSize: 12 },
  diffBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 10, marginTop: 12 },
  diffIcon: { fontSize: 17 },
  diffText: { flex: 1, color: THEME.text, fontWeight: '700', lineHeight: 18, fontSize: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF7E8', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#FFE3AA', marginTop: 4, marginBottom: 12 },
  infoIcon: { fontSize: 28 },
  infoTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  infoText: { color: THEME.text, fontWeight: '700', lineHeight: 19, marginTop: 3 },
  dataCountCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border },
  dataCountIcon: { fontSize: 24 },
  dataCountText: { flex: 1, color: THEME.muted, fontWeight: '800', lineHeight: 18 },
});
