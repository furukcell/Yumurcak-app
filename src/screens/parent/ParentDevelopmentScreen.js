import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  isAbsentStatus,
} from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';
import { sortWeeklyBadgesNewestFirst } from '../../utils/weeklyBadges';

const MEAL_KEYS = ['kahvalti', 'ogle', 'araOgun'];
const MIN_AVERAGE_COUNT = 5;
const MOOD_LABELS = {
  mutlu: 'Mutlu',
  iyi: 'İyi',
  normal: 'Normal',
  sakin: 'Sakin',
  huzursuz: 'Huzursuz',
  uzgun: 'Üzgün',
  yorgun: 'Yorgun',
};

export default function ParentDevelopmentScreen({ navigation }) {
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

  const badgeHistory = useMemo(() => {
    if (!selectedChild?.id) return [];
    return badgesRaw
      .filter((item) => item.aktif !== false)
      .filter((item) => String(item.cocukId || '') === String(selectedChild.id))
      .sort(sortWeeklyBadgesNewestFirst);
  }, [badgesRaw, selectedChild?.id]);

  const monthly = useMemo(() => {
    if (!selectedChild?.id) return null;

    const reports = reportsRaw.filter((item) => item.cocukId === selectedChild.id && isInMonth(item, monthKey));
    const attendance = attendanceRaw.filter((item) => item.cocukId === selectedChild.id && isInMonth(item, monthKey));
    const physicalAll = physicalRaw
      .filter((item) => item.cocukId === selectedChild.id)
      .sort((a, b) => getSortableDate(b) - getSortableDate(a));
    const physical = physicalAll.filter((item) => isInMonth(item, monthKey));
    const physicalChart = physicalAll.slice(0, 6).reverse();
    const lastPhysical = physicalAll[0] || null;
    const previousPhysical = physicalAll[1] || null;

    const events = eventsRaw.filter((item) => {
      if (item.aktif === false) return false;
      if (item.kresId && kresId && item.kresId !== kresId) return false;
      if (Array.isArray(item.sinifIds) && sinifId) return item.sinifIds.includes(sinifId) && isInMonth(item, monthKey);
      if (item.sinifId && sinifId) return item.sinifId === sinifId && isInMonth(item, monthKey);
      return isInMonth(item, monthKey);
    });

    const menuDays = mealsRaw.filter((item) => {
      if (item.aktif === false) return false;
      if (item.kresId && kresId && item.kresId !== kresId) return false;
      if (item.sinifId && sinifId && item.sinifId !== sinifId) return false;
      return isInMonth(item, monthKey);
    }).length;

    const presentDays = attendance.filter((item) => !isAbsentStatus(item.durum || item.status)).length;
    const absentDays = attendance.filter((item) => isAbsentStatus(item.durum || item.status)).length;
    const attendanceTotal = attendance.length;

    const moodCounts = reports.reduce((acc, item) => {
      const key = normalizeMood(item.mood || item.ruhHali || item.durum || item.genelDurum);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0] || ['bekleniyor', 0];
    const positiveMoodDays = (moodCounts.mutlu || 0) + (moodCounts.iyi || 0) + (moodCounts.sakin || 0);

    const sleepValues = reports
      .map((item) => extractSleepHours(item))
      .filter((value) => Number.isFinite(value) && value > 0);
    const averageSleep = sleepValues.length ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length : 0;

    const mealStats = buildMealStats(reports);
    const mealGoodTotal = mealStats.good;
    const mealTotal = mealStats.total;

    return {
      reports,
      attendance,
      physical,
      physicalAll,
      physicalChart,
      lastPhysical,
      previousPhysical,
      heightDelta: buildDelta(lastPhysical, previousPhysical, 'boy'),
      weightDelta: buildDelta(lastPhysical, previousPhysical, 'kilo'),
      events,
      menuDays,
      presentDays,
      absentDays,
      attendanceTotal,
      moodCounts,
      topMood,
      positiveMoodDays,
      averageSleep,
      sleepDays: sleepValues.length,
      mealGoodTotal,
      mealTotal,
      comment: buildMonthlyComment({
        childName,
        presentDays,
        absentDays,
        attendanceTotal,
        positiveMoodDays,
        reportDays: reports.length,
        topMood,
        averageSleep,
        mealGoodTotal,
        mealTotal,
        eventCount: events.length,
      }),
    };
  }, [selectedChild?.id, reportsRaw, attendanceRaw, physicalRaw, eventsRaw, mealsRaw, monthKey, kresId, sinifId, childName]);

  const classAverage = useMemo(() => {
    if (!selectedChild?.id || !sinifId) return null;
    return buildClassAverageData({ physicalRaw, selectedChild, sinifId, kresId, monthKey });
  }, [physicalRaw, selectedChild?.id, sinifId, kresId, monthKey]);

  if (loading) return <LoadingScreen text="Aylık gelişim raporu hazırlanıyor..." />;

  return (
    <ScreenShell
      title="Gelişim"
      emoji="📈"
      subtitle={activeTab === 'monthly' ? getMonthLabel(monthKey) : 'Anonim sınıf ortalaması'}
      navigation={navigation}
    >
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Gelişim raporu için çocuk bağlantısı gerekir." />
      ) : !monthly ? (
        <EmptyState icon="📈" title="Rapor hazırlanamadı" desc="Bu ay için veri okunamadı." />
      ) : (
        <>
          <DevelopmentTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <MonthSelector monthKey={monthKey} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />

          {activeTab === 'monthly' ? (
            <MonthlyDevelopmentContent monthly={monthly} childName={childName} badgeHistory={badgeHistory} />
          ) : (
            <ClassAverageContent data={classAverage} childName={childName} monthKey={monthKey} />
          )}
        </>
      )}
    </ScreenShell>
  );
}

