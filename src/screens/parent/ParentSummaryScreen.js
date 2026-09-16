import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useNodeList, useParentBase, LoadingScreen, EmptyState, toDateKey, useDailyAiComment } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemePatternBackground from '../../components/ThemePatternBackground';
import { useUnreadMessagesCount } from '../../utils/messageHelpers';
import { getWeekKey } from '../../utils/weeklyBadges';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import { getMealText, getMealPhoto } from '../../components/MealTodayCard';
import DailyCommentCard from '../../components/DailyCommentCard';
import { getMonthKey, getMonthLabel } from '../../services/monthlyDocuments';
import { MOOD_LISTESI } from '../../constants';
import { translateMood } from '../../utils/moodLabel';

// Not: öğün isimleri (Kahvaltı/Öğle/Ara Öğün) için ayrı bir sabit tutmuyoruz,
// MealTodayCard.js'de zaten tanımlı olan "parent.mealCard.mealName.<key>"
// çeviri anahtarları burada da (t ile) yeniden kullanılıyor.
// Aynı gün için (republish/çift kayıt gibi nedenlerle) birden fazla aktif
// kayıt varsa: önce içeriği DOLU olanları öne al, aralarında da en son
// güncelleneni seç. Böylece eski/boş bir kayıt yanlışlıkla gösterilmez.
function pickFreshestRecord(list, hasContentFn) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => {
    const aHas = hasContentFn(a) ? 1 : 0;
    const bHas = hasContentFn(b) ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    const aTime = Number(a.updatedAt || a.createdAt || 0);
    const bTime = Number(b.updatedAt || b.createdAt || 0);
    return bTime - aTime;
  });
  return sorted[0];
}

function mealHasContent(item) {
  const menu = item?.ogunler || {};
  return !!(
    getMealText(menu.kahvalti) ||
    getMealText(menu.ogle) ||
    getMealText(menu.araOgun)
  );
}

function scheduleHasContent(item) {
  const list = Array.isArray(item?.etkinlikler) ? item.etkinlikler : [];
  return list.some((entry) => String(entry?.etkinlik || '').trim());
}

// Bugünkü program: "09:30" ya da "09:30 - 10:30" gibi metinlerden başlangıç
// dakikasını çıkarır. Parse edilemezse null döner (canlı durum hesaplanamaz).
function parseTimeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

// Bir dersin/etkinliğin "şu an" a göre durumu: geçti / şu an sürüyor / henüz
// gelmedi. Başlangıç saati okunamıyorsa null döner (nötr gösterim yapılır).
function getLiveStatus(startValue, endValue, nowMinutes) {
  const start = parseTimeToMinutes(startValue);
  if (start === null) return null;
  const end = parseTimeToMinutes(endValue);
  if (nowMinutes < start) return 'upcoming';
  if (end !== null && nowMinutes >= end) return 'done';
  if (end !== null) return 'current';
  return 'done';
}

function getMealStatusLabel(status, t) {
  if (status === 'yemedi') return t('parent.summary.mealStatus.yemedi');
  if (status === 'az_yedi') return t('parent.summary.mealStatus.az_yedi');
  if (status === 'bitirdi') return t('parent.summary.mealStatus.bitirdi');
  return t('parent.summary.mealStatus.waiting');
}

const BALLOONS = [
  { left: '4%', color: '#AEEBFF', delay: 0, duration: 9200, size: 50 },
  { left: '77%', color: '#FFB5DA', delay: 1300, duration: 10600, size: 58 },
  { left: '89%', color: '#CDB8FF', delay: 2600, duration: 9800, size: 46 },
  { left: '15%', color: '#FFE08A', delay: 3800, duration: 11200, size: 42 },
  { left: '66%', color: '#9EF0C2', delay: 5100, duration: 10200, size: 44 },
];

const CONFETTI = [
  { left: '6%', color: '#FF8DB7', delay: 0, duration: 5600 },
  { left: '18%', color: '#FFD166', delay: 500, duration: 6100 },
  { left: '31%', color: '#8FD3FF', delay: 1000, duration: 5900 },
  { left: '43%', color: '#A78BFA', delay: 1500, duration: 6300 },
  { left: '56%', color: '#7EE7C4', delay: 2000, duration: 5700 },
  { left: '68%', color: '#FF9F1C', delay: 2500, duration: 6400 },
  { left: '81%', color: '#FF77AA', delay: 3000, duration: 6000 },
  { left: '92%', color: '#72D6FF', delay: 3500, duration: 6200 },
];

