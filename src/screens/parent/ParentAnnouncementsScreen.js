// ============================================================
// YUMURCAK — ParentAnnouncementsScreen.js
// Veli duyuruları
// Kurum + veli hedefli + çocuğun sınıf duyurusu gösterilir
// Öğretmen hedefli duyurular velide görünmez
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
      .filter((item) => {
        const targetRole = item.targetRole || item.hedefRol || item.hedefTipi || 'all';

        if (targetRole === 'ogretmen') return false;
        if (targetRole === 'veli') return true;
        if (targetRole === 'sinif') return !!sinifId && item.sinifId === sinifId;

        return !item.sinifId || item.sinifId === sinifId;
      })
      .sort((a, b) => Number(b.createdAt || b.tarih || 0) - Number(a.createdAt || a.tarih || 0));
  }, [announcements, kresId, sinifId]);

  if (loading) return <LoadingScreen text="Duyurular hazırlanıyor..." />;

  return (
    <ScreenShell title="Duyurular" emoji="📣" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Duyurular için çocuğunuzun sınıfa bağlı olması gerekir." />
      ) : visible.length === 0 ? (
        <EmptyState icon="📣" title="Henüz duyuru yok" desc="Kurum veya öğretmen duyuru eklediğinde burada görünecek." />
      ) : (
        visible.map((item) => {
          const targetRole = item.targetRole || item.hedefRol || item.hedefTipi || 'all';
          const label = targetRole === 'sinif'
            ? 'Sınıf Duyurusu'
            : targetRole === 'veli'
              ? 'Veli Duyurusu'
              : 'Kurum Duyurusu';

          return (
            <View key={item.id} style={styles.card}>
              <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
                {label}
              </Text>
              <Text style={[styles.cardTitle, { marginTop: 8 }]}>
                {item.baslik || item.title || 'Duyuru'}
              </Text>
              <Text style={styles.cardText}>
                {item.icerik || item.message || item.metin || item.aciklama || '-'}
              </Text>
              {item.tarih ? <Text style={[styles.cardText, { marginTop: 8 }]}>📅 {item.tarih}</Text> : null}
            </View>
          );
        })
      )}
    </ScreenShell>
  );
}
