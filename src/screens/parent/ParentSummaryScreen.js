import React, { useMemo } from 'react';
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
} from 'react-native';
import { useNodeList, useParentBase, LoadingScreen, EmptyState, toDateKey } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemePatternBackground from '../../components/ThemePatternBackground';

const MEAL_LABELS = {
  kahvalti: 'Kahvaltı',
  ogle: 'Öğle',
  araOgun: 'Ara Öğün',
};

const MEAL_STATUS_LABELS = {
  yemedi: 'Yemedi',
  az_yedi: 'Az yedi',
  bitirdi: 'Yedi',
};

export default function ParentSummaryScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const reports = useNodeList('gunlukRaporlar');
  const meals = useNodeList('yemekListeleri');
  const attendance = useNodeList('yoklamalar');
  const events = useNodeList('etkinlikler');
  const announcements = useNodeList('duyurular');
  const schedules = useNodeList('dersProgramlari');
  const payments = useNodeList('odemeler');
  const polls = useNodeList('anketler');

  const {
    loading,
    selectedChild,
    childName,
    parentName,
    kresAdi,
    kresId,
    sinifId,
    kullanici,
    parentId,
  } = base;

  const today = toDateKey(new Date());

  const todayReport = useMemo(() => {
    if (!selectedChild?.id) return null;
    return reports
      .filter((item) => item.cocukId === selectedChild.id)
      .filter((item) => !item.tarih || item.tarih === today)
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')))[0] || null;
  }, [reports, selectedChild?.id, today]);

  const todayAttendance = useMemo(() => {
    if (!selectedChild?.id) return null;
    return attendance
      .filter((item) => item.cocukId === selectedChild.id)
      .filter((item) => item.tarih === today)
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
  }, [attendance, selectedChild?.id, today]);

  const todayMeal = useMemo(() => {
    const active = meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === sinifId)
      .filter((item) => item.tarih === today);
    return active.find((item) => item.sinifId === sinifId) || active[0] || null;
  }, [meals, kresId, sinifId, today]);

  const todayEvents = useMemo(() => {
    return events
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        if (Array.isArray(item.sinifIds)) return item.sinifIds.includes(sinifId);
        if (item.sinifId) return item.sinifId === sinifId;
        return true;
      })
      .filter((item) => !item.tarih || item.tarih === today)
      .sort((a, b) => String(a.saat || '').localeCompare(String(b.saat || '')))
      .slice(0, 3);
  }, [events, kresId, sinifId, today]);

  const todaySchedules = useMemo(() => {
    const dayKey = getDayKey(new Date());
    return schedules
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === sinifId)
      .filter((item) => !item.gun || normalizeDay(item.gun) === dayKey)
      .sort((a, b) => String(a.saat || a.baslangicSaati || '').localeCompare(String(b.saat || b.baslangicSaati || '')))
      .slice(0, 3);
  }, [schedules, kresId, sinifId]);

  const latestAnnouncement = useMemo(() => {
    return announcements
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === sinifId)
      .sort((a, b) => String(b.createdAt || b.tarih || '').localeCompare(String(a.createdAt || a.tarih || '')))[0] || null;
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

  if (loading) return <LoadingScreen text="Özet hazırlanıyor..." />;

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemePatternBackground />
        <View style={styles.emptyWrap}>
          <EmptyState icon="👧" title="Sisteme kayıtlı çocuk bulunmuyor" desc="Yönetici panelinden çocuğa bu veli bağlanmalı." />
        </View>
      </SafeAreaView>
    );
  }

  const mealsSummary = buildMealSummary(todayReport, todayMeal);
  const mood = todayReport?.mood || todayReport?.ruhHali || todayReport?.durum || 'Bekleniyor';
  const sleep = todayReport?.uyku?.sure ? `${todayReport.uyku.sure} saat` : (todayReport?.uykuDurumu || todayReport?.uyku || 'Bekleniyor');
  const entryTime = todayAttendance?.girisSaati || todayAttendance?.saat || todayAttendance?.createdTime || 'Bekleniyor';
  const attendanceLabel = todayAttendance ? (todayAttendance.durum || todayAttendance.status || 'Kreşte') : 'Bekleniyor';
  const note = todayReport?.not || todayReport?.ogretmenNotu || todayReport?.aciklama || 'Bugün için öğretmen notu henüz girilmedi.';
  const dailyComment = buildDailyComment(mood, mealsSummary, todayEvents, note);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemePatternBackground />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo} numberOfLines={1}>Bugünün Özeti</Text>
            <Text style={styles.brandSub}>{kresAdi || 'Yumurcak'} · {formatDate(today)}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ParentProfile')} style={styles.profileButton} activeOpacity={0.82}>
            {kullanici?.profilFotoUrl ? (
              <Image source={{ uri: kullanici.profilFotoUrl }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileButtonText}>👤</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.childCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>👧</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>{childName}</Text>
            <Text style={styles.childSub}>Merhaba {parentName}, bugün olanları tek ekranda topladık.</Text>
            <View style={styles.pillRow}>
              <Text style={[styles.pill, styles.pillGreen]}>✅ {attendanceLabel}</Text>
              <Text style={styles.pill}>😊 {mood}</Text>
              <Text style={[styles.pill, styles.pillOrange]}>🍽️ {getMainMealStatus(mealsSummary)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('ParentBell')} activeOpacity={0.82}>
            <View style={[styles.quickActionIcon, styles.iconOrange]}><Text style={styles.quickActionIconText}>🔔</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Kurum Zili</Text>
              <Text style={styles.quickActionDesc}>Geliyorum / Kapıdayım</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('ParentMessages')} activeOpacity={0.82}>
            <View style={[styles.quickActionIcon, styles.iconBlue]}><Text style={styles.quickActionIconText}>💬</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Mesaj</Text>
              <Text style={styles.quickActionDesc}>Öğretmene yaz</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.commentCard}>
          <View style={styles.commentHead}>
            <Text style={styles.commentTitle}>✨ Günlük kısa yorum</Text>
            <Text style={styles.todayTag}>Bugün</Text>
          </View>
          <Text style={styles.commentText}>{dailyComment}</Text>
        </View>

        <View style={styles.miniGrid}>
          <MiniCard styles={styles} icon="😊" value={mood} label="Ruh hali" />
          <MiniCard styles={styles} icon="✅" value={entryTime} label="Giriş saati" />
          <MiniCard styles={styles} icon="😴" value={sleep} label="Uyku" />
          <MiniCard styles={styles} icon="🎨" value={`${todayEvents.length}/3`} label="Etkinlik" />
        </View>

        {pendingPayment ? (
          <TouchableOpacity style={[styles.wideCard, styles.paymentAlert]} onPress={() => navigation.navigate('ParentPayments')} activeOpacity={0.82}>
            <View style={[styles.bigIcon, styles.iconOrange]}><Text style={styles.bigIconText}>💳</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Ödeme hatırlatması</Text>
              <Text style={styles.cardDesc}>{pendingPayment.baslik || pendingPayment.aciklama || 'Bekleyen ödeme kaydı var.'}</Text>
              <Text style={styles.amountText}>{formatAmount(pendingPayment.tutar || pendingPayment.ucret || pendingPayment.miktar)}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        {activePoll ? (
          <TouchableOpacity style={[styles.wideCard, styles.pollAlert]} onPress={() => navigation.navigate('ParentPolls')} activeOpacity={0.82}>
            <View style={[styles.bigIcon, styles.iconPurple]}><Text style={styles.bigIconText}>🗳️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Cevap bekleyen anket</Text>
              <Text style={styles.cardDesc}>{activePoll.soru || activePoll.baslik || activePoll.title || 'Kurumun yeni anketi var.'}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <SectionHead styles={styles} title="Yemek ve Menü" action="Yemek listesi" onPress={() => navigation.navigate('ParentMeals')} />
        <View style={styles.card}>
          <View style={styles.cardRowTop}>
            <View style={[styles.bigIcon, styles.iconOrange]}><Text style={styles.bigIconText}>🍽️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Bugünkü öğünler</Text>
              <Text style={styles.cardDesc}>Menü ve öğretmen bildirimi birlikte gösterilir.</Text>
            </View>
          </View>
          <View style={styles.mealBox}>
            {mealsSummary.map((item) => (
              <View key={item.key} style={styles.mealLine}>
                <Text style={styles.mealName}>{item.label}</Text>
                <Text style={styles.mealMenu} numberOfLines={2}>{item.menu || 'Menü girilmedi'}</Text>
                <Text style={[styles.mealStatus, getMealStatusStyle(styles, item.status)]}>{item.statusLabel}</Text>
              </View>
            ))}
          </View>
        </View>

        <SectionHead styles={styles} title="Ders ve Etkinlikler" action="Program" onPress={() => navigation.navigate('ParentEvents')} />
        <View style={styles.card}>
          <View style={styles.cardRowTop}>
            <View style={[styles.bigIcon, styles.iconBlue]}><Text style={styles.bigIconText}>📚</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Bugünkü program</Text>
              <Text style={styles.cardDesc}>Ders programı ve etkinlik kayıtlarından çekilir.</Text>
            </View>
          </View>
          <View style={styles.scheduleList}>
            {[...todaySchedules, ...todayEvents].slice(0, 4).map((item, index) => (
              <View key={`${item.id || index}`} style={styles.lessonLine}>
                <Text style={styles.lessonMain} numberOfLines={1}>{getProgramTitle(item)}</Text>
                <Text style={styles.lessonTime}>{item.saat || item.baslangicSaati || ''}</Text>
              </View>
            ))}
            {todaySchedules.length === 0 && todayEvents.length === 0 ? (
              <Text style={styles.emptyInline}>Bugün için program veya etkinlik girilmedi.</Text>
            ) : null}
          </View>
        </View>

        <SectionHead styles={styles} title="Diğer Özetler" action="Tümünü gör" onPress={() => navigation.navigate('ParentReports')} />
        <View style={styles.twoGrid}>
          <TouchableOpacity style={styles.smallCard} onPress={() => navigation.navigate('ParentReports')} activeOpacity={0.82}>
            <Text style={styles.smallIcon}>📋</Text>
            <Text style={styles.smallTitle}>Günlük rapor</Text>
            <Text style={styles.smallDesc} numberOfLines={3}>{note}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallCard, styles.noticeCard]} onPress={() => navigation.navigate('ParentAnnouncements')} activeOpacity={0.82}>
            <Text style={styles.smallIcon}>📢</Text>
            <Text style={styles.smallTitle}>Duyuru</Text>
            <Text style={styles.smallDesc} numberOfLines={3}>{latestAnnouncement?.baslik || latestAnnouncement?.title || latestAnnouncement?.icerik || 'Yeni duyuru yok.'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.wideCard} onPress={() => navigation.navigate('ParentMessages')} activeOpacity={0.82}>
          <View style={[styles.bigIcon, styles.iconPink]}><Text style={styles.bigIconText}>💬</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Mesajlar</Text>
            <Text style={styles.cardDesc}>Öğretmen ve kurum mesajlarını buradan takip edebilirsin.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wideCard} onPress={() => navigation.navigate('ParentDevelopment')} activeOpacity={0.82}>
          <View style={[styles.bigIcon, styles.iconGreen]}><Text style={styles.bigIconText}>📈</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Aylık gelişim raporu</Text>
            <Text style={styles.cardDesc}>AI yorumlu aylık gelişim ve istatistikleri incele.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniCard({ styles, icon, value, label }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniIcon}>{icon}</Text>
      <Text style={styles.miniValue} numberOfLines={1}>{value || '-'}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function SectionHead({ styles, title, action, onPress }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function buildMealSummary(report, mealList) {
  const reportMeal = report?.yemek || {};
  const menu = mealList?.ogunler || {};

  return ['kahvalti', 'ogle', 'araOgun'].map((key) => {
    const rawStatus = reportMeal?.[key]?.durum || (reportMeal?.[key] === true ? 'bitirdi' : '') || '';
    return {
      key,
      label: MEAL_LABELS[key],
      menu: menu?.[key] || '',
      status: rawStatus,
      statusLabel: MEAL_STATUS_LABELS[rawStatus] || rawStatus || 'Bekleniyor',
    };
  });
}

function getMainMealStatus(items) {
  if (items.some((item) => item.status === 'yemedi')) return 'Yemedi';
  if (items.some((item) => item.status === 'az_yedi')) return 'Az yedi';
  if (items.some((item) => item.status === 'bitirdi')) return 'Yedi';
  return 'Bekleniyor';
}

function getMealStatusStyle(styles, status) {
  if (status === 'bitirdi') return styles.mealAte;
  if (status === 'az_yedi') return styles.mealLittle;
  if (status === 'yemedi') return styles.mealNo;
  return styles.mealWaiting;
}

function buildDailyComment(mood, mealsSummary, events, note) {
  const mealText = getMainMealStatus(mealsSummary).toLowerCase();
  const eventText = events.length > 0 ? `${events.length} etkinlik/program kaydı var` : 'program bilgisi henüz girilmemiş';
  const noteText = note && note !== 'Bugün için öğretmen notu henüz girilmedi.' ? ` Öğretmen notu: ${note}` : '';
  return `Bugün genel durum ${mood}. Yemek durumu ${mealText}. Bugün için ${eventText}.${noteText}`;
}

function getProgramTitle(item) {
  return item.baslik || item.dersAdi || item.etkinlikAdi || item.ad || 'Program';
}

function getDayKey(date) {
  const keys = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
  return keys[date.getDay()] || 'pazartesi';
}

function normalizeDay(value) {
  const text = String(value || '').toLowerCase();
  return text
    .replace('ı', 'i')
    .replace('ğ', 'g')
    .replace('ü', 'u')
    .replace('ş', 's')
    .replace('ö', 'o')
    .replace('ç', 'c');
}

function formatDate(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function isPaid(item) {
  const durum = String(item?.durum || item?.status || '').toLowerCase();
  return item?.odendi === true || item?.paid === true || durum === 'odendi' || durum === 'ödendi' || durum === 'paid';
}

function formatAmount(value) {
  if (value === undefined || value === null || value === '') return 'Tutar belirtilmedi';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num.toLocaleString('tr-TR')} TL`;
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
  emptyWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  logo: { color: theme.primary, fontSize: 23, fontWeight: '900' },
  brandSub: { color: theme.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  profileButtonText: { fontSize: 20 },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  childCard: { backgroundColor: theme.card, borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  avatar: { width: 66, height: 66, borderRadius: 22, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 34 },
  childName: { color: theme.text, fontSize: 18, fontWeight: '900' },
  childSub: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 3 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: { color: theme.primary, backgroundColor: theme.primarySoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, fontSize: 10.5, fontWeight: '900', overflow: 'hidden' },
  pillGreen: { color: theme.green, backgroundColor: '#E9FBEF' },
  pillOrange: { color: theme.orange, backgroundColor: '#FFF3DF' },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quickActionCard: { width: '48.7%', backgroundColor: theme.card, borderRadius: 19, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: theme.border },
  quickActionIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickActionIconText: { fontSize: 20 },
  quickActionTitle: { color: theme.text, fontSize: 13, fontWeight: '900' },
  quickActionDesc: { color: theme.muted, fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  commentCard: { backgroundColor: theme.card, borderRadius: 22, padding: 15, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: theme.primary, borderWidth: 1, borderColor: theme.border },
  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  commentTitle: { color: theme.primary, fontSize: 13, fontWeight: '900' },
  todayTag: { color: '#FFF', backgroundColor: theme.primary, fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden' },
  commentText: { color: theme.text, fontSize: 13.5, lineHeight: 20, fontWeight: '650' },
  miniGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  miniCard: { width: '23.5%', backgroundColor: theme.card, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  miniIcon: { fontSize: 20, marginBottom: 4 },
  miniValue: { color: theme.text, fontSize: 12, fontWeight: '900', maxWidth: '100%' },
  miniLabel: { color: theme.muted, fontSize: 9.5, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, marginBottom: 9 },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  sectionAction: { color: theme.primary, fontSize: 11.5, fontWeight: '900' },
  card: { backgroundColor: theme.card, borderRadius: 21, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  cardRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bigIcon: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bigIconText: { fontSize: 22 },
  iconOrange: { backgroundColor: '#FFF3DF' },
  iconBlue: { backgroundColor: '#EAF0FF' },
  iconPink: { backgroundColor: '#FFE9F8' },
  iconGreen: { backgroundColor: '#E9FBEF' },
  iconPurple: { backgroundColor: '#F3F0FF' },
  paymentAlert: { borderLeftWidth: 5, borderLeftColor: theme.orange, backgroundColor: '#FFFAF0' },
  pollAlert: { borderLeftWidth: 5, borderLeftColor: theme.primary, backgroundColor: '#FBF8FF' },
  amountText: { color: theme.orange, fontSize: 13, fontWeight: '900', marginTop: 6 },
  cardTitle: { color: theme.text, fontSize: 14.5, fontWeight: '900' },
  cardDesc: { color: theme.muted, fontSize: 11.8, fontWeight: '650', lineHeight: 16, marginTop: 4 },
  mealBox: { marginTop: 10, gap: 8 },
  mealLine: { backgroundColor: theme.bg, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border },
  mealName: { width: 66, color: theme.primary, fontSize: 11.3, fontWeight: '900' },
  mealMenu: { flex: 1, color: theme.text, fontSize: 11.5, fontWeight: '700', lineHeight: 15 },
  mealStatus: { fontSize: 10.3, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 99, overflow: 'hidden' },
  mealAte: { color: theme.green, backgroundColor: '#E9FBEF' },
  mealLittle: { color: theme.orange, backgroundColor: '#FFF3DF' },
  mealNo: { color: theme.red, backgroundColor: '#FFE8EE' },
  mealWaiting: { color: theme.muted, backgroundColor: theme.primarySoft },
  scheduleList: { marginTop: 10, gap: 8 },
  lessonLine: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lessonMain: { flex: 1, color: theme.text, fontSize: 12, fontWeight: '900' },
  lessonTime: { color: theme.muted, fontSize: 10.5, fontWeight: '850', marginLeft: 8 },
  emptyInline: { color: theme.muted, fontWeight: '700', fontSize: 12, paddingVertical: 8 },
  twoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  smallCard: { width: '48.7%', minHeight: 112, backgroundColor: theme.card, borderRadius: 19, padding: 13, borderWidth: 1, borderColor: theme.border },
  noticeCard: { backgroundColor: '#FFFAF0', borderColor: '#FFE5B3' },
  smallIcon: { fontSize: 24, marginBottom: 7 },
  smallTitle: { color: theme.text, fontSize: 13, fontWeight: '900' },
  smallDesc: { color: theme.muted, fontSize: 11.2, fontWeight: '650', lineHeight: 15, marginTop: 4 },
  wideCard: { backgroundColor: theme.card, borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { color: theme.primary, fontSize: 24, fontWeight: '900' },
});