export default function ParentSummaryScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    loading,
    selectedChild,
    childName,
    parentName,
    kresAdi,
    kresId,
    sinifId,
    parentId,
    parentPhotoUrl,
  } = base;

  const reports = useNodeList('gunlukRaporlar', kresId);
  const meals = useNodeList('yemekListeleri', kresId);
  const attendance = useNodeList('yoklamalar', kresId);
  const events = useNodeList('etkinlikler', kresId);
  const announcements = useNodeList('duyurular', kresId);
  const schedules = useNodeList('dersProgramlari', kresId);
  const payments = useNodeList('odemeler', kresId);
  const polls = useNodeList('anketler', kresId);
  const weeklyBadges = useNodeList('haftaninRozetleri', kresId);

  const unreadMessages = useUnreadMessagesCount(parentId);
  const today = toDateKey(new Date());
  const aiComment = useDailyAiComment(selectedChild?.id, today);
  const weekKey = getWeekKey();
  const isBirthday = useMemo(() => isBirthdayToday(selectedChild?.dogumTarihi), [selectedChild?.dogumTarihi, today]);
  const [birthdayPopupVisible, setBirthdayPopupVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkBirthdayPopup = async () => {
      if (!isBirthday || !selectedChild?.id) {
        if (mounted) setBirthdayPopupVisible(false);
        return;
      }
      const key = `birthdayPopupSeen_${selectedChild.id}_${today}`;
      try {
        const seen = await AsyncStorage.getItem(key);
        if (mounted && !seen) setBirthdayPopupVisible(true);
      } catch (error) {
        if (mounted) setBirthdayPopupVisible(true);
      }
    };
    checkBirthdayPopup();
    return () => { mounted = false; };
  }, [isBirthday, selectedChild?.id, today]);

  const closeBirthdayPopup = async () => {
    setBirthdayPopupVisible(false);
    if (!selectedChild?.id) return;
    try {
      await AsyncStorage.setItem(`birthdayPopupSeen_${selectedChild.id}_${today}`, '1');
    } catch (error) {}
  };

  const todayReport = useMemo(() => {
    if (!selectedChild?.id) return null;
    return reports.filter((item) => item.cocukId === selectedChild.id).filter((item) => !item.tarih || item.tarih === today).sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')))[0] || null;
  }, [reports, selectedChild?.id, today]);

  const yesterdayReport = useMemo(() => {
    if (!selectedChild?.id) return null;
    const yesterdayKey = toDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    return reports.filter((item) => item.cocukId === selectedChild.id).filter((item) => item.tarih === yesterdayKey).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0] || null;
  }, [reports, selectedChild?.id, today]);

  const todayAttendance = useMemo(() => {
    if (!selectedChild?.id) return null;
    return attendance.filter((item) => item.cocukId === selectedChild.id).filter((item) => item.tarih === today).sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
  }, [attendance, selectedChild?.id, today]);

  const todayMeal = useMemo(() => {
    const active = meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === sinifId);

    // ParentMealsScreen ile aynı kaynak önceliği: günlük kayıt > sınıfa özel
    // öğretmen aylık kaydı > kurum geneli yönetici aylık kaydı.
    // Ayrıca günlük kayıt sadece dolu olduğu öğünlerde aylık menünün üzerine
    // yazılır; böylece aylık menü özeti kaybolmaz.
    const dailyMeal = pickFreshestRecord(
      active.filter((item) => item.tarih === today && item.kaynak !== 'admin_aylik' && item.kaynak !== 'ogretmen_aylik'),
      mealHasContent
    );
    const teacherMonthlyMeal = pickFreshestRecord(
      active.filter((item) => item.tarih === today && item.kaynak === 'ogretmen_aylik' && item.sinifId === sinifId),
      mealHasContent
    );
    const institutionMonthlyMeal = pickFreshestRecord(
      active.filter((item) => item.tarih === today && item.kaynak === 'admin_aylik'),
      mealHasContent
    );
    const monthlyMeal = teacherMonthlyMeal || institutionMonthlyMeal;

    if (!dailyMeal && !monthlyMeal) return null;

    const dailyOguns = dailyMeal?.ogunler || {};
    const monthlyOguns = monthlyMeal?.ogunler || {};
    const hasMealValue = (value) => !!(getMealText(value) || getMealPhoto(value));

    return {
      ...(monthlyMeal || dailyMeal),
      ...(dailyMeal || {}),
      id: dailyMeal?.id || monthlyMeal?.id || '',
      tarih: today,
      ogunler: {
        kahvalti: hasMealValue(dailyOguns.kahvalti) ? dailyOguns.kahvalti : monthlyOguns.kahvalti,
        ogle: hasMealValue(dailyOguns.ogle) ? dailyOguns.ogle : monthlyOguns.ogle,
        araOgun: hasMealValue(dailyOguns.araOgun) ? dailyOguns.araOgun : monthlyOguns.araOgun,
      },
    };
  }, [meals, kresId, sinifId, today]);

  const todayEvents = useMemo(() => {
    return events.filter((item) => item.aktif !== false).filter((item) => !kresId || !item.kresId || item.kresId === kresId).filter((item) => {
      if (Array.isArray(item.sinifIds)) return item.sinifIds.includes(sinifId);
      if (item.sinifId) return item.sinifId === sinifId;
      return true;
    }).filter((item) => !item.tarih || item.tarih === today).sort((a, b) => String(a.saat || '').localeCompare(String(b.saat || ''))).slice(0, 3);
  }, [events, kresId, sinifId, today]);

  const todaySchedules = useMemo(() => {
    const matches = schedules
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        const itemClassId = item?.sinifId || item?.classId || '';
        return !itemClassId || itemClassId === sinifId;
      })
      .filter((item) => item.tarih === today);

    // Öncelik sırası: öğretmen aylık programı -> admin aylık programı.
    // İki kaynak asla birleştirilmez; öğretmen kaydı varsa yalnızca o gösterilir.
    const teacherMatches = matches.filter((item) => item.kaynak === 'ogretmen_aylik');
    const adminMatches = matches.filter((item) => item.kaynak === 'admin_aylik');
    const best = pickFreshestRecord(teacherMatches, scheduleHasContent) || pickFreshestRecord(adminMatches, scheduleHasContent);

    const entries = Array.isArray(best?.etkinlikler) ? best.etkinlikler : [];
    return entries
      .filter((entry) => String(entry?.etkinlik || '').trim())
      .map((entry, index) => ({
        id: `${best?.id || 'ders'}-${index}`,
        baslik: entry.etkinlik,
        baslangicSaati: entry.baslangicSaati || '',
        bitisSaati: entry.bitisSaati || '',
        saat: entry.baslangicSaati ? `${entry.baslangicSaati}${entry.bitisSaati ? ` - ${entry.bitisSaati}` : ''}` : '',
        kazanimlar: Array.isArray(entry.kazanimlar) ? entry.kazanimlar.filter((k) => String(k || '').trim()) : [],
      }))
      .sort((a, b) => String(a.saat || '').localeCompare(String(b.saat || '')));
  }, [schedules, kresId, sinifId, today]);

  const todayTimeline = useMemo(() => {
    return [...todaySchedules, ...todayEvents].sort((a, b) => {
      const aStart = parseTimeToMinutes(a.baslangicSaati || a.saat);
      const bStart = parseTimeToMinutes(b.baslangicSaati || b.saat);
      if (aStart === null && bStart === null) return 0;
      if (aStart === null) return 1;
      if (bStart === null) return -1;
      return aStart - bStart;
    });
  }, [todaySchedules, todayEvents]);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const livePulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(livePulseAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(livePulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [livePulseAnim]);
  const livePulseScale = livePulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const livePulseOpacity = livePulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const currentMonthKey = useMemo(() => getMonthKey(new Date()), []);
  const currentMonthLabel = useMemo(() => getMonthLabel(new Date()), []);

  const hasMonthlySchedule = useMemo(() => {
    const matches = schedules.filter((item) =>
      item.aktif !== false &&
      item.ayKey === currentMonthKey &&
      (!kresId || item.kresId === kresId) &&
      (item.sinifId || item.classId || '') === sinifId
    );
    const teacher = matches.filter((item) => item.kaynak === 'ogretmen_aylik');
    const admin = matches.filter((item) => item.kaynak === 'admin_aylik');
    return !!(pickFreshestRecord(teacher, scheduleHasContent) || pickFreshestRecord(admin, scheduleHasContent));
  }, [schedules, kresId, sinifId, currentMonthKey]);

  const latestAnnouncement = useMemo(() => {
    return announcements.filter((item) => item.aktif !== false).filter((item) => !kresId || !item.kresId || item.kresId === kresId).filter((item) => !item.sinifId || item.sinifId === sinifId).sort((a, b) => String(b.createdAt || b.tarih || '').localeCompare(String(a.createdAt || a.tarih || '')))[0] || null;
  }, [announcements, kresId, sinifId]);

  const pendingPayment = useMemo(() => {
    if (!selectedChild?.id) return null;
    return payments.find((item) => {
      if (isPaid(item)) return false;
      if (item.cocukId && item.cocukId !== selectedChild.id) return false;
      if (item.veliId && item.veliId !== parentId) return false;
      if (item.kresId && item.kresId !== kresId) return false;
      return true;
    }) || null;
  }, [payments, selectedChild?.id, parentId, kresId]);

  const activePoll = useMemo(() => {
    return polls.find((item) => {
      if (item.aktif === false) return false;
      if (item.kresId && item.kresId !== kresId) return false;
      if (item.cevaplar && parentId && item.cevaplar[parentId]) return false;
      return true;
    }) || null;
  }, [polls, kresId, parentId]);

  const weeklyStar = useMemo(() => {
    if (!selectedChild?.id) return null;
    return weeklyBadges.filter((item) => item.aktif !== false).filter((item) => String(item.cocukId || '') === String(selectedChild.id)).filter((item) => String(item.weekKey || item.haftaKey || '') === weekKey).sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
  }, [weeklyBadges, selectedChild?.id, weekKey]);

  if (loading) return <LoadingScreen text={t('parent.summary.loading')} />;
  if (!selectedChild) {
    return <SafeAreaView style={styles.safeArea}><ThemePatternBackground /><View style={styles.emptyWrap}><EmptyState icon="👧" title={t('parent.summary.noChildTitle')} desc={t('parent.summary.noChildDesc')} /></View></SafeAreaView>;
  }

  const mealsSummary = buildMealSummary(todayReport, todayMeal, t);
  const yesterdayMealsSummary = buildMealSummary(yesterdayReport, null, t);
  const rawMood = todayReport?.mood || todayReport?.ruhHali || todayReport?.durum;
  const mood = rawMood || t('parent.summary.waiting');
  const moodEmoji = getMoodEmoji(mood);
  const moodDisplay = rawMood ? translateMood(rawMood, t) : mood;
  const sleepSure = todayReport?.uyku?.sure;
  const sleepFallback = (typeof todayReport?.uykuDurumu === 'string' && todayReport.uykuDurumu) || (typeof todayReport?.uyku === 'string' && todayReport.uyku) || t('parent.summary.waiting');
  const sleep = (sleepSure !== undefined && sleepSure !== null) ? `${sleepSure} ${t('parent.summary.hours')}` : sleepFallback;
  const attendanceDisplay = getAttendanceDisplay(styles, todayAttendance, t);
  const attendanceLabel = todayAttendance ? (todayAttendance.durum || todayAttendance.status || t('parent.summary.atDaycare')) : t('parent.summary.waiting');
  const note = todayReport?.not || todayReport?.ogretmenNotu || todayReport?.aciklama || t('parent.summary.noTeacherNoteYet');
  const childFirstName = (selectedChild?.ad || selectedChild?.adSoyad || selectedChild?.isim || '').trim().split(' ')[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemePatternBackground />
      {isBirthday ? <BirthdayCelebrationOverlay styles={styles} /> : null}
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}><View style={{ flex: 1 }}><Text style={styles.logo} numberOfLines={1}>{t('parent.summary.title')}</Text><Text style={styles.brandSub}>{kresAdi || 'Yumurcak'} · {formatDate(today)}</Text></View>{isBirthday ? <Text style={styles.birthdayTopBadge}>🎂 {t('parent.summary.birthdayBadge')}</Text> : null}<TouchableOpacity onPress={() => navigation.navigate('ParentProfile')} style={styles.profileButton} activeOpacity={0.82}>{parentPhotoUrl ? <Image source={{ uri: parentPhotoUrl }} style={styles.profileImage} /> : <Text style={styles.profileButtonText}>👤</Text>}</TouchableOpacity></View>
        <View style={[styles.childCard, isBirthday && styles.birthdayChildCard]}><View style={styles.avatar}>{parentPhotoUrl ? <Image source={{ uri: parentPhotoUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>👧</Text>}{isBirthday ? <Text style={styles.partyHat}>🎉</Text> : null}</View><View style={{ flex: 1 }}><Text style={styles.childName}>{childName}</Text><Text style={styles.childSub}>{isBirthday ? t('parent.summary.birthdaySpecialDay', { childName }) : t('parent.summary.greeting', { parentName })}</Text><View style={styles.pillRow}><Text style={[styles.pill, styles.pillGreen]}>✅ {attendanceLabel}</Text><Text style={styles.pill}>{moodEmoji} {moodDisplay}</Text><Text style={[styles.pill, styles.pillOrange]}>🍽️ {getMainMealStatus(mealsSummary, t)}</Text></View></View></View>
        <View style={styles.quickActionRow}><TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('ParentBell')} activeOpacity={0.82}><View style={[styles.quickActionIcon, styles.iconOrange]}><Text style={styles.quickActionIconText}>🔔</Text></View><View style={{ flex: 1 }}><Text style={styles.quickActionTitle}>{t('parent.summary.institutionBell')}</Text><Text style={styles.quickActionDesc}>{t('parent.summary.bellDesc')}</Text></View></TouchableOpacity><TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('ParentMessages')} activeOpacity={0.82}><View style={[styles.quickActionIcon, styles.iconBlue]}><Text style={styles.quickActionIconText}>💬</Text>{unreadMessages > 0 ? <View style={styles.quickActionBadge}><Text style={styles.quickActionBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View> : null}</View><View style={{ flex: 1 }}><Text style={[styles.quickActionTitle, unreadMessages > 0 && styles.quickActionTitleUnread]}>{t('parent.summary.message')}</Text><Text style={styles.quickActionDesc}>{t('parent.summary.writeToTeacher')}</Text></View></TouchableOpacity></View>
        <DailyCommentCard theme={theme} childFirstName={childFirstName} mood={mood} mealsSummary={mealsSummary} yesterdayMealsSummary={yesterdayMealsSummary} sleep={sleep} schedules={todaySchedules} events={todayEvents} note={note} aiComment={aiComment} />
        <View style={styles.miniGrid}><MiniCard styles={styles} icon={moodEmoji} value={moodDisplay} label={t('parent.summary.mood')} /><MiniCard styles={styles} icon={attendanceDisplay.icon} value={attendanceDisplay.value} label={t('parent.summary.attendance')} valueStyle={attendanceDisplay.color} /><MiniCard styles={styles} icon="😴" value={sleep} label={t('parent.summary.sleep')} /><MiniCard styles={styles} icon="🎨" value={`${todayEvents.length}/3`} label={t('parent.summary.activity')} /></View>
        {pendingPayment ? <TouchableOpacity style={[styles.wideCard, styles.paymentAlert]} onPress={() => navigation.navigate('ParentPayments')} activeOpacity={0.82}><View style={[styles.bigIcon, styles.iconOrange]}><Text style={styles.bigIconText}>💳</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t('parent.summary.paymentReminder')}</Text><Text style={styles.cardDesc}>{pendingPayment.baslik || pendingPayment.aciklama || t('parent.summary.pendingPaymentDesc')}</Text><Text style={styles.amountText}>{formatAmount(pendingPayment.tutar || pendingPayment.ucret || pendingPayment.miktar, t)}</Text></View><Text style={styles.arrow}>›</Text></TouchableOpacity> : null}
        {activePoll ? <TouchableOpacity style={[styles.wideCard, styles.pollAlert]} onPress={() => navigation.navigate('ParentPolls')} activeOpacity={0.82}><View style={[styles.bigIcon, styles.iconPurple]}><Text style={styles.bigIconText}>🗳️</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t('parent.summary.pendingPollTitle')}</Text><Text style={styles.cardDesc}>{activePoll.soru || activePoll.baslik || activePoll.title || t('parent.summary.pendingPollDesc')}</Text></View><Text style={styles.arrow}>›</Text></TouchableOpacity> : null}
        <SectionHead styles={styles} title={t('parent.summary.mealSectionTitle')} action={t('parent.summary.mealSectionAction')} onPress={() => navigation.navigate('ParentMeals')} /><View style={styles.card}><View style={styles.cardRowTop}><View style={[styles.bigIcon, styles.iconOrange]}><Text style={styles.bigIconText}>🍽️</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t('parent.summary.todaysMeals')}</Text><Text style={styles.cardDesc}>{t('parent.summary.todaysMealsDesc')}</Text></View></View><View style={styles.mealBox}>{mealsSummary.map((item) => <View key={item.key} style={styles.mealLine}>{item.photo ? <Image source={{ uri: item.photo }} style={styles.mealThumb} resizeMode="cover" /> : null}<Text style={styles.mealName}>{item.label}</Text><Text style={styles.mealMenu} numberOfLines={2}>{item.menu || t('parent.summary.menuNotEntered')}</Text><Text style={[styles.mealStatus, getMealStatusStyle(styles, item.status)]}>{item.statusLabel}</Text></View>)}</View></View>
        <SectionHead styles={styles} title={t('parent.summary.scheduleSectionTitle')} action={t('parent.summary.scheduleSectionAction')} onPress={() => navigation.navigate('ParentEvents')} /><View style={styles.card}><View style={styles.cardRowTop}><View style={[styles.bigIcon, styles.iconBlue]}><Text style={styles.bigIconText}>📚</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t('parent.summary.todaysProgram')}</Text><Text style={styles.cardDesc}>{t('parent.summary.todaysProgramDesc')}</Text></View></View><View style={styles.timelineWrap}>{todayTimeline.map((item, index) => { const isLast = index === todayTimeline.length - 1; const status = getLiveStatus(item.baslangicSaati || item.saat, item.bitisSaati, nowMinutes); const statusColor = status === 'done' ? theme.green : status === 'current' ? theme.blue : status === 'upcoming' ? theme.orange : theme.border; return <View key={`${item.id || index}`} style={styles.timelineItem}><View style={styles.timelineRail}>{status === 'current' ? <Animated.View pointerEvents="none" style={[styles.livePulseRing, { borderColor: theme.blue, opacity: livePulseOpacity, transform: [{ scale: livePulseScale }] }]} /> : null}<View style={[styles.timelineDot, { backgroundColor: status === 'upcoming' || status === null ? theme.card : statusColor, borderColor: statusColor }]} />{!isLast ? <View style={[styles.timelineLine, { backgroundColor: statusColor }]} /> : null}</View><View style={[styles.lessonLine, styles.timelineCard, status === 'current' ? { borderColor: theme.blue, borderWidth: 1.5 } : null]}><View style={styles.lessonHeadRow}><Text style={[styles.lessonTime, status === 'done' && { color: theme.green }, status === 'current' && { color: theme.blue, fontWeight: '900' }, status === 'upcoming' && { color: theme.orange }]}>{item.saat || item.baslangicSaati || ''}</Text>{status === 'current' ? <Text style={[styles.liveBadge, { color: theme.blue, backgroundColor: theme.blueSoft || theme.primarySoft }]}>📍 {t('parent.summary.scheduleCurrent')}</Text> : status === 'done' ? <Text style={[styles.doneBadge, { color: theme.green }]}>✓ {t('parent.summary.scheduleDone')}</Text> : null}</View><Text style={styles.lessonMain} numberOfLines={2}>{getProgramTitle(item, t)}</Text>{Array.isArray(item.kazanimlar) && item.kazanimlar.length > 0 ? <View style={styles.lessonKazanimWrap}>{item.kazanimlar.map((kazanim, kIndex) => <Text key={`${item.id || index}-k-${kIndex}`} style={styles.lessonKazanimChip} numberOfLines={1}>🎯 {kazanim}</Text>)}</View> : null}</View></View>; })}{todayTimeline.length === 0 ? <Text style={styles.emptyInline}>{t('parent.summary.noProgramToday')}</Text> : null}</View>{hasMonthlySchedule ? <View style={{ marginTop: 12 }}><MonthlyDocumentPdfBar kresId={kresId} nodePath="dersProgramlari" kaynak="admin_aylik" docType="ders" monthKey={currentMonthKey} monthLabel={currentMonthLabel} sinifId={sinifId} theme={theme} /></View> : null}</View>
        <SectionHead styles={styles} title={t('parent.summary.otherSummariesTitle')} action={t('parent.summary.otherSummariesAction')} onPress={() => navigation.navigate('ParentReports')} /><View style={styles.twoGrid}><TouchableOpacity style={styles.smallCard} onPress={() => navigation.navigate('ParentReports')} activeOpacity={0.82}><Text style={styles.smallIcon}>📋</Text><Text style={styles.smallTitle}>{t('parent.summary.dailyReport')}</Text><Text style={styles.smallDesc} numberOfLines={3}>{note}</Text></TouchableOpacity><TouchableOpacity style={[styles.smallCard, styles.noticeCard]} onPress={() => navigation.navigate('ParentAnnouncements')} activeOpacity={0.82}><Text style={styles.smallIcon}>📢</Text><Text style={styles.smallTitle}>{t('parent.summary.announcement')}</Text><Text style={styles.smallDesc} numberOfLines={3}>{latestAnnouncement?.baslik || latestAnnouncement?.title || latestAnnouncement?.icerik || t('parent.summary.noNewAnnouncement')}</Text></TouchableOpacity></View>
        <TouchableOpacity style={styles.wideCard} onPress={() => navigation.navigate('ParentMessages')} activeOpacity={0.82}><View style={[styles.bigIcon, styles.iconPink]}><Text style={styles.bigIconText}>💬</Text>{unreadMessages > 0 ? <View style={styles.wideCardBadge}><Text style={styles.wideCardBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View> : null}</View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, unreadMessages > 0 && styles.cardTitleUnread]}>{t('parent.summary.messages')}</Text><Text style={styles.cardDesc}>{t('parent.summary.messagesDesc')}</Text></View><Text style={styles.arrow}>›</Text></TouchableOpacity>
        <TouchableOpacity style={styles.wideCard} onPress={() => navigation.navigate('ParentDevelopment')} activeOpacity={0.82}><View style={[styles.bigIcon, styles.iconGreen]}><Text style={styles.bigIconText}>📈</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t('parent.summary.monthlyDevelopmentReport')}</Text><Text style={styles.cardDesc}>{t('parent.summary.monthlyDevelopmentReportDesc')}</Text></View><Text style={styles.arrow}>›</Text></TouchableOpacity>
        {weeklyStar ? <WeeklyStarCard styles={styles} item={weeklyStar} /> : null}
      </ScrollView>
      <BirthdayPopup visible={isBirthday && birthdayPopupVisible} childName={childName} onClose={closeBirthdayPopup} styles={styles} />
    </SafeAreaView>
  );
}

