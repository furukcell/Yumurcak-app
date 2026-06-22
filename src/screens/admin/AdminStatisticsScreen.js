import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  blue: '#3A7BFF',
  red: '#FF4D6D',
  teal: '#00B4D8',
  purple: '#8E44AD',
  gold: '#C98A00',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const TABS = [
  { key: 'genel', label: 'Genel' },
  { key: 'ogretmen', label: 'Öğretmenler' },
  { key: 'cocuk', label: 'Çocuklar' },
  { key: 'risk', label: 'Riskler' },
];

const NODE_KEYS = [
  'cocuklar',
  'kullanicilar',
  'siniflar',
  'yoklamalar',
  'gunlukRaporlar',
  'odemeler',
  'anketler',
  'kurumZili',
  'etkinlikler',
  'yemekListeleri',
];

export default function AdminStatisticsScreen() {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || 'kres001';
  const [activeTab, setActiveTab] = useState('genel');
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState({});

  useEffect(() => {
    let mounted = true;
    const loaded = {};

    const unsubscribers = NODE_KEYS.map((node) => onValue(
      ref(database, node),
      (snap) => {
        if (!mounted) return;
        loaded[node] = true;
        setRaw((prev) => ({ ...prev, [node]: toList(snap.val()) }));
        if (NODE_KEYS.every((key) => loaded[key])) setLoading(false);
      },
      () => {
        loaded[node] = true;
        if (mounted) {
          setRaw((prev) => ({ ...prev, [node]: [] }));
          if (NODE_KEYS.every((key) => loaded[key])) setLoading(false);
        }
      }
    ));

    return () => {
      mounted = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, []);

  const stats = useMemo(() => buildStatistics(raw, kresId), [raw, kresId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.headerEmoji}>📊</Text>
          <Text style={styles.headerTitle}>Kurum İstatistikleri</Text>
          <Text style={styles.headerSub}>Genel gidişat, öğretmen kullanımı ve çocuk bazlı risk analizi</Text>
        </View>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={THEME.primary} />
            <Text style={styles.loadingText}>İstatistikler hazırlanıyor...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'genel' && <GeneralTab stats={stats} />}
            {activeTab === 'ogretmen' && <TeacherTab teachers={stats.teacherStats} />}
            {activeTab === 'cocuk' && <ChildrenTab children={stats.childStats} />}
            {activeTab === 'risk' && <RiskTab riskGroups={stats.riskGroups} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GeneralTab({ stats }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Kurum Genel Durum</Text>
      <View style={styles.grid}>
        <StatCard icon="👶" value={stats.totalChildren} label="Toplam çocuk" color={THEME.orange} />
        <StatCard icon="👨‍🏫" value={stats.totalTeachers} label="Öğretmen" color={THEME.primary} />
        <StatCard icon="👨‍👩‍👧" value={stats.totalParents} label="Veli" color={THEME.green} />
        <StatCard icon="🏫" value={stats.totalClasses} label="Sınıf" color={THEME.blue} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Bugünkü Yoklama</Text>
        <ProgressLine label={`${stats.todayPresent} gelen / ${stats.todayAttendanceTotal} kayıt`} percent={stats.todayAttendanceRate} color={THEME.green} />
        <Text style={styles.cardText}>Bugün gelmeyen çocuk: {stats.todayAbsent}</Text>
        <Text style={styles.cardText}>Bugün girilen günlük rapor: {stats.todayReportCount}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Bu Ay Ödeme Durumu</Text>
        <ProgressLine label={`Tahsilat oranı: %${stats.paymentCollectionRate}`} percent={stats.paymentCollectionRate} color={THEME.gold} />
        <Text style={styles.cardText}>Ödenen: {formatTL(stats.paidAmount)}</Text>
        <Text style={styles.cardText}>Bekleyen / geciken: {formatTL(stats.pendingAmount)}</Text>
        <Text style={styles.cardText}>Bekleyen ödeme kaydı: {stats.pendingPaymentCount}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Veli Etkileşimi</Text>
        <ProgressLine label={`Anket cevabı: ${stats.pollAnswerCount}`} percent={Math.min(100, stats.pollAnswerCount * 10)} color={THEME.purple} />
        <Text style={styles.cardText}>Aktif anket: {stats.activePollCount}</Text>
        <Text style={styles.cardText}>Kurum zili bildirimi: {stats.bellCount}</Text>
        <Text style={styles.cardText}>Bekleyen kurum zili: {stats.pendingBellCount}</Text>
      </View>
    </>
  );
}

function TeacherTab({ teachers }) {
  if (!teachers.length) return <EmptyBlock icon="👨‍🏫" title="Öğretmen istatistiği yok" desc="Bu kurum için öğretmen veya öğretmen raporu bulunamadı." />;

  return (
    <>
      <Text style={styles.sectionTitle}>Öğretmen / Sınıf Kullanımı</Text>
      {teachers.map((teacher) => (
        <View key={teacher.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{teacher.name}</Text>
              <Text style={styles.cardText}>{teacher.classNames || 'Sınıf bilgisi yok'}</Text>
            </View>
            <Text style={styles.badge}>{teacher.childCount} çocuk</Text>
          </View>
          <ProgressLine label={`Bu ay günlük rapor: ${teacher.reportCount}`} percent={Math.min(100, teacher.reportCount * 5)} color={THEME.primary} />
          <ProgressLine label={`Yoklama düzeni: %${teacher.attendanceRate}`} percent={teacher.attendanceRate} color={THEME.green} />
          <Text style={styles.cardText}>Etkinlik kaydı: {teacher.eventCount}</Text>
          <Text style={styles.cardText}>Eksik rapor uyarısı: {teacher.reportCount < 5 ? 'Takip edilmeli' : 'Normal görünüyor'}</Text>
        </View>
      ))}
    </>
  );
}

function ChildrenTab({ children }) {
  if (!children.length) return <EmptyBlock icon="👶" title="Çocuk istatistiği yok" desc="Bu kurum için çocuk kaydı bulunamadı." />;

  return (
    <>
      <Text style={styles.sectionTitle}>Çocuk Bazlı Gelişim ve Risk</Text>
      {children.map((child) => (
        <View key={child.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{child.name}</Text>
              <Text style={styles.cardText}>{child.className || 'Sınıf bilgisi yok'}</Text>
            </View>
            <RiskBadge riskCount={child.risks.length} />
          </View>

          <ProgressLine label={`Devam oranı: %${child.attendanceRate}`} percent={child.attendanceRate} color={child.attendanceRate < 80 ? THEME.red : THEME.green} />
          <ProgressLine label={`Yemek iyi: %${child.mealGoodRate}`} percent={child.mealGoodRate} color={child.mealGoodRate < 65 ? THEME.orange : THEME.green} />
          <ProgressLine label={`Etkinlik katılımı: %${child.eventJoinRate}`} percent={child.eventJoinRate} color={child.eventJoinRate < 70 ? THEME.red : THEME.purple} />

          <Text style={styles.cardText}>Uyku: {child.sleepSummary}</Text>
          <Text style={styles.cardText}>Ruh hali: {child.moodSummary}</Text>
          <Text style={styles.cardText}>Yorum: {child.comment}</Text>

          <View style={styles.riskChipRow}>
            {child.risks.length ? child.risks.map((risk) => <Text key={risk} style={styles.riskChip}>{risk}</Text>) : <Text style={styles.okChip}>Belirgin risk yok</Text>}
          </View>
        </View>
      ))}
    </>
  );
}

function RiskTab({ riskGroups }) {
  const groupList = [
    { key: 'meal', title: '🍽️ Yemek Takibi Gerekenler', empty: 'Yemek tarafında belirgin risk yok.' },
    { key: 'event', title: '🎨 Etkinlik Katılımı Düşük', empty: 'Etkinlik katılımı genel olarak iyi.' },
    { key: 'attendance', title: '📅 Devamsızlık Dikkat', empty: 'Devamsızlıkta belirgin risk yok.' },
    { key: 'mood', title: '😟 Ruh Hali Takibi', empty: 'Ruh hali tarafında belirgin risk yok.' },
    { key: 'sleep', title: '😴 Uyku Takibi', empty: 'Uyku tarafında belirgin risk yok.' },
  ];

  return (
    <>
      <Text style={styles.sectionTitle}>Risk Listesi</Text>
      {groupList.map((group) => (
        <View key={group.key} style={styles.card}>
          <Text style={styles.cardTitle}>{group.title}</Text>
          {riskGroups[group.key].length ? (
            riskGroups[group.key].map((item) => (
              <View key={`${group.key}-${item.id}`} style={styles.riskRow}>
                <Text style={styles.riskName}>{item.name}</Text>
                <Text style={styles.riskDesc}>{item.reason}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.cardText}>{group.empty}</Text>
          )}
        </View>
      ))}
    </>
  );
}

function buildStatistics(raw, kresId) {
  const children = filterByKres(raw.cocuklar, kresId);
  const users = filterByKres(raw.kullanicilar, kresId);
  const classes = filterByKres(raw.siniflar, kresId);
  const attendance = filterByKres(raw.yoklamalar, kresId);
  const reports = filterByKres(raw.gunlukRaporlar, kresId);
  const payments = filterByKres(raw.odemeler, kresId);
  const polls = filterByKres(raw.anketler, kresId);
  const bells = filterByKres(raw.kurumZili, kresId);
  const events = filterByKres(raw.etkinlikler, kresId);

  const todayKey = getDateKey(new Date());
  const monthKey = getMonthKey(new Date());
  const monthAttendance = attendance.filter((item) => isInMonth(item, monthKey));
  const todayAttendance = attendance.filter((item) => isSameDay(item, todayKey));
  const todayPresent = todayAttendance.filter((item) => !isAbsentStatus(item.durum || item.status)).length;
  const todayAbsent = todayAttendance.filter((item) => isAbsentStatus(item.durum || item.status)).length;

  const monthPayments = payments.filter((item) => isInMonth(item, monthKey));
  const paidPayments = monthPayments.filter((item) => isPaidStatus(item.durum || item.status));
  const pendingPayments = monthPayments.filter((item) => !isPaidStatus(item.durum || item.status));
  const paidAmount = paidPayments.reduce((sum, item) => sum + getAmount(item), 0);
  const pendingAmount = pendingPayments.reduce((sum, item) => sum + getAmount(item), 0);

  const childStats = children.map((child) => buildChildStats(child, { classes, reports, attendance: monthAttendance, events, monthKey }));
  const teacherStats = buildTeacherStats(users, classes, children, reports, monthAttendance, events);
  const riskGroups = buildRiskGroups(childStats);

  return {
    totalChildren: children.length,
    totalTeachers: users.filter((u) => getRole(u) === 'ogretmen').length,
    totalParents: users.filter((u) => getRole(u) === 'veli').length,
    totalClasses: classes.length,
    todayPresent,
    todayAbsent,
    todayAttendanceTotal: todayAttendance.length,
    todayAttendanceRate: percent(todayPresent, todayAttendance.length),
    todayReportCount: reports.filter((item) => isSameDay(item, todayKey)).length,
    paidAmount,
    pendingAmount,
    pendingPaymentCount: pendingPayments.length,
    paymentCollectionRate: percent(paidAmount, paidAmount + pendingAmount),
    activePollCount: polls.filter((item) => item.aktif !== false).length,
    pollAnswerCount: polls.reduce((sum, item) => sum + countAnswers(item), 0),
    bellCount: bells.filter((item) => isInMonth(item, monthKey)).length,
    pendingBellCount: bells.filter((item) => !item.tamamlandi && item.status !== 'tamamlandi').length,
    childStats,
    teacherStats,
    riskGroups,
  };
}

function buildChildStats(child, context) {
  const childId = child.id;
  const childReports = context.reports.filter((item) => getChildId(item) === childId && isInMonth(item, context.monthKey));
  const childAttendance = context.attendance.filter((item) => getChildId(item) === childId && isInMonth(item, context.monthKey));
  const present = childAttendance.filter((item) => !isAbsentStatus(item.durum || item.status)).length;
  const absent = childAttendance.filter((item) => isAbsentStatus(item.durum || item.status)).length;

  const meal = buildMealStats(childReports);
  const event = buildEventStats(childReports);
  const sleep = buildSleepStats(childReports);
  const mood = buildMoodStats(childReports);

  const risks = [];
  if (childAttendance.length >= 3 && percent(absent, childAttendance.length) >= 20) risks.push('Devam');
  if (meal.total >= 3 && percent(meal.bad, meal.total) >= 35) risks.push('Yemek');
  if (event.total >= 3 && percent(event.bad, event.total) >= 30) risks.push('Etkinlik');
  if (mood.total >= 3 && percent(mood.negative, mood.total) >= 30) risks.push('Ruh hali');
  if (sleep.total >= 3 && percent(sleep.bad, sleep.total) >= 30) risks.push('Uyku');

  const className = findClassName(context.classes, child.sinifId || child.classId);
  const name = getName(child, 'İsimsiz çocuk');

  return {
    id: childId,
    name,
    className,
    attendanceRate: percent(present, childAttendance.length),
    absent,
    mealGoodRate: percent(meal.good, meal.total),
    eventJoinRate: percent(event.good, event.total),
    sleepSummary: sleep.total ? `${sleep.good} iyi / ${sleep.bad} takip` : 'Kayıt yok',
    moodSummary: mood.total ? `${mood.topLabel} ağırlıklı` : 'Kayıt yok',
    risks,
    riskReasons: {
      meal: `${meal.bad} öğün az/yemedi`,
      event: `${event.bad} etkinlikte düşük katılım`,
      attendance: `${absent} gün devamsızlık`,
      mood: `${mood.negative} gün huzursuz/üzgün`,
      sleep: `${sleep.bad} gün uyku takibi`,
    },
    comment: buildChildComment(name, risks),
  };
}

function buildTeacherStats(users, classes, children, reports, attendance, events) {
  const teachers = users.filter((u) => getRole(u) === 'ogretmen');

  return teachers.map((teacher) => {
    const teacherId = teacher.id;
    const teacherClasses = classes.filter((item) =>
      item.ogretmenId === teacherId || item.teacherId === teacherId || item.sorumluOgretmenId === teacherId || item.createdBy === teacherId
    );
    const classIds = teacherClasses.map((item) => item.id);
    const teacherChildren = children.filter((child) => classIds.includes(child.sinifId || child.classId) || child.ogretmenId === teacherId || child.teacherId === teacherId);
    const teacherReports = reports.filter((item) => item.ogretmenId === teacherId || item.teacherId === teacherId || item.createdBy === teacherId || classIds.includes(item.sinifId || item.classId));
    const teacherAttendance = attendance.filter((item) => item.ogretmenId === teacherId || item.teacherId === teacherId || item.createdBy === teacherId || classIds.includes(item.sinifId || item.classId));
    const present = teacherAttendance.filter((item) => !isAbsentStatus(item.durum || item.status)).length;
    const teacherEvents = events.filter((item) => item.ogretmenId === teacherId || item.teacherId === teacherId || item.createdBy === teacherId || classIds.includes(item.sinifId || item.classId));

    return {
      id: teacherId,
      name: getName(teacher, 'İsimsiz öğretmen'),
      classNames: teacherClasses.map((item) => item.ad || item.sinifAdi || item.name).filter(Boolean).join(', '),
      childCount: teacherChildren.length,
      reportCount: teacherReports.length,
      attendanceRate: percent(present, teacherAttendance.length),
      eventCount: teacherEvents.length,
    };
  }).sort((a, b) => b.reportCount - a.reportCount);
}

function buildRiskGroups(childStats) {
  return {
    meal: childStats.filter((item) => item.risks.includes('Yemek')).map((item) => ({ id: item.id, name: item.name, reason: item.riskReasons.meal })),
    event: childStats.filter((item) => item.risks.includes('Etkinlik')).map((item) => ({ id: item.id, name: item.name, reason: item.riskReasons.event })),
    attendance: childStats.filter((item) => item.risks.includes('Devam')).map((item) => ({ id: item.id, name: item.name, reason: item.riskReasons.attendance })),
    mood: childStats.filter((item) => item.risks.includes('Ruh hali')).map((item) => ({ id: item.id, name: item.name, reason: item.riskReasons.mood })),
    sleep: childStats.filter((item) => item.risks.includes('Uyku')).map((item) => ({ id: item.id, name: item.name, reason: item.riskReasons.sleep })),
  };
}

function buildMealStats(reports) {
  const keys = ['kahvalti', 'ogle', 'araOgun', 'sabah', 'oglen', 'ikindi'];
  return reports.reduce((acc, item) => {
    keys.forEach((key) => {
      if (item[key] === undefined || item[key] === null || item[key] === '') return;
      acc.total += 1;
      if (isBadValue(item[key])) acc.bad += 1;
      else acc.good += 1;
    });
    return acc;
  }, { total: 0, good: 0, bad: 0 });
}

function buildEventStats(reports) {
  return reports.reduce((acc, item) => {
    const value = item.etkinlikKatildi ?? item.etkinlikDurumu ?? item.activityStatus ?? item.etkinlik;
    if (value === undefined || value === null || value === '') return acc;
    acc.total += 1;
    if (isBadValue(value) || value === false) acc.bad += 1;
    else acc.good += 1;
    return acc;
  }, { total: 0, good: 0, bad: 0 });
}

function buildSleepStats(reports) {
  return reports.reduce((acc, item) => {
    const value = item.uyku || item.uykuDurumu || item.sleep || item.uykuSaati;
    if (value === undefined || value === null || value === '') return acc;
    acc.total += 1;
    if (isBadValue(value) || value === false || Number(value) === 0) acc.bad += 1;
    else acc.good += 1;
    return acc;
  }, { total: 0, good: 0, bad: 0 });
}

function buildMoodStats(reports) {
  const counts = reports.reduce((acc, item) => {
    const mood = normalizeText(item.ruhHali || item.mood || item.genelDurum || item.durum);
    if (!mood) return acc;
    acc.total += 1;
    if (mood.includes('huzursuz') || mood.includes('uzgun') || mood.includes('üzgün') || mood.includes('yorgun')) acc.negative += 1;
    acc.counts[mood] = (acc.counts[mood] || 0) + 1;
    return acc;
  }, { total: 0, negative: 0, counts: {} });
  const top = Object.entries(counts.counts).sort((a, b) => b[1] - a[1])[0];
  return { ...counts, topLabel: top ? readableMood(top[0]) : 'Kayıt yok' };
}

function buildChildComment(name, risks) {
  if (!risks.length) return `${name} için bu ay belirgin bir risk görünmüyor.`;
  return `${name} için ${risks.join(', ')} alanlarında takip önerilir.`;
}

function StatCard({ icon, value, label, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressLine({ label, percent: value, color }) {
  const safePercent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.progressBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressPercent}>%{safePercent}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safePercent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function RiskBadge({ riskCount }) {
  const hasRisk = riskCount > 0;
  return <Text style={[styles.badge, hasRisk && styles.badgeRisk]}>{hasRisk ? `${riskCount} risk` : 'Normal'}</Text>;
}

function EmptyBlock({ icon, title, desc }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );
}

function toList(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([id, item]) => ({ id, ...(item && typeof item === 'object' ? item : {}) }));
}

function filterByKres(list = [], kresId) {
  return list.filter((item) => !item.kresId || item.kresId === kresId || item.kurumId === kresId || item.institutionId === kresId);
}

function getRole(item) {
  return normalizeText(item.rol || item.role || item.kullaniciTipi || item.type);
}

function getName(item, fallback) {
  const full = `${item.ad || item.name || ''} ${item.soyad || item.surname || ''}`.trim();
  return full || item.adSoyad || item.fullName || item.kullaniciAdi || item.displayName || fallback;
}

function getChildId(item) {
  return item.cocukId || item.childId || item.ogrenciId || item.studentId;
}

function findClassName(classes, classId) {
  if (!classId) return '';
  const found = classes.find((item) => item.id === classId);
  return found?.ad || found?.sinifAdi || found?.name || '';
}

function getAmount(item) {
  const value = item.tutar ?? item.amount ?? item.ucret ?? item.price ?? 0;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}

function isPaidStatus(value) {
  const text = normalizeText(value);
  return text.includes('odendi') || text.includes('ödendi') || text.includes('paid') || text.includes('tamamlandi');
}

function isAbsentStatus(value) {
  const text = normalizeText(value);
  return text.includes('gelmedi') || text.includes('yok') || text.includes('absent') || text.includes('izin');
}

function isBadValue(value) {
  if (value === false) return true;
  const text = normalizeText(value);
  return text.includes('yemedi') || text.includes('az') || text.includes('kotu') || text.includes('kötü') || text.includes('hayir') || text.includes('hayır') || text.includes('katilmadi') || text.includes('katılmadı') || text.includes('uyumadi') || text.includes('uyumadı');
}

function countAnswers(item) {
  const answers = item.cevaplar || item.answers || item.responses;
  if (!answers || typeof answers !== 'object') return 0;
  return Object.keys(answers).length;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 100);
}

function getDateKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function extractDate(value) {
  return value.tarih || value.date || value.gun || value.createdAt || value.updatedAt || value.zaman;
}

function isSameDay(item, todayKey) {
  const value = extractDate(item);
  if (!value) return false;
  if (typeof value === 'number') return getDateKey(value) === todayKey;
  return String(value).startsWith(todayKey);
}

function isInMonth(item, monthKey) {
  const value = extractDate(item);
  if (!value) return false;
  if (typeof value === 'number') return getMonthKey(value) === monthKey;
  return String(value).startsWith(monthKey);
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function readableMood(value) {
  if (value.includes('mutlu')) return 'Mutlu';
  if (value.includes('huzursuz')) return 'Huzursuz';
  if (value.includes('üzgün') || value.includes('uzgun')) return 'Üzgün';
  if (value.includes('yorgun')) return 'Yorgun';
  if (value.includes('sakin')) return 'Sakin';
  if (value.includes('normal')) return 'Normal';
  return value || 'Kayıt yok';
}

function formatTL(value) {
  const number = Number(value || 0);
  return `${Math.round(number).toLocaleString('tr-TR')} TL`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 44 },
  headerCard: { backgroundColor: THEME.primary, borderRadius: 26, padding: 20, marginBottom: 16 },
  headerEmoji: { fontSize: 34, marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.82)', marginTop: 6, fontWeight: '700', lineHeight: 20 },
  tabRow: { flexDirection: 'row', backgroundColor: THEME.card, borderRadius: 18, padding: 5, marginBottom: 18, borderWidth: 1, borderColor: THEME.border },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14 },
  tabButtonActive: { backgroundColor: THEME.primary },
  tabText: { fontSize: 12, fontWeight: '900', color: THEME.muted },
  tabTextActive: { color: '#fff' },
  loadingBox: { backgroundColor: THEME.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  statCard: { width: '48%', backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  statIcon: { fontSize: 27 },
  statValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  statLabel: { color: THEME.muted, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  cardTitle: { fontSize: 16, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  cardText: { color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 19 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressBlock: { marginTop: 10 },
  progressLabel: { flex: 1, color: THEME.text, fontWeight: '800', fontSize: 13 },
  progressPercent: { color: THEME.muted, fontWeight: '900', marginLeft: 8, fontSize: 12 },
  progressTrack: { height: 9, backgroundColor: '#F1EEF9', borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 10 },
  badge: { backgroundColor: '#E8F9EF', color: THEME.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', overflow: 'hidden' },
  badgeRisk: { backgroundColor: '#FFE8EC', color: THEME.red },
  riskChipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  riskChip: { backgroundColor: '#FFE8EC', color: THEME.red, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', marginRight: 8, marginBottom: 8, overflow: 'hidden' },
  okChip: { backgroundColor: '#E8F9EF', color: THEME.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', overflow: 'hidden' },
  riskRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: THEME.border },
  riskName: { color: THEME.text, fontWeight: '900' },
  riskDesc: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { color: THEME.text, fontSize: 17, fontWeight: '900', marginTop: 10 },
  emptyDesc: { color: THEME.muted, textAlign: 'center', marginTop: 6, fontWeight: '700', lineHeight: 20 },
});
