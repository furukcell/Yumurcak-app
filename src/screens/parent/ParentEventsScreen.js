import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles } from './parentShared';

export default function ParentEventsScreen({ navigation }) {
  const { loading, kresId, sinifId } = useParentBase();
  const etkinliklerRaw = useNodeList('etkinlikler');

  const etkinlikler = useMemo(() => {
    if (!kresId || !sinifId) return [];
    return etkinliklerRaw
      .filter((item) => item.aktif !== false)
      .filter((item) => item.kresId === kresId)
      .filter((item) => Array.isArray(item.sinifIds) && item.sinifIds.includes(sinifId))
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [etkinliklerRaw, kresId, sinifId]);

  if (loading) return <LoadingScreen text="Etkinlikler hazırlanıyor..." />;

  return (
    <ScreenShell title="Etkinlikler" emoji="🎉" navigation={navigation}>
      {!sinifId ? (
        <EmptyState icon="🎉" title="Sınıf bilgisi bulunamadı" desc="Çocuğunuz sınıfa bağlandığında etkinlikler burada görünecek." />
      ) : etkinlikler.length === 0 ? (
        <EmptyState icon="🎉" title="Henüz etkinlik yok" desc="Sınıfınıza ait yeni etkinlikler burada görünecek." />
      ) : (
        etkinlikler.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.baslik || 'Etkinlik'}</Text>
            <Text style={styles.cardText}>📅 {item.tarih || '-'}{item.saat ? ` · ${item.saat}` : ''}</Text>
            <Text style={[styles.cardText, { marginTop: 8 }]}>{item.aciklama || '-'}</Text>
          </View>
        ))
      )}
    </ScreenShell>
  );
}
