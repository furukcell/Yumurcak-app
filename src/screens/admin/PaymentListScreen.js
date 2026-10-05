// ============================================================
// YUMURCAK — PaymentListScreen.js
// FAZ 4: Admin ödeme ekranı profesyonel liste + filtreler
// ============================================================
import i18n from '../../i18n';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ref, onValue, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayMonth } from '../../utils/dateFormat';

// Önümüzdeki kaç gün içinde son ödeme tarihi olanlar "yaklaşan" sayılır
const UPCOMING_DAYS = 7;

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  blue: '#3A7BFF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const DURUM_META = {
  tum: { labelKey: 'admin.paymentList.all', icon: '📋', color: THEME.primary, bg: THEME.primarySoft },
  odendi: { labelKey: 'admin.paymentList.paid', icon: '✅', color: THEME.green, bg: '#E9FBEF' },
  bekliyor: { labelKey: 'admin.paymentList.pending', icon: '⏳', color: THEME.orange, bg: '#FFF3DF' },
  gecikti: { labelKey: 'admin.paymentList.late', icon: '❗', color: THEME.red, bg: '#FFE8EC' },
  yaklasan: { labelKey: 'admin.paymentList.upcoming', icon: '🔔', color: THEME.blue, bg: '#E8F0FF' },
};

