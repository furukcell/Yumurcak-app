// ============================================================
// YUMURCAK — ParentEventsScreen.js
// FAZ 3: Genel etkinlik + çocuğun sınıf etkinliği gösterilir
// ============================================================
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';

export default function ParentEventsScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
 
  const events = useNodeList('etkinlikler', kresId);

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

  if (loading) return <LoadingScreen text={t('parent.events.loading')} />;

  return (
    <ScreenShell title={t('parent.events.title')} emoji="🎉" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.events.noChildTitle')} desc={t('parent.events.noChildDesc')} />
      ) : visible.length === 0 ? (
        <EmptyState icon="🎉" title={t('parent.events.emptyTitle')} desc={t('parent.events.emptyDesc')} />
      ) : (
        visible.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
              {item.sinifId ? t('parent.events.classEvent') : t('parent.events.generalEvent')}
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{item.baslik || t('parent.events.defaultTitle')}</Text>
            <Text style={styles.cardText}>📅 {formatDisplayDate(item.tarih)}</Text>
            {item.aciklama ? <Text style={styles.cardText}>{item.aciklama}</Text> : null}
          </View>
        ))
      )}
    </ScreenShell>
  );
}
