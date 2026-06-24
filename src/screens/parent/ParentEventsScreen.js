// ============================================================
// YUMURCAK — ParentEventsScreen.js
// FAZ 3: Genel etkinlik + çocuğun sınıf etkinliği gösterilir
// ============================================================
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';

export default function ParentEventsScreen({ navigation }) {
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const events = useNodeList('etkinlikler');

  const visible = useMemo(() => {
    return events
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        if (Array.isArray(item.sinifIds)) return item.sinifIds.includes(sinifId);
        if (item.sinifId) return item.sinifId === sinifId;
        return true;
      })
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [events, kresId, sinifId]);

  if (loading) return <LoadingScreen text="Etkinlikler hazırlanıyor..." />;

  return (
    <ScreenShell title="Etkinlikler" emoji="🎉" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Etkinlikler için çocuğunuzun sınıfa bağlı olması gerekir." />
      ) : visible.length === 0 ? (
        <EmptyState icon="🎉" title="Henüz etkinlik yok" desc="Kurum veya öğretmen etkinlik eklediğinde burada görünecek." />
      ) : (
        visible.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
              {item.sinifId ? 'Sınıf Etkinliği' : 'Genel Etkinlik'}
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{item.baslik || 'Etkinlik'}</Text>
            <Text style={styles.cardText}>📅 {formatDisplayDate(item.tarih)}</Text>
            {item.aciklama ? <Text style={styles.cardText}>{item.aciklama}</Text> : null}
          </View>
        ))
      )}
    </ScreenShell>
  );
}
