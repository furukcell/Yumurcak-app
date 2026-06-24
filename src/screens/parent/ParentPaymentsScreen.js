import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ScreenShell, useNodeList, useParentBase, LoadingScreen, EmptyState, includesId, MONTH_LABELS, pad2 } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import { formatDisplayDate } from '../../utils/dateFormat';

const STATUS_META = {
  odendi: { label: 'Ödendi', icon: '✅', color: '#20B45B', bg: '#E9FBEF' },
  bekliyor: { label: 'Bekliyor', icon: '⏳', color: '#FF9F1C', bg: '#FFF3DF' },
  gecikti: { label: 'Gecikti', icon: '❗', color: '#FF4D6D', bg: '#FFE8EC' },
  kayitYok: { label: 'Kayıt yok', icon: '—', color: '#707386', bg: '#F1F2F6' },
};

export default function ParentPaymentsScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const payments = useNodeList('odemeler');
  const [tab, setTab] = useState('son12');

  const { loading, selectedChild, children, parentId, kresId, kresAdi, kres } = base;
  const childIds = useMemo(() => children.map((c) => String(c.id)).filter(Boolean), [children]);

  const myPayments = useMemo(() => {
    if (!childIds.length && !parentId) return [];

    return payments
      .filter(Boolean)
      .filter((item) => {
        const itemChildId = String(item.cocukId || item.childId || '');
        const sameChild = itemChildId && childIds.includes(itemChildId);
        const directParent = parentId && (item.veliId === parentId || item.parentId === parentId);
        const paymentParentArray = parentId && includesId(item.veliIds || item.parentIds, parentId);
        return sameChild || directParent || paymentParentArray;
      })
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId || item.kurumId === kresId)
      .map((item) => ({ ...item, durum: normalizeStatus(item), monthKey: getPaymentMonthKey(item) }))
      .sort((a, b) => getSortValue(b) - getSortValue(a));
  }, [payments, childIds, parentId, kresId]);

  const last12Months = useMemo(() => buildLastMonths(12), []);

  const monthlyRows = useMemo(() => {
    const targetChildId = selectedChild?.id ? String(selectedChild.id) : childIds[0];
    return last12Months.map((month) => {
      const record = myPayments.find((item) => {
        const sameMonth = item.monthKey === month.key;
        const itemChildId = String(item.cocukId || item.childId || '');
        return sameMonth && (!targetChildId || itemChildId === targetChildId);
      });
      return {
        ...month,
        record: record || null,
        status: record ? record.durum : 'kayitYok',
      };
    });
  }, [last12Months, myPayments, selectedChild?.id, childIds]);

  const stats = useMemo(() => {
    const son12Records = monthlyRows.map((row) => row.record).filter(Boolean);
    return {
      totalAmount: son12Records.reduce((sum, item) => sum + toNumber(item.tutar || item.amount), 0),
      paidCount: son12Records.filter((item) => item.durum === 'odendi').length,
      waitingCount: son12Records.filter((item) => item.durum === 'bekliyor').length,
      overdueCount: son12Records.filter((item) => item.durum === 'gecikti').length,
      openAmount: son12Records
        .filter((item) => item.durum !== 'odendi')
        .reduce((sum, item) => sum + toNumber(item.tutar || item.amount), 0),
    };
  }, [monthlyRows]);

  if (loading) return <LoadingScreen text="Ödeme bilgileri hazırlanıyor..." />;

  const iban = kres?.iban || kres?.IBAN || kres?.bankaIban || kres?.hesapIban || '';

  function showIban() {
    if (!iban) {
      Alert.alert('IBAN', 'Kurum IBAN bilgisi yönetici tarafından girildiğinde burada gösterilecek.');
      return;
    }
    Alert.alert('Kurum IBAN', iban);
  }

  return (
    <ScreenShell title="Ödeme Takibi" emoji="💳" navigation={navigation} subtitle={kresAdi}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Son 12 Ay Ödeme Özeti</Text>
        <Text style={styles.heroSubtitle}>{selectedChild ? getChildName(selectedChild) : 'Çocuk bağlantısı bekleniyor'}</Text>
        <View style={styles.statGrid}>
          <StatBox styles={styles} label="Toplam" value={formatMoney(stats.totalAmount)} />
          <StatBox styles={styles} label="Açık" value={formatMoney(stats.openAmount)} danger={stats.openAmount > 0} />
          <StatBox styles={styles} label="Ödendi" value={String(stats.paidCount)} />
          <StatBox styles={styles} label="Geciken" value={String(stats.overdueCount)} danger={stats.overdueCount > 0} />
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabButton, tab === 'son12' && styles.tabActive]} onPress={() => setTab('son12')} activeOpacity={0.85}>
          <Text style={[styles.tabText, tab === 'son12' && styles.tabActiveText]}>Son 12 Ay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'tum' && styles.tabActive]} onPress={() => setTab('tum')} activeOpacity={0.85}>
          <Text style={[styles.tabText, tab === 'tum' && styles.tabActiveText]}>Tüm Kayıtlar</Text>
        </TouchableOpacity>
      </View>

      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bağlantısı yok" desc="Ödeme kayıtlarını görmek için veli hesabına bağlı çocuk gerekir." />
      ) : tab === 'son12' ? (
        <View>
          {monthlyRows.map((row) => <MonthPaymentCard key={row.key} row={row} styles={styles} />)}
        </View>
      ) : myPayments.length === 0 ? (
        <EmptyState icon="💳" title="Ödeme kaydı yok" desc="Ödemeniz gereken ücret kaydı olduğunda burada görünecek." />
      ) : (
        <View>
          {myPayments.map((item, index) => <PaymentCard key={item.id || `${item.cocukId || 'odeme'}-${index}`} item={item} styles={styles} />)}
        </View>
      )}

      <TouchableOpacity style={styles.ibanButton} onPress={showIban} activeOpacity={0.85}>
        <Text style={styles.ibanText}>IBAN Bilgisi</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