function getMonthName(month) {
  if (!month) return '';
  return new Date(2020, month - 1, 1).toLocaleDateString(i18n.language, { month: 'long' });
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toList(data) {
  return Object.entries(safeObject(data)).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

// Bugünden son ödeme gününe kalan gün (geçmişse negatif); tarih yoksa null
function daysUntil(value) {
  const due = parseDay(value);
  if (!due) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86400000);
}

function shiftMonthKey(key, delta) {
  const [y, m] = String(key).split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

function monthTitle(key) {
  const [y, m] = String(key).split('-').map(Number);
  return `${getMonthName(m)} ${y}`.trim();
}

function normalizeDurum(item = {}) {
  const v = String(item.durum || item.status || '').toLowerCase().trim();
  if (['odendi', 'ödendi', 'paid', 'tamamlandi', 'tamamlandı'].includes(v)) return 'odendi';
  if (['gecikti', 'geçti', 'late', 'overdue'].includes(v)) return 'gecikti';
  const due = item.sonOdemeTarihi || item.dueDate;
  const left = daysUntil(due);
  // Son ödeme günü bitmeden (gece yarısına kadar) gecikmiş sayılmaz
  if (left !== null) return left < 0 ? 'gecikti' : 'bekliyor';
  if (due && Date.parse(due) < Date.now()) return 'gecikti';
  return 'bekliyor';
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const clean = String(value || '0').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  const number = toNumber(value);
  return number > 0 ? `${number.toLocaleString('tr-TR')} ₺` : '-';
}

function formatMoneyZero(value) {
  return `${toNumber(value).toLocaleString('tr-TR')} ₺`;
}

function getChildName(cocuk = {}, odeme = {}) {
  return (
    `${cocuk.ad || ''} ${cocuk.soyad || ''}`.trim() ||
    cocuk.adSoyad ||
    cocuk.isim ||
    odeme.cocukAd ||
    odeme.cocukAdi ||
    odeme.childName ||
    odeme.cocukId ||
    i18n.t('admin.paymentForm.childFallback')
  );
}

function getDonem(o = {}) {
  if (o.donem) return formatDisplayMonth(o.donem);
  if (o.tarih && String(o.tarih).length >= 7) return formatDisplayMonth(String(o.tarih).slice(0, 7));
  const ayText = getMonthName(Number(o.ay)) || o.ay || '';
  return `${ayText} ${o.yil || ''}`.trim() || i18n.t('admin.paymentList.noPeriod');
}

function getMonthKey(o = {}) {
  if (o.tarih && String(o.tarih).length >= 7) return String(o.tarih).slice(0, 7);
  const yil = Number(o.yil || o.year);
  const ay = Number(o.ay || o.month);
  if (yil && ay) return `${yil}-${pad2(ay)}`;
  return '';
}

export default function PaymentListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || kullanici?.kurumId || null;

  const [odemeler, setOdemeler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [filter, setFilter] = useState('tum');
  const [seciliAy, setSeciliAy] = useState(currentMonthKey());
  const [secimModu, setSecimModu] = useState(false);
  const [secili, setSecili] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [planModalId, setPlanModalId] = useState(null);
  const [planYeniTutar, setPlanYeniTutar] = useState('');
  const [planBusy, setPlanBusy] = useState(false);

  useEffect(() => {
    let odemelerData = {};
    let cocuklarData = {};
    let odemelerLoaded = false;
    let cocuklarLoaded = false;
    let alive = true;

    function buildList() {
      if (!alive || !odemelerLoaded || !cocuklarLoaded) return;
      const liste = toList(odemelerData)
        .filter((o) => {
          if (!kresId) return true;
          return !o.kresId || o.kresId === kresId || o.kurumId === kresId;
        })
        .map((o) => {
          const cocuk = safeObject(cocuklarData[o.cocukId] || cocuklarData[o.childId]);
          const durum = normalizeDurum(o);
          return {
            ...o,
            durum,
            cocukId: o.cocukId || o.childId || '',
            cocukAd: getChildName(cocuk, o),
            sinifId: cocuk.sinifId || o.sinifId || '',
            donem: getDonem(o),
            monthKey: getMonthKey(o),
            tutarNumber: toNumber(o.tutar || o.amount),
            kalanGun: durum === 'odendi' ? null : daysUntil(o.sonOdemeTarihi || o.dueDate),
          };
        })
        .sort((a, b) => {
          const dateA = Date.parse(`${a.monthKey || '1970-01'}-01`) || Number(a.createdAt || a.updatedAt || 0);
          const dateB = Date.parse(`${b.monthKey || '1970-01'}-01`) || Number(b.createdAt || b.updatedAt || 0);
          return dateB - dateA;
        });

      setOdemeler(liste);
      setErrorText('');
      setLoading(false);
    }

    const odemelerUnsub = onValue(
      kresId
        ? query(ref(database, 'odemeler'), orderByChild('kresId'), equalTo(kresId))
        : ref(database, 'odemeler'),
      (snap) => {
        odemelerData = safeObject(snap.val());
        odemelerLoaded = true;
        buildList();
      },
      () => {
        odemelerData = {};
        odemelerLoaded = true;
        setErrorText(t('admin.paymentList.readPaymentsFailed'));
        buildList();
      }
    );

    const cocuklarTarget = kresId
      ? query(ref(database, 'cocuklar'), orderByChild('kresId'), equalTo(kresId))
      : ref(database, 'cocuklar');

    const cocuklarUnsub = onValue(
      cocuklarTarget,
      (snap) => {
        cocuklarData = safeObject(snap.val());
        cocuklarLoaded = true;
        buildList();
      },
      () => {
        cocuklarData = {};
        cocuklarLoaded = true;
        setErrorText(t('admin.paymentList.readChildrenFailed'));
        buildList();
      }
    );

    return () => {
      alive = false;
      odemelerUnsub();
      cocuklarUnsub();
    };
  }, [kresId]);

  // Plan (taksit) özetleri: kalan, her zaman ödenmemiş kayıtlardan hesaplanır
  const planMap = useMemo(() => {
    const map = {};
    odemeler.forEach((o) => {
      if (!o.planId) return;
      const p = map[o.planId] || (map[o.planId] = { total: 0, paid: 0, left: 0, leftAmount: 0, unpaid: [] });
      p.total += 1;
      if (o.durum === 'odendi') p.paid += 1;
      else {
        p.left += 1;
        p.leftAmount += o.tutarNumber;
        p.unpaid.push(o);
      }
    });
    return map;
  }, [odemeler]);

  // Aylık özet: Beklenen / Tahsil edilen / Kalan seçili aya göre; Geciken ve Yaklaşan tüm aylar
  const stats = useMemo(() => {
    const ayKaydi = seciliAy === 'all' ? odemeler : odemeler.filter((o) => o.monthKey === seciliAy);
    const sum = (arr) => arr.reduce((total, o) => total + o.tutarNumber, 0);
    const odenenler = ayKaydi.filter((o) => o.durum === 'odendi');
    const kalanlar = ayKaydi.filter((o) => o.durum !== 'odendi');
    const geciken = odemeler.filter((o) => o.durum === 'gecikti');
    const yaklasan = odemeler
      .filter((o) => o.durum === 'bekliyor' && o.kalanGun !== null && o.kalanGun >= 0 && o.kalanGun <= UPCOMING_DAYS)
      .sort((a, b) => a.kalanGun - b.kalanGun);
    const beklenen = sum(ayKaydi);
    const tahsil = sum(odenenler);
    return {
      ayKaydi,
      geciken,
      yaklasan,
      beklenen,
      tahsil,
      kalan: sum(kalanlar),
      adet: ayKaydi.length,
      odenenAdet: odenenler.length,
      kalanAdet: kalanlar.length,
      gecikenTutar: sum(geciken),
      yaklasanTutar: sum(yaklasan),
      yuzde: beklenen > 0 ? Math.min(100, Math.round((tahsil / beklenen) * 100)) : 0,
    };
  }, [odemeler, seciliAy]);

  const filteredPayments = useMemo(() => {
    if (filter === 'gecikti') return stats.geciken;
    if (filter === 'yaklasan') return stats.yaklasan;
    if (filter === 'tum') return stats.ayKaydi;
    return stats.ayKaydi.filter((o) => o.durum === filter);
  }, [filter, stats]);

  const seciliListe = useMemo(() => odemeler.filter((o) => secili[o.id] && o.durum !== 'odendi'), [odemeler, secili]);

  async function odendiYap(item) {
    if (!item?.id || busyId) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `odemeler/${item.id}`), {
        durum: 'odendi',
        status: 'odendi',
        odemeTarihi: item.odemeTarihi || todayKey(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      Alert.alert(t('common.error'), t('admin.paymentList.updateFailed'));
    } finally {
      setBusyId(null);
    }
  }

  function toggleSecim(item) {
    if (item.durum === 'odendi') return;
    setSecili((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = true;
      return next;
    });
  }

  function secimiKapat() {
    setSecimModu(false);
    setSecili({});
  }

  function seciliOdendiOnayla() {
    if (!seciliListe.length || bulkBusy) return;
    const toplam = seciliListe.reduce((total, o) => total + o.tutarNumber, 0);
    Alert.alert(
      t('admin.paymentList.confirmBulkTitle'),
      t('admin.paymentList.confirmBulkBody', { count: seciliListe.length, total: formatMoneyZero(toplam) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('admin.paymentList.confirmBtn'), onPress: seciliOdendiYap },
      ]
    );
  }

  async function seciliOdendiYap() {
    setBulkBusy(true);
    try {
      const updates = {};
      const now = Date.now();
      const bugun = todayKey();
      seciliListe.forEach((o) => {
        updates[`${o.id}/durum`] = 'odendi';
        updates[`${o.id}/status`] = 'odendi';
        updates[`${o.id}/odemeTarihi`] = o.odemeTarihi || bugun;
        updates[`${o.id}/updatedAt`] = now;
      });
      // Tek toplu yazma: ya hepsi güncellenir ya hiçbiri
      await update(ref(database, 'odemeler'), updates);
      secimiKapat();
    } catch (e) {
      Alert.alert(t('common.error'), t('admin.paymentList.updateFailed'));
    } finally {
      setBulkBusy(false);
    }
  }

  function planAc(item) {
    setPlanYeniTutar('');
    setPlanModalId(item.planId);
  }

  function planKapat() {
    setPlanModalId(null);
    setPlanYeniTutar('');
  }

  async function planTutarGuncelle() {
    const plan = planModalId ? planMap[planModalId] : null;
    if (!plan || !plan.unpaid.length || planBusy) return;
    const amount = toNumber(planYeniTutar);
    if (!(amount > 0)) return Alert.alert(t('common.error'), t('admin.paymentList.planInvalidAmount'));
    setPlanBusy(true);
    try {
      const updates = {};
      const now = Date.now();
      plan.unpaid.forEach((o) => {
        updates[`${o.id}/tutar`] = amount;
        updates[`${o.id}/amount`] = amount;
        updates[`${o.id}/updatedAt`] = now;
      });
      await update(ref(database, 'odemeler'), updates);
      planKapat();
    } catch (e) {
      Alert.alert(t('common.error'), t('admin.paymentList.updateFailed'));
    } finally {
      setPlanBusy(false);
    }
  }

  function planIptalOnayla() {
    const plan = planModalId ? planMap[planModalId] : null;
    if (!plan || !plan.unpaid.length || planBusy) return;
    Alert.alert(
      t('admin.paymentList.planCancel'),
      t('admin.paymentList.planCancelConfirm', { count: plan.unpaid.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: planIptalEt },
      ]
    );
  }

  async function planIptalEt() {
    const plan = planModalId ? planMap[planModalId] : null;
    if (!plan) return;
    setPlanBusy(true);
    try {
      const updates = {};
      plan.unpaid.forEach((o) => { updates[o.id] = null; });
      await update(ref(database, 'odemeler'), updates);
      planKapat();
    } catch (e) {
      Alert.alert(t('common.error'), t('admin.paymentList.updateFailed'));
    } finally {
      setPlanBusy(false);
    }
  }

  const renderItem = ({ item }) => {
    const meta = DURUM_META[item.durum] || DURUM_META.bekliyor;
    const busy = busyId === item.id;
    const plan = item.planId ? planMap[item.planId] : null;
    const secilebilir = secimModu && item.durum !== 'odendi';
    const secildi = !!secili[item.id];

    let gunYazi = '';
    let gunRenk = THEME.muted;
    if (item.durum === 'gecikti' && item.kalanGun !== null && item.kalanGun < 0) {
      gunYazi = t('admin.paymentList.daysLate', { count: Math.abs(item.kalanGun) });
      gunRenk = THEME.red;
    } else if (item.durum === 'bekliyor' && item.kalanGun !== null && item.kalanGun >= 0 && item.kalanGun <= UPCOMING_DAYS) {
      gunYazi = item.kalanGun === 0 ? t('admin.paymentList.dueToday') : t('admin.paymentList.daysLeft', { count: item.kalanGun });
      gunRenk = THEME.orange;
    }

    return (
      <View style={[styles.card, secildi && styles.cardSecili]}>
        <TouchableOpacity
          onPress={() => (secimModu ? toggleSecim(item) : navigation.navigate('PaymentForm', { paymentId: item.id }))}
          activeOpacity={0.82}
        >
          <View style={styles.cardTop}>
            {secilebilir ? (
              <View style={[styles.checkbox, secildi && styles.checkboxOn]}>
                {secildi ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>👧</Text>
              </View>
            )}
            <View style={styles.cardTextBlock}>
              <Text style={styles.cocukAd} numberOfLines={1}>{item.cocukAd}</Text>
              <Text style={styles.baslik} numberOfLines={1}>{item.baslik || item.aciklama || item.title || t('admin.paymentList.monthlyFee')}</Text>
              <Text style={styles.donem}>{item.donem}</Text>
            </View>
            <View style={[styles.durumBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.durumYazi, { color: meta.color }]}>{meta.icon} {t(meta.labelKey)}</Text>
            </View>
          </View>

          {plan ? (
            <Text style={styles.planLine} numberOfLines={2}>
              {t('admin.paymentList.planProgress', { paid: plan.paid, total: plan.total, left: plan.left, amount: formatMoneyZero(plan.leftAmount) })}
            </Text>
          ) : null}

          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>{t('admin.paymentList.amount')}</Text>
              <Text style={styles.tutar}>{formatMoney(item.tutar || item.amount)}</Text>
            </View>
            <View style={styles.infoRight}>
              <Text style={styles.infoLabel}>{item.odemeTarihi ? t('admin.paymentList.paymentDate') : t('admin.paymentList.dueDate')}</Text>
              <Text style={styles.tarih} numberOfLines={1}>{item.odemeTarihi || item.sonOdemeTarihi || '-'}</Text>
              {gunYazi ? <Text style={[styles.gunYazi, { color: gunRenk }]}>{gunYazi}</Text> : null}
            </View>
          </View>
        </TouchableOpacity>

        {!secimModu ? (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('PaymentForm', { paymentId: item.id })} activeOpacity={0.85}>
              <Text style={styles.editBtnText}>{t('admin.paymentList.edit')}</Text>
            </TouchableOpacity>
            {plan && plan.left > 0 ? (
              <TouchableOpacity style={styles.planBtn} onPress={() => planAc(item)} activeOpacity={0.85}>
                <Text style={styles.planBtnText}>{t('admin.paymentList.planMenu')}</Text>
              </TouchableOpacity>
            ) : null}
            {item.durum !== 'odendi' ? (
              <TouchableOpacity style={[styles.odendiBtn, busy && { opacity: 0.6 }]} onPress={() => odendiYap(item)} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.odendiBtnText}>{t('admin.paymentList.markPaid')}</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>{t('admin.paymentList.loading')}</Text>
      </View>
    );
  }

  const ayBasligi = seciliAy === 'all' ? t('admin.paymentList.allMonths') : monthTitle(seciliAy);
  const modalPlan = planModalId ? planMap[planModalId] : null;
  const FILTERS = ['tum', 'bekliyor', 'gecikti', 'yaklasan', 'odendi'];

  const listHeader = (
    <View>
      <View style={styles.headerCard}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>{t('admin.paymentList.title')}</Text>
          <Text style={styles.headerSub}>{t('admin.paymentList.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}>
          <Text style={styles.headerAddText}>{t('admin.paymentList.add')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity
          style={[styles.navBtn, seciliAy === 'all' && { opacity: 0.35 }]}
          disabled={seciliAy === 'all'}
          onPress={() => setSeciliAy(shiftMonthKey(seciliAy, -1))}
          activeOpacity={0.8}
        >
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel} numberOfLines={1}>{ayBasligi}</Text>
        <TouchableOpacity
          style={[styles.navBtn, seciliAy === 'all' && { opacity: 0.35 }]}
          disabled={seciliAy === 'all'}
          onPress={() => setSeciliAy(shiftMonthKey(seciliAy, 1))}
          activeOpacity={0.8}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallChip} onPress={() => setSeciliAy(seciliAy === 'all' ? currentMonthKey() : 'all')} activeOpacity={0.8}>
          <Text style={styles.smallChipText} numberOfLines={1}>{seciliAy === 'all' ? t('admin.paymentList.thisMonth') : t('admin.paymentList.allMonths')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallChip, secimModu && { backgroundColor: THEME.primary }]}
          onPress={() => (secimModu ? secimiKapat() : setSecimModu(true))}
          activeOpacity={0.8}
        >
          <Text style={[styles.smallChipText, secimModu && { color: '#FFFFFF' }]} numberOfLines={1}>
            {secimModu ? t('admin.paymentList.cancelSelect') : t('admin.paymentList.select')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressTitle}>{t('admin.paymentList.expected')}</Text>
          <Text style={styles.progressValue}>{formatMoneyZero(stats.beklenen)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.yuzde}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {t('admin.paymentList.collectedSummary', { percent: stats.yuzde, paid: formatMoneyZero(stats.tahsil), total: formatMoneyZero(stats.beklenen) })}
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryBox title={t('admin.paymentList.collected')} value={formatMoneyZero(stats.tahsil)} sub={t('admin.paymentList.recordsCount', { count: stats.odenenAdet })} color={THEME.green} />
        <SummaryBox title={t('admin.paymentList.remaining')} value={formatMoneyZero(stats.kalan)} sub={t('admin.paymentList.recordsCount', { count: stats.kalanAdet })} color={THEME.orange} />
        <SummaryBox title={t('admin.paymentList.late')} value={formatMoneyZero(stats.gecikenTutar)} sub={t('admin.paymentList.recordsCount', { count: stats.geciken.length })} color={THEME.red} />
        <SummaryBox title={t('admin.paymentList.upcoming')} value={formatMoneyZero(stats.yaklasanTutar)} sub={t('admin.paymentList.recordsCount', { count: stats.yaklasan.length })} color={THEME.blue} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((key) => {
          const meta = DURUM_META[key];
          const active = filter === key;
          return (
            <TouchableOpacity key={key} style={[styles.filterChip, active && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setFilter(key)} activeOpacity={0.8}>
              <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t(meta.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {(filter === 'gecikti' || filter === 'yaklasan') ? (
        <Text style={styles.hintText}>{t('admin.paymentList.allMonthsHint')}</Text>
      ) : null}

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );

  const listEmpty = (
    <View style={styles.bos}>
      <Text style={styles.bosEmoji}>💳</Text>
      <Text style={styles.bosYazi}>{t('admin.paymentList.empty')}</Text>
      <Text style={styles.bosAlt}>{t('admin.paymentList.createHint')}</Text>
      <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}>
        <Text style={styles.emptyAddText}>{t('admin.paymentList.create')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredPayments}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        extraData={{ secili, secimModu, busyId, planMap }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {secimModu ? (
        <View style={styles.bulkBar}>
          <TouchableOpacity
            style={[styles.bulkBtn, (!seciliListe.length || bulkBusy) && { opacity: 0.5 }]}
            disabled={!seciliListe.length || bulkBusy}
            onPress={seciliOdendiOnayla}
            activeOpacity={0.85}
          >
            {bulkBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.bulkBtnText}>{t('admin.paymentList.markSelectedPaid', { count: seciliListe.length })}</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={!!modalPlan} transparent animationType="fade" onRequestClose={planKapat}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admin.paymentList.planTitle')}</Text>
            {modalPlan ? (
              <Text style={styles.modalSub}>
                {t('admin.paymentList.planProgress', { paid: modalPlan.paid, total: modalPlan.total, left: modalPlan.left, amount: formatMoneyZero(modalPlan.leftAmount) })}
              </Text>
            ) : null}

            <Text style={styles.modalLabel}>{t('admin.paymentList.planNewAmount')}</Text>
            <TextInput
              style={styles.modalInput}
              value={planYeniTutar}
              onChangeText={setPlanYeniTutar}
              keyboardType="numeric"
              placeholder="7500"
            />
            <TouchableOpacity style={[styles.modalPrimary, planBusy && { opacity: 0.6 }]} onPress={planTutarGuncelle} disabled={planBusy} activeOpacity={0.85}>
              {planBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>{t('admin.paymentList.planUpdateRemaining', { count: modalPlan ? modalPlan.left : 0 })}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDanger} onPress={planIptalOnayla} disabled={planBusy} activeOpacity={0.85}>
              <Text style={styles.modalDangerText}>{t('admin.paymentList.planCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={planKapat} activeOpacity={0.85}>
              <Text style={styles.modalCloseText}>{t('admin.paymentList.close')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryBox({ title, value, sub, color }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.summarySub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '700' },
  errorText: { backgroundColor: '#FFF1F3', color: THEME.red, fontWeight: '800', padding: 10, textAlign: 'center' },
  headerCard: { margin: 16, marginBottom: 10, backgroundColor: THEME.primary, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', shadowColor: THEME.primary, shadowOpacity: 0.18, shadowRadius: 14, elevation: 5 },
  headerTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700', marginTop: 4 },
  headerAddBtn: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 10 },
  headerAddText: { color: THEME.primary, fontWeight: '900', fontSize: 13 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 2 },
  summaryBox: { width: '48%', backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  summaryTitle: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  summaryValue: { marginTop: 5, fontSize: 18, fontWeight: '900' },
  summarySub: { marginTop: 2, color: THEME.muted, fontSize: 11, fontWeight: '700' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  filterChip: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  filterText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },
  list: { paddingBottom: 130 },
  card: { marginHorizontal: 16, backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFF6E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 22 },
  cardTextBlock: { flex: 1, minWidth: 0, paddingRight: 8 },
  cocukAd: { fontSize: 16, fontWeight: '900', color: THEME.text },
  baslik: { fontSize: 13, color: THEME.primary, fontWeight: '800', marginTop: 3 },
  donem: { fontSize: 12, color: THEME.muted, fontWeight: '700', marginTop: 3 },
  durumBadge: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 112 },
  durumYazi: { fontSize: 11, fontWeight: '900' },
  infoRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: THEME.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  infoRight: { alignItems: 'flex-end', marginLeft: 10, maxWidth: 150 },
  tutar: { fontSize: 19, fontWeight: '900', color: THEME.text, marginTop: 3 },
  tarih: { fontSize: 12, color: THEME.text, fontWeight: '800', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 13, paddingVertical: 11, alignItems: 'center' },
  editBtnText: { color: THEME.primary, fontSize: 13, fontWeight: '900' },
  odendiBtn: { flex: 1, backgroundColor: THEME.green, borderRadius: 13, paddingVertical: 11, alignItems: 'center' },
  odendiBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  bos: { minHeight: 280, justifyContent: 'center', alignItems: 'center', padding: 34 },
  bosEmoji: { fontSize: 50, marginBottom: 12 },
  bosYazi: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 6 },
  bosAlt: { fontSize: 13, color: THEME.muted, textAlign: 'center', fontWeight: '700', lineHeight: 19 },
  emptyAddBtn: { marginTop: 18, backgroundColor: THEME.primary, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 13 },
  emptyAddText: { color: '#FFFFFF', fontWeight: '900' },
  cardSecili: { borderColor: THEME.primary, borderWidth: 2 },
  checkbox: { width: 44, height: 44, borderRadius: 16, borderWidth: 2, borderColor: THEME.border, backgroundColor: '#FAFAFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxOn: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  checkboxTick: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  planLine: { marginTop: 10, color: THEME.primaryDark, backgroundColor: THEME.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  gunYazi: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  planBtn: { backgroundColor: '#FFF3DF', borderRadius: 13, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  planBtnText: { color: THEME.orange, fontSize: 13, fontWeight: '900' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6, marginBottom: 10 },
  navBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: THEME.primary, fontSize: 22, fontWeight: '900', marginTop: -2 },
  monthLabel: { flex: 1, textAlign: 'center', color: THEME.text, fontSize: 15, fontWeight: '900' },
  smallChip: { backgroundColor: THEME.primarySoft, borderRadius: 12, paddingHorizontal: 10, height: 36, alignItems: 'center', justifyContent: 'center', maxWidth: 90 },
  smallChipText: { color: THEME.primary, fontSize: 12, fontWeight: '900' },
  progressCard: { marginHorizontal: 16, backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  progressValue: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  progressTrack: { height: 10, borderRadius: 6, backgroundColor: THEME.primarySoft, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 6, backgroundColor: THEME.green },
  progressText: { marginTop: 8, color: THEME.text, fontSize: 12, fontWeight: '800' },
  hintText: { paddingHorizontal: 16, marginBottom: 6, color: THEME.muted, fontSize: 11, fontWeight: '700' },
  bulkBar: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  bulkBtn: { backgroundColor: THEME.green, borderRadius: 18, paddingVertical: 16, alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10 },
  bulkBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 18 },
  modalTitle: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  modalSub: { color: THEME.primaryDark, fontSize: 12, fontWeight: '800', marginTop: 6 },
  modalLabel: { color: THEME.text, fontSize: 13, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  modalInput: { backgroundColor: '#FAFAFF', borderRadius: 14, padding: 14, fontSize: 15, color: THEME.text, borderWidth: 1, borderColor: THEME.border, fontWeight: '700' },
  modalPrimary: { backgroundColor: THEME.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  modalPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  modalDanger: { backgroundColor: '#FFE8EC', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  modalDangerText: { color: THEME.red, fontSize: 14, fontWeight: '900' },
  modalClose: { paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  modalCloseText: { color: THEME.muted, fontSize: 14, fontWeight: '900' },
});
