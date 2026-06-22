import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ScreenShell, useNodeList, useParentBase, LoadingScreen, EmptyState, includesId } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function ParentPaymentsScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const payments = useNodeList('odemeler');

  const { loading, selectedChild, parentId, kresId, kresAdi } = base;

  const myPayments = useMemo(() => {
    if (!selectedChild?.id && !parentId) return [];

    return payments
      .filter(Boolean)
      .filter((item) => {
        const sameChild = selectedChild?.id && (item.cocukId === selectedChild.id || item.childId === selectedChild.id);
        const directParent = parentId && (item.veliId === parentId || item.parentId === parentId);
        const childParent = parentId && includesId(selectedChild?.veliIds, parentId);
        const paymentParentArray = parentId && includesId(item.veliIds || item.parentIds, parentId);
        return sameChild || directParent || childParent || paymentParentArray;
      })
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .sort((a, b) => getSortValue(b) - getSortValue(a));
  }, [payments, selectedChild?.id, selectedChild?.veliIds, parentId, kresId]);

  if (loading) return <LoadingScreen text="Ödeme bilgileri hazırlanıyor..." />;

  return (
    <ScreenShell title="Ödeme Takibi" emoji="💳" navigation={navigation} subtitle={kresAdi}>
      <View style={styles.tabRow}>
        <View style={[styles.tabButton, styles.tabActive]}><Text style={styles.tabActiveText}>Aidat Takibi</Text></View>
        <View style={styles.tabButton}><Text style={styles.tabText}>Ücret Takibi</Text></View>
      </View>

      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bağlantısı yok" desc="Ödeme kayıtlarını görmek için veli hesabına bağlı çocuk gerekir." />
      ) : myPayments.length === 0 ? (
        <EmptyState icon="💳" title="Ödeme kaydı yok" desc="Ödemeniz gereken ücret kaydı olduğunda burada görünecek." />
      ) : (
        myPayments.map((item, index) => (
          <View key={item.id || `${item.cocukId || 'odeme'}-${index}`} style={styles.paymentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>{item.baslik || item.aciklama || item.description || 'Ödeme'}</Text>
              <Text style={styles.paymentDesc}>{item.donem || item.tarih || `${item.ay || ''} ${item.yil || ''}`.trim() || 'Dönem bilgisi yok'}</Text>
              {item.sonOdemeTarihi ? <Text style={styles.dueDate}>Son ödeme: {item.sonOdemeTarihi}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amount}>{formatMoney(item.tutar || item.amount)}</Text>
              <Text style={[styles.status, isPaid(item) && styles.statusPaid]}>{isPaid(item) ? 'Ödendi' : 'Bekliyor'}</Text>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.ibanButton} onPress={() => Alert.alert('IBAN', 'Kurum IBAN bilgisi yönetici tarafından girildiğinde burada gösterilecek.')} activeOpacity={0.85}>
        <Text style={styles.ibanText}>IBAN</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

function isPaid(item) {
  const status = String(item?.durum || item?.status || '').toLowerCase();
  return status === 'odendi' || status === 'ödendi' || status === 'paid';
}

function getSortValue(item) {
  const raw = item?.sonOdemeTarihi || item?.tarih || item?.createdAt || item?.updatedAt || '';
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  const number = Number(String(value || 0).replace(',', '.'));
  if (!Number.isFinite(number) || !number) return '-';
  return `${number.toLocaleString('tr-TR')} TL`;
}

const createStyles = (theme) => {
  const t = theme || {};
  return StyleSheet.create({
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    tabButton: { flex: 1, backgroundColor: t.card, borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border },
    tabActive: { backgroundColor: t.primary, borderColor: t.primary },
    tabText: { color: t.text, fontWeight: '900', fontSize: 15 },
    tabActiveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
    paymentCard: { backgroundColor: t.card, borderRadius: 20, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.border },
    paymentTitle: { color: t.text, fontSize: 15, fontWeight: '900' },
    paymentDesc: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
    dueDate: { color: t.orange, fontSize: 11, fontWeight: '800', marginTop: 4 },
    amount: { color: t.text, fontSize: 16, fontWeight: '900' },
    status: { marginTop: 4, color: t.orange, backgroundColor: '#FFF3DF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
    statusPaid: { color: t.green, backgroundColor: '#E9FBEF' },
    ibanButton: { alignSelf: 'flex-end', marginTop: 16, backgroundColor: t.primary, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 15 },
    ibanText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  });
};
