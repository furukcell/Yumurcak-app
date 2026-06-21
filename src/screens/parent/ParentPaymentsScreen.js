import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ScreenShell, useNodeList, useParentBase, LoadingScreen, EmptyState } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function ParentPaymentsScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const payments = useNodeList('odemeler');

  const { loading, selectedChild, kresId, kresAdi } = base;

  const myPayments = useMemo(() => {
    if (!selectedChild?.id) return [];
    return payments
      .filter((item) => item.cocukId === selectedChild.id || item.veliId === selectedChild.veliId)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));
  }, [payments, selectedChild?.id, selectedChild?.veliId, kresId]);

  if (loading) return <LoadingScreen text="Ödeme bilgileri hazırlanıyor..." />;

  return (
    <ScreenShell title="Ödeme Takibi" emoji="💳" navigation={navigation} subtitle={kresAdi}>
      <View style={styles.tabRow}>
        <View style={[styles.tabButton, styles.tabActive]}><Text style={styles.tabActiveText}>Aidat Takibi</Text></View>
        <View style={styles.tabButton}><Text style={styles.tabText}>Ücret Takibi</Text></View>
      </View>

      {myPayments.length === 0 ? (
        <EmptyState icon="💳" title="Ödeme kaydı yok" desc="Ödemeniz gereken ücret kaydı olduğunda burada görünecek." />
      ) : (
        myPayments.map((item) => (
          <View key={item.id} style={styles.paymentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>{item.baslik || item.aciklama || 'Ödeme'}</Text>
              <Text style={styles.paymentDesc}>{item.donem || item.tarih || 'Dönem bilgisi yok'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amount}>{formatMoney(item.tutar)}</Text>
              <Text style={[styles.status, item.durum === 'odendi' && styles.statusPaid]}>{item.durum === 'odendi' ? 'Ödendi' : 'Bekliyor'}</Text>
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

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return '-';
  return `${number.toLocaleString('tr-TR')} TL`;
}

const createStyles = (theme) => StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tabButton: { flex: 1, backgroundColor: theme.card, borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabText: { color: theme.text, fontWeight: '900', fontSize: 15 },
  tabActiveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  paymentCard: { backgroundColor: theme.card, borderRadius: 20, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  paymentTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
  paymentDesc: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  amount: { color: theme.text, fontSize: 16, fontWeight: '900' },
  status: { marginTop: 4, color: theme.orange, backgroundColor: '#FFF3DF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
  statusPaid: { color: theme.green, backgroundColor: '#E9FBEF' },
  ibanButton: { alignSelf: 'flex-end', marginTop: 16, backgroundColor: theme.primary, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 15 },
  ibanText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});