function WeeklyStarCard({ styles, item }) {
  const { t } = useTranslation();
  return <View style={styles.weeklyStarCard}><View style={styles.weeklyStarHead}><Text style={styles.weeklyStarTitle}>🌟 {t('parent.summary.weeklyStarTitle')}</Text><Text style={styles.weeklyStarTag}>{t('parent.summary.thisWeek')}</Text></View><View style={styles.weeklyStarBody}><View style={styles.weeklyStarIconBox}><Text style={styles.weeklyStarIcon}>{item.badgeEmoji || item.rozetEmoji || '🌟'}</Text></View><View style={{ flex: 1 }}><Text style={styles.weeklyStarBadge}>{item.badgeTitle || item.rozetAdi || t('parent.summary.badge')}</Text><Text style={styles.weeklyStarDesc}>{item.note || item.not || item.badgeDesc || item.rozetAciklama || t('parent.summary.weeklyStarDefaultDesc')}</Text><Text style={styles.weeklyStarWeek}>{item.haftaLabel || `${item.haftaBaslangic || ''} - ${item.haftaBitis || ''}`}</Text></View></View></View>;
}

function BirthdayCelebrationOverlay({ styles }) {
  const balloonValues = useRef(BALLOONS.map(() => new Animated.Value(0))).current;
  const confettiValues = useRef(CONFETTI.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const animations = [
      ...balloonValues.map((value, index) => Animated.loop(Animated.timing(value, { toValue: 1, duration: BALLOONS[index].duration, delay: BALLOONS[index].delay, easing: Easing.linear, useNativeDriver: true }))),
      ...confettiValues.map((value, index) => Animated.loop(Animated.timing(value, { toValue: 1, duration: CONFETTI[index].duration, delay: CONFETTI[index].delay, easing: Easing.linear, useNativeDriver: true }))),
    ];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [balloonValues, confettiValues]);
  return <View pointerEvents="none" style={styles.celebrationOverlay}>{CONFETTI.map((item, index) => { const translateY = confettiValues[index].interpolate({ inputRange: [0, 1], outputRange: [-40, 720] }); const rotate = confettiValues[index].interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }); const opacity = confettiValues[index].interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }); return <Animated.View key={`confetti-${index}`} style={[styles.confetti, { left: item.left, backgroundColor: item.color, opacity, transform: [{ translateY }, { rotate }] }]} />; })}{BALLOONS.map((item, index) => { const translateY = balloonValues[index].interpolate({ inputRange: [0, 1], outputRange: [760, -130] }); const translateX = balloonValues[index].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, index % 2 === 0 ? 18 : -16, 0] }); const opacity = balloonValues[index].interpolate({ inputRange: [0, 0.08, 0.88, 1], outputRange: [0, 0.78, 0.78, 0] }); return <Animated.View key={`balloon-${index}`} style={[styles.balloonWrap, { left: item.left, opacity, transform: [{ translateY }, { translateX }] }]}><View style={[styles.balloon, { width: item.size, height: item.size * 1.22, borderRadius: item.size / 2, backgroundColor: item.color }]} /><View style={styles.balloonString} /></Animated.View>; })}</View>;
}

