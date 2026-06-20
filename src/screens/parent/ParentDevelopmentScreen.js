import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles } from './parentShared';

export default function ParentDevelopmentScreen({ navigation }) {
  const { loading, selectedChild } = useParentBase();
  const raw = useNodeList('fizikselGelisim');

  const records = useMemo(() => {
    if (!selectedChild?.id) return [];
    return raw
      .filter((item) => item.cocukId === selectedChild.id)
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));
  }, [raw, selectedChild?.id]);

  if (loading) return <LoadingScreen text="Gelişim raporu hazırlanıyor..." />;

  return (
    <ScreenShell title="Fiziksel Gelişim" emoji="📈" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Gelişim bilgisi için çocuk bağlantısı gerekir." />
      ) : records.length === 0 ? (
        <EmptyState icon="📈" title="Henüz gelişim kaydı yok" desc="Boy ve kilo ölçümleri girildiğinde burada görünecek." />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Son Ölçüm</Text>
            <Text style={styles.cardText}>Tarih: {records[0].tarih || '-'}</Text>
            <Text style={styles.cardText}>Boy: {records[0].boy || '-'} cm</Text>
            <Text style={styles.cardText}>Kilo: {records[0].kilo || '-'} kg</Text>
          </View>
          <Text style={styles.sectionTitle}>Ölçüm Geçmişi</Text>
          {records.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.tarih || 'Ölçüm'}</Text>
              <Text style={styles.cardText}>Boy: {item.boy || '-'} cm</Text>
              <Text style={styles.cardText}>Kilo: {item.kilo || '-'} kg</Text>
              {item.basCevresi ? <Text style={styles.cardText}>Baş çevresi: {item.basCevresi} cm</Text> : null}
              {item.not ? <Text style={styles.cardText}>Not: {item.not}</Text> : null}
            </View>
          ))}
        </>
      )}
    </ScreenShell>
  );
}