function StatBox({ styles, label, value, danger }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, danger && styles.statDanger]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MonthPaymentCard({ row, styles }) {
  const record = row.record;
  const status = STATUS_META[row.status] || STATUS_META.bekliyor;
  return (
    <View style={styles.monthCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.monthTitle}>{row.label}</Text>
        <Text style={styles.monthDesc} numberOfLines={1}>{record?.baslik || record?.title || record?.aciklama || 'Aylık ücret kaydı'}</Text>
        {record?.sonOdemeTarihi ? <Text style={styles.dueDate}>Son ödeme: {formatDisplayDate(record.sonOdemeTarihi)}</Text> : null}
        {record?.odemeTarihi ? <Text style={styles.paidDate}>Ödeme tarihi: {formatDisplayDate(record.odemeTarihi)}</Text> : null}
      </View>
      <View style={styles.amountBlock}>
        <Text style={styles.amount}>{record ? formatMoney(record.tutar || record.amount) : '-'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.icon} {status.label}</Text>
        </View>
      </View>
    </View>
  );
}

function PaymentCard({ item, styles }) {
  const status = STATUS_META[item.durum] || STATUS_META.bekliyor;
  return (
    <View style={styles.paymentCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.paymentTitle} numberOfLines={1}>{item.baslik || item.aciklama || item.description || 'Ödeme'}</Text>
        <Text style={styles.paymentDesc}>{item.donem || item.tarih || `${item.ay || ''} ${item.yil || ''}`.trim() || 'Dönem bilgisi yok'}</Text>
        {item.sonOdemeTarihi ? <Text style={styles.dueDate}>Son ödeme: {formatDisplayDate(item.sonOdemeTarihi)}</Text> : null}
      </View>
      <View style={styles.amountBlock}>
        <Text style={styles.amount}>{formatMoney(item.tutar || item.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.icon} {status.label}</Text>
        </View>
      </View>
    </View>
  );
}

function buildLastMonths(count) {
  const now = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    return { key, label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}` };
  });
}

function normalizeStatus(item) {
  const raw = String(item?.durum || item?.status || '').toLowerCase().trim();
  if (['odendi', 'ödendi', 'paid', 'tamamlandi', 'tamamlandı'].includes(raw)) return 'odendi';
  if (['gecikti', 'geçti', 'late', 'overdue'].includes(raw)) return 'gecikti';
  const due = item?.sonOdemeTarihi || item?.dueDate;
  if (due && Date.parse(due) < Date.now()) return 'gecikti';
  return 'bekliyor';
}

function getPaymentMonthKey(item) {
  if (item?.tarih && String(item.tarih).length >= 7) return String(item.tarih).slice(0, 7);
  if (item?.donemKey) return String(item.donemKey).slice(0, 7);
  const year = Number(item?.yil || item?.year);
  const month = Number(item?.ay || item?.month);
  if (year && month) return `${year}-${pad2(month)}`;
  return '';
}

function getSortValue(item) {
  const monthKey = getPaymentMonthKey(item);
  if (monthKey) return Date.parse(`${monthKey}-01`);
  const raw = item?.sonOdemeTarihi || item?.tarih || item?.createdAt || item?.updatedAt || '';
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number) || !number) return '-';
  return `${number.toLocaleString('tr-TR')} TL`;
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const clean = String(value || '0').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

function getChildName(child = {}) {
  return `${child.ad || ''} ${child.soyad || ''}`.trim() || child.adSoyad || child.isim || 'Çocuğum';
}

const createStyles = (theme) => {
  const t = theme || {};
  return StyleSheet.create({
    heroCard: { backgroundColor: t.primary, borderRadius: 24, padding: 18, marginBottom: 16, shadowColor: t.primary, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
    heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
    heroSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700', marginTop: 4 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
    statBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: 12, marginTop: 8 },
    statLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '800' },
    statValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 4 },
    statDanger: { color: '#FFE08A' },
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tabButton: { flex: 1, backgroundColor: t.card, borderRadius: 18, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
    tabActive: { backgroundColor: t.primary, borderColor: t.primary },
    tabText: { color: t.text, fontWeight: '900', fontSize: 14 },
    tabActiveText: { color: '#FFFFFF' },
    monthCard: { backgroundColor: t.card, borderRadius: 20, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.border },
    monthTitle: { color: t.text, fontSize: 15, fontWeight: '900' },
    monthDesc: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
    paymentCard: { backgroundColor: t.card, borderRadius: 20, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.border },
    paymentTitle: { color: t.text, fontSize: 15, fontWeight: '900' },
    paymentDesc: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
    dueDate: { color: t.orange, fontSize: 11, fontWeight: '800', marginTop: 4 },
    paidDate: { color: t.green, fontSize: 11, fontWeight: '800', marginTop: 4 },
    amountBlock: { alignItems: 'flex-end', marginLeft: 10, maxWidth: 126 },
    amount: { color: t.text, fontSize: 16, fontWeight: '900', textAlign: 'right' },
    statusBadge: { marginTop: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
    statusText: { fontSize: 11, fontWeight: '900' },
    ibanButton: { alignSelf: 'flex-end', marginTop: 16, backgroundColor: t.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 14 },
    ibanText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  });
};