function DevelopmentTabs({ activeTab, setActiveTab }) {
  return (
    <View style={localStyles.tabRow}>
      <TouchableOpacity style={[localStyles.tabButton, activeTab === 'monthly' && localStyles.tabButtonActive]} onPress={() => setActiveTab('monthly')} activeOpacity={0.85}>
        <Text style={[localStyles.tabText, activeTab === 'monthly' && localStyles.tabTextActive]}>📅 Aylık Gelişim</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[localStyles.tabButton, activeTab === 'classAverage' && localStyles.tabButtonActive]} onPress={() => setActiveTab('classAverage')} activeOpacity={0.85}>
        <Text style={[localStyles.tabText, activeTab === 'classAverage' && localStyles.tabTextActive]}>📊 Sınıf Ortalaması</Text>
      </TouchableOpacity>
    </View>
  );
}

function MonthlyDevelopmentContent({ monthly, childName, badgeHistory }) {
  return (
    <>
      <View style={[styles.card, localStyles.heroCard]}>
        <Text style={localStyles.heroEmoji}>📊</Text>
        <Text style={localStyles.heroTitle}>{childName}</Text>
        <Text style={localStyles.heroSub}>Aylık gelişim özeti</Text>
        <Text style={localStyles.heroText}>{monthly.comment}</Text>
      </View>

      <Text style={styles.sectionTitle}>Ayın Özeti</Text>
      <View style={localStyles.grid}>
        <MetricCard icon="✅" value={`${monthly.presentDays}`} label="Geldiği gün" />
        <MetricCard icon="🏠" value={`${monthly.absentDays}`} label="Devamsızlık" />
        <MetricCard icon="😊" value={`${monthly.positiveMoodDays}`} label="Olumlu ruh hali" />
        <MetricCard icon="🎨" value={`${monthly.events.length}`} label="Etkinlik" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Katılım Durumu</Text>
        <ProgressLine label={`${monthly.presentDays} gün geldi / ${monthly.attendanceTotal || 0} kayıt`} percent={percent(monthly.presentDays, monthly.attendanceTotal)} color={THEME.green} />
        <Text style={styles.cardText}>Devamsızlık: {monthly.absentDays} gün</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ruh Hali Dağılımı</Text>
        {Object.entries(monthly.moodCounts).length === 0 ? (
          <Text style={styles.cardText}>Bu ay ruh hali kaydı yok.</Text>
        ) : (
          Object.entries(monthly.moodCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => (
              <ProgressLine key={key} label={`${MOOD_LABELS[key] || key}: ${count} gün`} percent={percent(count, monthly.reports.length)} color={getMoodColor(key)} />
            ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uyku ve Yemek</Text>
        <ProgressLine label={`Ortalama uyku: ${formatSleep(monthly.averageSleep)}`} percent={Math.min(100, Math.round((monthly.averageSleep / 2) * 100))} color={THEME.blue} />
        <ProgressLine label={`Yemek iyi: ${monthly.mealGoodTotal}/${monthly.mealTotal || 0} öğün`} percent={percent(monthly.mealGoodTotal, monthly.mealTotal)} color={THEME.orange} />
        <Text style={styles.cardText}>Yemek menüsü yayınlanan gün: {monthly.menuDays}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fiziksel Gelişim</Text>
        {monthly.physicalAll.length === 0 ? (
          <Text style={styles.cardText}>Henüz boy/kilo ölçümü girilmemiş.</Text>
        ) : (
          <>
            <View style={localStyles.physicalSummary}>
              <View style={localStyles.physicalBox}>
                <Text style={localStyles.physicalLabel}>Son boy</Text>
                <Text style={localStyles.physicalValue}>{formatMeasurement(monthly.lastPhysical, 'boy', 'cm')}</Text>
                <Text style={localStyles.physicalDelta}>{monthly.heightDelta}</Text>
              </View>
              <View style={localStyles.physicalBox}>
                <Text style={localStyles.physicalLabel}>Son kilo</Text>
                <Text style={localStyles.physicalValue}>{formatMeasurement(monthly.lastPhysical, 'kilo', 'kg')}</Text>
                <Text style={localStyles.physicalDelta}>{monthly.weightDelta}</Text>
              </View>
            </View>

            <Text style={styles.cardText}>Son ölçüm: {formatDate(monthly.lastPhysical)}</Text>
            {monthly.lastPhysical?.basCevresi ? <Text style={styles.cardText}>Baş çevresi: {monthly.lastPhysical.basCevresi} cm</Text> : null}
            {monthly.physical.length === 0 ? (
              <Text style={localStyles.miniNote}>Bu ay yeni ölçüm yok; aşağıda son kayıtlar gösteriliyor.</Text>
            ) : (
              <Text style={localStyles.miniNote}>Bu ay {monthly.physical.length} fiziksel ölçüm kaydı var.</Text>
            )}

            <Text style={localStyles.subTitle}>Gelişim görünümü</Text>
            <PhysicalGrowthChart measurements={monthly.physicalChart} />

            <Text style={localStyles.subTitle}>Son ölçümler</Text>
            {monthly.physicalAll.slice(0, 6).map((item) => (
              <MeasurementRow key={item.id || `${item.tarih}-${item.createdAt}`} item={item} />
            ))}
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={localStyles.badgeAlbumHead}>
          <View>
            <Text style={styles.cardTitle}>🎖️ Rozet Albümü</Text>
            <Text style={localStyles.miniNote}>Haftanın Yıldızı geçmişi sadece bu çocuğa ait kayıtları gösterir.</Text>
          </View>
          <Text style={localStyles.badgeCount}>{badgeHistory.length}</Text>
        </View>
        {badgeHistory.length === 0 ? (
          <Text style={styles.cardText}>Henüz rozet kaydı yok. Öğretmen cuma günü rozet verdiğinde burada görünecek.</Text>
        ) : (
          badgeHistory.map((item) => <BadgeHistoryRow key={item.id || `${item.weekKey}_${item.cocukId}`} item={item} />)
        )}
      </View>
    </>
  );
}

function ClassAverageContent({ data, childName, monthKey }) {
  const firstName = getFirstName(childName);

  if (!data?.childMeasurement) {
    return (
      <>
        <AnonHeader childName={childName} monthKey={monthKey} dataCount={0} />
        <EmptyState icon="📏" title="Ölçüm bulunamadı" desc="Bu ay için çocuğunuzun fiziksel ölçüm kaydı yok. Ölçüm girildiğinde sınıf ortalamasıyla karşılaştırma burada görünür." />
      </>
    );
  }

  if (!data.canShowAverage) {
    return (
      <>
        <AnonHeader childName={childName} monthKey={monthKey} dataCount={data.count || 0} />
        <View style={localStyles.privacyCard}>
          <Text style={localStyles.privacyIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.privacyTitle}>Anonim veri için yeterli kayıt yok</Text>
            <Text style={localStyles.privacyText}>Sınıf ortalaması en az {MIN_AVERAGE_COUNT} çocuk ölçümü olduğunda gösterilir. Böylece hiçbir çocuğun verisi tek tek anlaşılmaz.</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <AnonHeader childName={childName} monthKey={monthKey} dataCount={data.count} />
      <View style={localStyles.privacyCard}>
        <Text style={localStyles.privacyIcon}>🛡️</Text>
        <Text style={localStyles.privacyText}><Text style={localStyles.privacyStrong}>Tamamen anonim.</Text> Sadece sınıf ortalaması gösterilir; başka çocukların adı veya tekil verisi görünmez.</Text>
      </View>

      <Text style={styles.sectionTitle}>Fiziksel Karşılaştırma</Text>
      <CompareMetricCard icon="📏" title="Boy" suffix="cm" childName={firstName} childValue={data.child.boy} avgValue={data.average.boy} color="#7C5CBF" />
      <CompareMetricCard icon="⚖️" title="Kilo" suffix="kg" childName={firstName} childValue={data.child.kilo} avgValue={data.average.kilo} color="#F472B6" />
      {data.child.basCevresi || data.average.basCevresi ? (
        <CompareMetricCard icon="🙂" title="Baş Çevresi" suffix="cm" childName={firstName} childValue={data.child.basCevresi} avgValue={data.average.basCevresi} color="#34D399" />
      ) : null}

      <View style={localStyles.infoCard}>
        <Text style={localStyles.infoIcon}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text style={localStyles.infoTitle}>Bilgilendirme</Text>
          <Text style={localStyles.infoText}>Bu karşılaştırma sınıf ortalamasına göre genel bir bilgidir. Her çocuğun gelişimi kendine özeldir ve farklı hızlarda ilerleyebilir.</Text>
        </View>
      </View>

      <View style={localStyles.dataCountCard}>
        <Text style={localStyles.dataCountIcon}>👥</Text>
        <Text style={localStyles.dataCountText}>{getMonthLabel(monthKey)} ortalaması {data.count} anonim çocuk ölçümü ile hesaplandı.</Text>
      </View>
    </>
  );
}

function AnonHeader({ childName, monthKey, dataCount }) {
  return (
    <View style={localStyles.averageHero}>
      <View style={{ flex: 1 }}>
        <Text style={localStyles.averageLabel}>%100 Anonim</Text>
        <Text style={localStyles.averageTitle}>Sınıf Ortalaması</Text>
        <Text style={localStyles.averageSub}>{childName} · {getMonthLabel(monthKey)} · {dataCount || 0} kayıt</Text>
      </View>
      <View style={localStyles.lockBadge}><Text style={localStyles.lockIcon}>🔒</Text></View>
    </View>
  );
}

function CompareMetricCard({ icon, title, suffix, childName, childValue, avgValue, color }) {
  const child = Number(childValue || 0);
  const avg = Number(avgValue || 0);
  if (!child || !avg) return null;
  const max = Math.max(child, avg, 1);
  const childPercent = Math.max(12, Math.round((child / max) * 100));
  const avgPercent = Math.max(12, Math.round((avg / max) * 100));
  const diff = Number((child - avg).toFixed(1));
  const status = getComparisonStatus(diff, suffix);

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
      <CompareBar label="Sınıf Ort." value={`${avg}${suffix}`} percent={avgPercent} color="#D4C5F5" />

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

function MonthSelector({ monthKey, monthOffset, setMonthOffset }) {
  return (
    <View style={localStyles.monthRow}>
      <TouchableOpacity style={localStyles.monthButton} onPress={() => setMonthOffset((value) => value - 1)} activeOpacity={0.8}>
        <Text style={localStyles.monthButtonText}>‹ Önceki</Text>
      </TouchableOpacity>
      <View style={localStyles.monthPill}>
        <Text style={localStyles.monthPillText}>{getMonthLabel(monthKey)}</Text>
      </View>
      <TouchableOpacity style={[localStyles.monthButton, monthOffset >= 0 && localStyles.monthButtonDisabled]} onPress={() => setMonthOffset((value) => Math.min(0, value + 1))} disabled={monthOffset >= 0} activeOpacity={0.8}>
        <Text style={[localStyles.monthButtonText, monthOffset >= 0 && localStyles.monthButtonDisabledText]}>Sonraki ›</Text>
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

function PhysicalGrowthChart({ measurements }) {
  const clean = (measurements || []).filter((item) => getPhysicalValue(item, 'boy') || getPhysicalValue(item, 'kilo'));
  if (clean.length === 0) return <Text style={styles.cardText}>Grafik için yeterli ölçüm kaydı yok.</Text>;

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
            <MiniBar label="Boy" value={height} max={maxHeight} suffix="cm" color={THEME.primary} />
            <MiniBar label="Kilo" value={weight} max={maxWeight} suffix="kg" color={THEME.green} />
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

function MeasurementRow({ item }) {
  return (
    <View style={localStyles.measurementRow}>
      <View style={localStyles.measurementDatePill}>
        <Text style={localStyles.measurementDate}>{shortDate(item)}</Text>
      </View>
      <View style={localStyles.measurementInfo}>
        <Text style={localStyles.measurementMain}>Boy: {formatMeasurement(item, 'boy', 'cm')} · Kilo: {formatMeasurement(item, 'kilo', 'kg')}</Text>
        {item.basCevresi ? <Text style={localStyles.measurementSub}>Baş çevresi: {item.basCevresi} cm</Text> : null}
      </View>
    </View>
  );
}

function BadgeHistoryRow({ item }) {
  return (
    <View style={localStyles.badgeRow}>
      <View style={localStyles.badgeIconBox}><Text style={localStyles.badgeIcon}>{item.badgeEmoji || item.rozetEmoji || '🌟'}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={localStyles.badgeTitle}>{item.badgeTitle || item.rozetAdi || 'Rozet'}</Text>
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

function getComparisonStatus(diff, suffix) {
  const abs = Math.abs(diff);
  const threshold = suffix === 'kg' ? 0.8 : 2;
  if (abs <= threshold) {
    return { label: 'Ortalamaya yakın', icon: '✅', color: '#2563EB', bg: '#EFF6FF', message: 'Sınıf ortalamasına yakın bir değer görünüyor.' };
  }
  if (diff > 0) {
    return { label: 'Ortalamanın üzerinde', icon: '↗', color: '#059669', bg: '#ECFDF5', message: `Sınıf ortalamasından ${abs}${suffix} daha yüksek görünüyor.` };
  }
  return { label: 'Ortalamanın altında', icon: '↘', color: '#D97706', bg: '#FFF7ED', message: `Sınıf ortalamasından ${abs}${suffix} daha düşük görünüyor.` };
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

function normalizeMood(value) {
  const raw = String(value || 'bekleniyor').toLowerCase().trim();
  if (raw.includes('mutlu')) return 'mutlu';
  if (raw.includes('iyi')) return 'iyi';
  if (raw.includes('sakin')) return 'sakin';
  if (raw.includes('huzursuz')) return 'huzursuz';
  if (raw.includes('üzg') || raw.includes('uzg')) return 'uzgun';
  if (raw.includes('yorgun')) return 'yorgun';
  if (raw.includes('normal')) return 'normal';
  return raw || 'bekleniyor';
}

function extractSleepHours(item) {
  const value = item?.uyku?.sure || item?.uykuSuresi || item?.uykuSaat || item?.uyku || item?.uykuDurumu;
  if (typeof value === 'number') return value;
  const text = String(value || '').replace(',', '.');
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function buildMealStats(reports) {
  return reports.reduce((acc, item) => {
    const yemek = item.yemek || item.yemekDurumu || {};
    MEAL_KEYS.forEach((key) => {
      const raw = yemek?.[key]?.durum || yemek?.[key] || item?.[key];
      if (!raw) return;
      acc.total += 1;
      if (isGoodMeal(raw)) acc.good += 1;
    });
    return acc;
  }, { good: 0, total: 0 });
}

function isGoodMeal(value) {
  const raw = String(value || '').toLowerCase();
  return raw.includes('bitirdi') || raw.includes('iyi') || raw.includes('yedi') || raw.includes('tamam');
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function formatSleep(value) {
  if (!value) return 'Kayıt yok';
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (hours <= 0) return `${minutes} dk`;
  if (minutes <= 0) return `${hours} sa`;
  return `${hours} sa ${minutes} dk`;
}

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

function buildDelta(current, previous, key) {
  const now = getPhysicalValue(current, key);
  const before = getPhysicalValue(previous, key);
  if (!now || !before) return 'Önceki kayıt yok';
  const diff = Number((now - before).toFixed(1));
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return 'Değişim yok';
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

function getFirstName(value) {
  return String(value || 'Çocuğunuz').trim().split(' ')[0] || 'Çocuğunuz';
}

function buildMonthlyComment(data) {
  const name = String(data.childName || 'Çocuğunuz').split(' ')[0] || 'Çocuğunuz';
  const parts = [];

  if (data.attendanceTotal > 0) {
    if (percent(data.presentDays, data.attendanceTotal) >= 80) {
      parts.push(`${name} bu ay kreşe düzenli katılım göstermiş.`);
    } else {
      parts.push(`${name} için bu ay katılım tarafında takip edilmesi gereken birkaç gün görünüyor.`);
    }
  } else {
    parts.push(`${name} için bu ay yoklama kaydı henüz yeterli değil.`);
  }

  if (data.reportDays > 0) {
    const moodLabel = MOOD_LABELS[data.topMood?.[0]] || data.topMood?.[0] || 'genel durum';
    parts.push(`Ruh hali kayıtlarında en çok "${moodLabel}" öne çıkıyor.`);
  }

  if (data.mealTotal > 0) {
    if (percent(data.mealGoodTotal, data.mealTotal) >= 70) {
      parts.push('Yemek düzeni genel olarak olumlu görünüyor.');
    } else {
      parts.push('Yemek tarafında bazı günlerde destek gerekebilir.');
    }
  }

  if (data.averageSleep > 0) {
    parts.push(`Uyku ortalaması ${formatSleep(data.averageSleep)} civarında.`);
  }

  if (data.eventCount > 0) {
    parts.push(`Bu ay ${data.eventCount} etkinlik kaydı bulunuyor; sosyal ve sınıf içi katılım takip edilebilir.`);
  }

  return parts.join(' ');
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
