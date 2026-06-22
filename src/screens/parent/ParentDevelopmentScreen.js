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

const MEAL_KEYS = ['kahvalti', 'ogle', 'araOgun'];
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

  const physicalRaw = useNodeList('fizikselGelisim');
  const reportsRaw = useNodeList('gunlukRaporlar');
  const attendanceRaw = useNodeList('yoklamalar');
  const eventsRaw = useNodeList('etkinlikler');
  const mealsRaw = useNodeList('yemekListeleri');

  const targetMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthKey = getMonthKey(targetMonth);

  const monthly = useMemo(() => {
    if (!selectedChild?.id) return null;

    const reports = reportsRaw.filter((item) => item.cocukId === selectedChild.id && isInMonth(item, monthKey));
    const attendance = attendanceRaw.filter((item) => item.cocukId === selectedChild.id && isInMonth(item, monthKey));
    const physical = physicalRaw
      .filter((item) => item.cocukId === selectedChild.id && isInMonth(item, monthKey))
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));

    const events = eventsRaw.filter((item) => {
      if (item.aktif === false) return false;
      if (item.kresId && kresId && item.kresId !== kresId) return false;
      if (Array.isArray(item.sinifIds) && sinifId) return item.sinifIds.includes(sinifId);
      if (item.sinifId && sinifId) return item.sinifId === sinifId;
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
    const averageSleep = sleepValues.length
      ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length
      : 0;

    const mealStats = buildMealStats(reports);
    const mealGoodTotal = mealStats.good;
    const mealTotal = mealStats.total;

    return {
      reports,
      attendance,
      physical,
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

  if (loading) return <LoadingScreen text="Aylık gelişim raporu hazırlanıyor..." />;

  return (
    <ScreenShell
      title="Aylık Gelişim"
      emoji="📈"
      subtitle={getMonthLabel(monthKey)}
      navigation={navigation}
    >
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Gelişim raporu için çocuk bağlantısı gerekir." />
      ) : !monthly ? (
        <EmptyState icon="📈" title="Rapor hazırlanamadı" desc="Bu ay için veri okunamadı." />
      ) : (
        <>
          <MonthSelector monthKey={monthKey} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />

          <View style={[styles.card, localStyles.heroCard]}>
            <Text style={localStyles.heroEmoji}>📊</Text>
            <Text style={localStyles.heroTitle}>{childName}</Text>
            <Text style={localStyles.heroSub}>{getMonthLabel(monthKey)} gelişim özeti</Text>
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
            <ProgressLine
              label={`${monthly.presentDays} gün geldi / ${monthly.attendanceTotal || 0} kayıt`}
              percent={percent(monthly.presentDays, monthly.attendanceTotal)}
              color={THEME.green}
            />
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
                  <ProgressLine
                    key={key}
                    label={`${MOOD_LABELS[key] || key}: ${count} gün`}
                    percent={percent(count, monthly.reports.length)}
                    color={getMoodColor(key)}
                  />
                ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Uyku ve Yemek</Text>
            <ProgressLine
              label={`Ortalama uyku: ${formatSleep(monthly.averageSleep)}`}
              percent={Math.min(100, Math.round((monthly.averageSleep / 2) * 100))}
              color={THEME.blue}
            />
            <ProgressLine
              label={`Yemek iyi: ${monthly.mealGoodTotal}/${monthly.mealTotal || 0} öğün`}
              percent={percent(monthly.mealGoodTotal, monthly.mealTotal)}
              color={THEME.orange}
            />
            <Text style={styles.cardText}>Yemek menüsü yayınlanan gün: {monthly.menuDays}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fiziksel Gelişim</Text>
            {monthly.physical.length === 0 ? (
              <Text style={styles.cardText}>Bu ay boy/kilo ölçümü girilmemiş.</Text>
            ) : (
              <>
                <Text style={styles.cardText}>Son ölçüm: {monthly.physical[0].tarih || '-'}</Text>
                <Text style={styles.cardText}>Boy: {monthly.physical[0].boy || '-'} cm</Text>
                <Text style={styles.cardText}>Kilo: {monthly.physical[0].kilo || '-'} kg</Text>
                {monthly.physical[0].basCevresi ? <Text style={styles.cardText}>Baş çevresi: {monthly.physical[0].basCevresi} cm</Text> : null}
              </>
            )}
          </View>
        </>
      )}
    </ScreenShell>
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
      <TouchableOpacity
        style={[localStyles.monthButton, monthOffset >= 0 && localStyles.monthButtonDisabled]}
        onPress={() => setMonthOffset((value) => Math.min(0, value + 1))}
        disabled={monthOffset >= 0}
        activeOpacity={0.8}
      >
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

function getMoodColor(key) {
  if (key === 'mutlu' || key === 'iyi' || key === 'sakin') return THEME.green;
  if (key === 'huzursuz' || key === 'uzgun') return THEME.red;
  if (key === 'yorgun') return THEME.orange;
  return THEME.primary;
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
});
