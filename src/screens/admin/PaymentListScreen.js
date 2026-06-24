// ============================================================
// YUMURCAK — PaymentListScreen.js
// FAZ 4: Admin ödeme ekranı profesyonel liste + filtreler
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayMonth } from '../../utils/dateFormat';

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
  tum: { label: 'Tümü', icon: '📋', color: THEME.primary, bg: THEME.primarySoft },
  odendi: { label: 'Ödendi', icon: '✅', color: THEME.green, bg: '#E9FBEF' },
  bekliyor: { label: 'Bekliyor', icon: '⏳', color: THEME.orange, bg: '#FFF3DF' },
  gecikti: { label: 'Gecikti', icon: '❗', color: THEME.red, bg: '#FFE8EC' },
};

const AY_ADLARI = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

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

function normalizeDurum(item = {}) {
  const v = String(item.durum || item.status || '').toLowerCase().trim();
  if (['odendi', 'ödendi', 'paid', 'tamamlandi', 'tamamlandı'].includes(v)) return 'odendi';
  if (['gecikti', 'geçti', 'late', 'overdue'].includes(v)) return 'gecikti';
  const due = item.sonOdemeTarihi || item.dueDate;
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

function getChildName(cocuk = {}, odeme = {}) {
  return (
    `${cocuk.ad || ''} ${cocuk.soyad || ''}`.trim() ||
    cocuk.adSoyad ||
    cocuk.isim ||
    odeme.cocukAd ||
    odeme.cocukAdi ||
    odeme.childName ||
    odeme.cocukId ||
    'Çocuk'
  );
}

function getDonem(o = {}) {
  if (o.donem) return formatDisplayMonth(o.donem);
  if (o.tarih && String(o.tarih).length >= 7) return formatDisplayMonth(String(o.tarih).slice(0, 7));
  const ayText = AY_ADLARI[Number(o.ay)] || o.ay || '';
  return `${ayText} ${o.yil || ''}`.trim() || 'Dönem yok';
}

function getMonthKey(o = {}) {
  if (o.tarih && String(o.tarih).length >= 7) return String(o.tarih).slice(0, 7);
  const yil = Number(o.yil || o.year);
  const ay = Number(o.ay || o.month);
  if (yil && ay) return `${yil}-${pad2(ay)}`;
  return '';
}

export default function PaymentListScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || kullanici?.kurumId || null;

  const [odemeler, setOdemeler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [filter, setFilter] = useState('tum');

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
      ref(database, 'odemeler'),
      (snap) => {
        odemelerData = safeObject(snap.val());
        odemelerLoaded = true;
        buildList();
      },
      () => {
        odemelerData = {};
        odemelerLoaded = true;
        setErrorText('Ödeme kayıtları okunamadı.');
        buildList();
      }
    );

    const cocuklarUnsub = onValue(
      ref(database, 'cocuklar'),
      (snap) => {
        cocuklarData = safeObject(snap.val());
        cocuklarLoaded = true;
        buildList();
      },
      () => {
        cocuklarData = {};
        cocuklarLoaded = true;
        setErrorText('Çocuk kayıtları okunamadı.');
        buildList();
      }
    );

    return () => {
      alive = false;
      odemelerUnsub();
      cocuklarUnsub();
    };
  }, [kresId]);

  const stats = useMemo(() => {
    const buAy = currentMonthKey();
    const bekleyenler = odemeler.filter((o) => o.durum !== 'odendi');
    return {
      toplam: odemeler.length,
      odendi: odemeler.filter((o) => o.durum === 'odendi').length,
      bekliyor: odemeler.filter((o) => o.durum === 'bekliyor').length,
      gecikti: odemeler.filter((o) => o.durum === 'gecikti').length,
      acikTutar: bekleyenler.reduce((sum, o) => sum + o.tutarNumber, 0),
      buAyTutar: odemeler.filter((o) => o.monthKey === buAy).reduce((sum, o) => sum + o.tutarNumber, 0),
    };
  }, [odemeler]);

  const filteredPayments = useMemo(() => {
    if (filter === 'tum') return odemeler;
    return odemeler.filter((o) => o.durum === filter);
  }, [filter, odemeler]);

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
      Alert.alert('Hata', 'Ödeme durumu güncellenemedi.');
    } finally {
      setBusyId(null);
    }
  }

  const renderItem = ({ item }) => {
    const meta = DURUM_META[item.durum] || DURUM_META.bekliyor;
    const busy = busyId === item.id;
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentForm', { paymentId: item.id })} activeOpacity={0.82}>
          <View style={styles.cardTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>👧</Text>
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cocukAd} numberOfLines={1}>{item.cocukAd}</Text>
              <Text style={styles.baslik} numberOfLines={1}>{item.baslik || item.aciklama || item.title || 'Aylık ücret'}</Text>
              <Text style={styles.donem}>{item.donem}</Text>
            </View>
            <View style={[styles.durumBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.durumYazi, { color: meta.color }]}>{meta.icon} {meta.label}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Tutar</Text>
              <Text style={styles.tutar}>{formatMoney(item.tutar || item.amount)}</Text>
            </View>
            <View style={styles.infoRight}>
              <Text style={styles.infoLabel}>{item.odemeTarihi ? 'Ödeme tarihi' : 'Son ödeme'}</Text>
              <Text style={styles.tarih} numberOfLines={1}>{item.odemeTarihi || item.sonOdemeTarihi || '-'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('PaymentForm', { paymentId: item.id })} activeOpacity={0.85}>
            <Text style={styles.editBtnText}>Düzenle</Text>
          </TouchableOpacity>
          {item.durum !== 'odendi' ? (
            <TouchableOpacity style={[styles.odendiBtn, busy && { opacity: 0.6 }]} onPress={() => odendiYap(item)} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.odendiBtnText}>Ödendi Yap</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Ödemeler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerCard}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>Ödemeler</Text>
          <Text style={styles.headerSub}>Aidat ve ücret kayıtlarını buradan takip et</Text>
        </View>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}>
          <Text style={styles.headerAddText}>+ Kayıt</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryBox title="Açık Tutar" value={formatMoney(stats.acikTutar)} color={THEME.red} />
        <SummaryBox title="Bu Ay" value={formatMoney(stats.buAyTutar)} color={THEME.primary} />
        <SummaryBox title="Ödendi" value={String(stats.odendi)} color={THEME.green} />
        <SummaryBox title="Geciken" value={String(stats.gecikti)} color={THEME.red} />
      </View>

      <View style={styles.filterRow}>
        {['tum', 'bekliyor', 'gecikti', 'odendi'].map((key) => {
          const meta = DURUM_META[key];
          const active = filter === key;
          return (
            <TouchableOpacity key={key} style={[styles.filterChip, active && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setFilter(key)} activeOpacity={0.8}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <View style={styles.container}>
        {filteredPayments.length === 0 ? (
          <View style={styles.bos}>
            <Text style={styles.bosEmoji}>💳</Text>
            <Text style={styles.bosYazi}>Ödeme kaydı yok</Text>
            <Text style={styles.bosAlt}>Yeni ödeme oluşturmak için + Kayıt butonuna bas</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}>
              <Text style={styles.emptyAddText}>+ Ödeme Kaydı Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredPayments}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryBox({ title, value, color }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1}>{value}</Text>
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
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  summaryBox: { width: '48%', backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  summaryTitle: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  summaryValue: { marginTop: 5, fontSize: 18, fontWeight: '900' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  filterText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 110 },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
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
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 34 },
  bosEmoji: { fontSize: 50, marginBottom: 12 },
  bosYazi: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 6 },
  bosAlt: { fontSize: 13, color: THEME.muted, textAlign: 'center', fontWeight: '700', lineHeight: 19 },
  emptyAddBtn: { marginTop: 18, backgroundColor: THEME.primary, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 13 },
  emptyAddText: { color: '#FFFFFF', fontWeight: '900' },
});
