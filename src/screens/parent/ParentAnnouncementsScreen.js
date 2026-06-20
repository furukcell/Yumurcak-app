import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, useNodeList, styles, THEME } from './parentShared';

export default function ParentAnnouncementsScreen({ navigation }) {
  const announcements = useNodeList('duyurular');
  const list = useMemo(() => {
    return announcements
      .slice()
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')))
      .slice(0, 20);
  }, [announcements]);

  return (
    <ScreenShell title="Duyurular" emoji="📣" navigation={navigation}>
      {list.length === 0 ? (
        <EmptyState icon="📣" title="Henüz duyuru yok" desc="Kreş yeni duyuru eklediğinde burada görünecek." />
      ) : (
        list.map((item) => <AnnouncementCard key={item.id} item={item} />)
      )}
    </ScreenShell>
  );
}

function AnnouncementCard({ item }) {
  const urgent = item.onem === 'Acil' || item.acil === true || item.tip === 'acil';
  return (
    <View style={styles.card}>
      <Text style={[styles.badge, { backgroundColor: urgent ? '#FFE8EE' : THEME.primarySoft, color: urgent ? THEME.red : THEME.primary }]}>
        {urgent ? 'Acil' : 'Normal'}
      </Text>
      <Text style={[styles.cardTitle, { marginTop: 10 }]}>{item.baslik || item.title || 'Duyuru'}</Text>
      <Text style={styles.cardText}>{item.icerik || item.metin || item.aciklama || '-'}</Text>
      <Text style={[styles.cardText, { marginTop: 8 }]}>📅 {item.tarih || 'Bugün'}</Text>
    </View>
  );
}