function BirthdayPopup({ visible, childName, onClose, styles }) {
  const { t } = useTranslation();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.popupBackdrop}><View style={styles.popupCard}><TouchableOpacity style={styles.popupClose} onPress={onClose} activeOpacity={0.8}><Text style={styles.popupCloseText}>×</Text></TouchableOpacity><Text style={styles.popupCake}>🧁</Text><Text style={styles.popupTitle}>🎉 {t('parent.summary.happyBirthdayTitle')}</Text><Text style={styles.popupText}>{t('parent.summary.birthdayPopupText', { childName })}</Text><Text style={styles.popupSub}>{t('parent.summary.birthdayPopupSub')}</Text><TouchableOpacity style={styles.popupButton} onPress={onClose} activeOpacity={0.86}><Text style={styles.popupButtonText}>{t('common.ok')}</Text></TouchableOpacity></View></View></Modal>;
}

function MiniCard({ styles, icon, value, label, valueStyle }) { return <View style={styles.miniCard}><Text style={styles.miniIcon}>{icon}</Text><Text style={[styles.miniValue, valueStyle]} numberOfLines={1}>{value || '-'}</Text><Text style={styles.miniLabel}>{label}</Text></View>; }
function SectionHead({ styles, title, action, onPress }) { return <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text><TouchableOpacity onPress={onPress} activeOpacity={0.8}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity></View>; }

function parseBirthDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const tr = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
function isBirthdayToday(value) { const birth = parseBirthDate(value); if (!birth) return false; const todayDate = new Date(); return birth.getDate() === todayDate.getDate() && birth.getMonth() === todayDate.getMonth(); }

function buildMealSummary(report, mealList, t) { const reportMeal = report?.yemek || {}; const menu = mealList?.ogunler || {}; return ['kahvalti', 'ogle', 'araOgun'].map((key) => { const rawStatus = reportMeal?.[key]?.durum || (reportMeal?.[key] === true ? 'bitirdi' : '') || ''; return { key, label: t(`parent.mealCard.mealName.${key}`), menu: getMealText(menu?.[key]), photo: getMealPhoto(menu?.[key]), status: rawStatus, statusLabel: getMealStatusLabel(rawStatus, t) }; }); }
function getMainMealStatus(items, t) { if (items.some((item) => item.status === 'yemedi')) return t('parent.summary.mealStatus.yemedi'); if (items.some((item) => item.status === 'az_yedi')) return t('parent.summary.mealStatus.az_yedi'); if (items.some((item) => item.status === 'bitirdi')) return t('parent.summary.mealStatus.bitirdi'); return t('parent.summary.mealStatus.waiting'); }
function getMoodEmoji(moodLabel) { const found = MOOD_LISTESI.find((item) => item.label === moodLabel); return found ? found.emoji : '🙂'; }
function getAttendanceDisplay(styles, attendance, t) { const durum = attendance?.durum || attendance?.status || ''; if (durum === 'geldi' || durum === 'gec') return { icon: '✅', value: durum === 'gec' ? t('parent.summary.arrivedLate') : t('parent.summary.arrived'), color: styles.attendanceGreen }; if (durum === 'gelmedi') return { icon: '❌', value: t('parent.summary.didNotArrive'), color: styles.attendanceRed }; return { icon: '⏳', value: t('parent.summary.waiting'), color: null }; }
function getMealStatusStyle(styles, status) { if (status === 'bitirdi') return styles.mealAte; if (status === 'az_yedi') return styles.mealLittle; if (status === 'yemedi') return styles.mealNo; return styles.mealWaiting; }
function getProgramTitle(item, t) { return item.baslik || item.dersAdi || item.etkinlikAdi || item.ad || t('parent.summary.program'); }
function getDayKey(date) { const keys = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi']; return keys[date.getDay()] || 'pazartesi'; }
function normalizeDay(value) { const text = String(value || '').toLowerCase(); return text.replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u').replace('ş', 's').replace('ö', 'o').replace('ç', 'c'); }
function formatDate(value) { const parts = String(value || '').split('-'); if (parts.length !== 3) return value; return `${parts[2]}.${parts[1]}.${parts[0]}`; }
function isPaid(item) { const durum = String(item?.durum || item?.status || '').toLowerCase(); return item?.odendi === true || item?.paid === true || durum === 'odendi' || durum === 'ödendi' || durum === 'paid'; }
function formatAmount(value, t) { if (value === undefined || value === null || value === '') return t('parent.summary.amountNotSpecified'); const num = Number(value); if (Number.isNaN(num)) return String(value); return `${num.toLocaleString('tr-TR')} TL`; }

const createStyles = (theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  screen: { flex: 1, backgroundColor: 'transparent' }, content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }, emptyWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }, logo: { color: theme.primary, fontSize: 23, fontWeight: '900' }, brandSub: { color: theme.muted, fontSize: 12, fontWeight: '800', marginTop: 2 }, birthdayTopBadge: { color: '#9C3DD8', backgroundColor: '#FFF0FF', borderWidth: 1, borderColor: '#E9B8FF', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11, flexShrink: 0 }, profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }, profileButtonText: { fontSize: 20 }, profileImage: { width: 44, height: 44, borderRadius: 22 },
  childCard: { backgroundColor: theme.card, borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 12 }, birthdayChildCard: { borderColor: '#E9B8FF', backgroundColor: 'rgba(255,255,255,0.93)' }, avatar: { width: 66, height: 66, borderRadius: 22, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, avatarImage: { width: 66, height: 66, borderRadius: 22 }, avatarText: { fontSize: 34 }, partyHat: { position: 'absolute', top: -13, left: -8, fontSize: 22 }, childName: { color: theme.text, fontSize: 18, fontWeight: '900' }, childSub: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 3 }, pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }, pill: { color: theme.primary, backgroundColor: theme.primarySoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, fontSize: 10.5, fontWeight: '900', overflow: 'hidden' }, pillGreen: { color: theme.green, backgroundColor: '#E9FBEF' }, pillOrange: { color: theme.orange, backgroundColor: '#FFF3DF' },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, quickActionCard: { width: '48.7%', backgroundColor: theme.card, borderRadius: 19, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: theme.border }, quickActionIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' }, quickActionIconText: { fontSize: 20 }, quickActionBadge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: theme.card }, quickActionBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 9 }, quickActionTitle: { color: theme.text, fontSize: 13, fontWeight: '900' }, quickActionTitleUnread: { color: theme.primary }, quickActionDesc: { color: theme.muted, fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  miniGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, miniCard: { width: '23.5%', backgroundColor: theme.card, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: theme.border }, miniIcon: { fontSize: 20, marginBottom: 4 }, miniValue: { color: theme.text, fontSize: 12, fontWeight: '900', maxWidth: '100%' }, miniLabel: { color: theme.muted, fontSize: 9.5, fontWeight: '800', marginTop: 3, textAlign: 'center' }, attendanceGreen: { color: '#20B45B' }, attendanceRed: { color: '#FF4D6D' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, marginBottom: 9 }, sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900' }, sectionAction: { color: theme.primary, fontSize: 11.5, fontWeight: '900' }, card: { backgroundColor: theme.card, borderRadius: 21, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border }, cardRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, bigIcon: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' }, bigIconText: { fontSize: 22 }, wideCardBadge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: theme.card }, wideCardBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 10 }, iconOrange: { backgroundColor: '#FFF3DF' }, iconBlue: { backgroundColor: '#EAF0FF' }, iconPink: { backgroundColor: '#FFE9F8' }, iconGreen: { backgroundColor: '#E9FBEF' }, iconPurple: { backgroundColor: '#F3F0FF' }, paymentAlert: { borderLeftWidth: 5, borderLeftColor: theme.orange, backgroundColor: '#FFFAF0' }, pollAlert: { borderLeftWidth: 5, borderLeftColor: theme.primary, backgroundColor: '#FBF8FF' }, amountText: { color: theme.orange, fontSize: 13, fontWeight: '900', marginTop: 6 }, cardTitle: { color: theme.text, fontSize: 14.5, fontWeight: '900' }, cardTitleUnread: { color: theme.primary }, cardDesc: { color: theme.muted, fontSize: 11.8, fontWeight: '700', lineHeight: 16, marginTop: 4 },
  mealBox: { marginTop: 10, gap: 8 }, mealLine: { backgroundColor: theme.bg, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border }, mealThumb: { width: 34, height: 34, borderRadius: 9, backgroundColor: theme.card }, mealName: { width: 66, color: theme.primary, fontSize: 11.3, fontWeight: '900' }, mealMenu: { flex: 1, color: theme.text, fontSize: 11.5, fontWeight: '700', lineHeight: 15 }, mealStatus: { fontSize: 10.3, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 99, overflow: 'hidden' }, mealAte: { color: theme.green, backgroundColor: '#E9FBEF' }, mealLittle: { color: theme.orange, backgroundColor: '#FFF3DF' }, mealNo: { color: theme.red, backgroundColor: '#FFE8EE' }, mealWaiting: { color: theme.muted, backgroundColor: theme.primarySoft }, scheduleList: { marginTop: 10, gap: 8 }, lessonLine: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 10 }, lessonHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, lessonMain: { flex: 1, color: theme.text, fontSize: 12, fontWeight: '900', marginTop: 4 }, lessonTime: { color: theme.muted, fontSize: 10.5, fontWeight: '800' }, lessonKazanimWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }, lessonKazanimChip: { color: theme.primary, backgroundColor: theme.primarySoft, fontSize: 9.7, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden', maxWidth: '100%' },
  timelineWrap: { marginTop: 10 }, timelineItem: { flexDirection: 'row', alignItems: 'stretch' }, timelineRail: { width: 22, alignItems: 'center', position: 'relative' }, timelineDot: { width: 13, height: 13, borderRadius: 7, marginTop: 5, borderWidth: 2.5, zIndex: 2 }, timelineLine: { width: 2, flex: 1, marginTop: 2, marginBottom: -8, opacity: 0.45, borderRadius: 1 }, livePulseRing: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2 }, timelineCard: { flex: 1, marginLeft: 9, marginBottom: 10 }, liveBadge: { fontSize: 9.7, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden' }, doneBadge: { fontSize: 9.7, fontWeight: '900' }, emptyInline: { color: theme.muted, fontWeight: '700', fontSize: 12, paddingVertical: 8 }, twoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }, smallCard: { width: '48.7%', minHeight: 112, backgroundColor: theme.card, borderRadius: 19, padding: 13, borderWidth: 1, borderColor: theme.border }, noticeCard: { backgroundColor: '#FFFAF0', borderColor: '#FFE5B3' }, smallIcon: { fontSize: 24, marginBottom: 7 }, smallTitle: { color: theme.text, fontSize: 13, fontWeight: '900' }, smallDesc: { color: theme.muted, fontSize: 11.2, fontWeight: '700', lineHeight: 15, marginTop: 4 }, wideCard: { backgroundColor: theme.card, borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12 }, arrow: { color: theme.primary, fontSize: 24, fontWeight: '900' }, weeklyStarCard: { backgroundColor: '#FFF7E8', borderRadius: 24, padding: 16, marginTop: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FFE0A3' }, weeklyStarHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, weeklyStarTitle: { flex: 1, color: '#B46A00', fontWeight: '900', fontSize: 17 }, weeklyStarTag: { color: '#B46A00', backgroundColor: '#FFE8B8', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontWeight: '900', fontSize: 11 }, weeklyStarBody: { flexDirection: 'row', alignItems: 'center' }, weeklyStarIconBox: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#FFE0A3' }, weeklyStarIcon: { fontSize: 34 }, weeklyStarBadge: { color: theme.text, fontWeight: '900', fontSize: 17 }, weeklyStarDesc: { color: theme.muted, fontWeight: '700', lineHeight: 18, marginTop: 5 }, weeklyStarWeek: { color: '#B46A00', fontWeight: '900', fontSize: 12, marginTop: 7 }, celebrationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 2, overflow: 'hidden' }, balloonWrap: { position: 'absolute', bottom: 0, alignItems: 'center' }, balloon: { opacity: 0.86, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' }, balloonString: { width: 1, height: 64, backgroundColor: 'rgba(120,120,150,0.35)' }, confetti: { position: 'absolute', top: 0, width: 9, height: 14, borderRadius: 3 }, popupBackdrop: { flex: 1, backgroundColor: 'rgba(20,20,35,0.18)', alignItems: 'center', justifyContent: 'center', padding: 24 }, popupCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFF7FF', borderRadius: 30, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#E9B8FF', shadowColor: '#6C3DEB', shadowOpacity: 0.2, shadowRadius: 18, elevation: 8 }, popupClose: { position: 'absolute', right: 14, top: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(108,61,235,0.12)', alignItems: 'center', justifyContent: 'center' }, popupCloseText: { color: '#7B61B9', fontSize: 24, fontWeight: '900', marginTop: -2 }, popupCake: { fontSize: 56, marginBottom: 8 }, popupTitle: { color: '#6C3DEB', fontSize: 21, fontWeight: '900', textAlign: 'center' }, popupText: { color: theme.text, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 10 }, popupSub: { color: theme.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 6 }, popupButton: { marginTop: 18, backgroundColor: '#8B5CF6', borderRadius: 18, paddingHorizontal: 40, paddingVertical: 13 }, popupButtonText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
});
