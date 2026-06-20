// ============================================================
// YUMURCAK — ParentAnnouncementsScreen.js
// FAZ 3: Kurum duyurusu + çocuğun sınıf duyurusu gösterilir
// ============================================================
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';

export default function ParentAnnouncementsScreen({ navigation }) {
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const announcements = useNodeList('duyurular');

  const visible = useMemo(() => {
    return announcements
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === sinifId)
      .sort((a, b) => String(b.createdAt || b.tarih || '').localeCompare(String(a.createdAt || a.tarih || '')));
  }, [announcements, kresId, sinifId]);

  if (loading) return <LoadingScreen text="Duyurular hazırlanıyor..." />;

  return (
    <ScreenShell title="Duyurular" emoji="📣" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Duyurular için çocuğunuzun sınıfa bağlı olması gerekir." />
      ) : visible.length === 0 ? (
        <EmptyState icon="📣" title="Henüz duyuru yok" desc="Kurum veya öğretmen duyuru eklediğinde burada görünecek." />
      ) : (
        visible.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
              {item.sinifId ? 'Sınıf Duyurusu' : 'Kurum Duyurusu'}
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{item.baslik || item.title || 'Duyuru'}</Text>
            <Text style={styles.cardText}>{item.icerik || item.metin || item.aciklama || '-'}</Text>
            {item.tarih ? <Text style={[styles.cardText, { marginTop: 8 }]}>📅 {item.tarih}</Text> : null}
          </View>
        ))
      )}
    </ScreenShell>
  );
}
