import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';

export default function ParentReportsScreen({ navigation }) {
  const { loading, selectedChild } = useParentBase();
  const reports = useNodeList('gunlukRaporlar');

  const childReports = useMemo(() => {
    if (!selectedChild?.id) return [];
    return reports
      .filter((item) => item.cocukId === selectedChild.id)
      .sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
  }, [reports, selectedChild?.id]);

  if (loading) return <LoadingScreen text="Raporlar hazırlanıyor..." />;

  return (
    <ScreenShell title="Günlük Raporlar" emoji="📋" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Rapor görmek için çocuğunuzun veli hesabına bağlı olması gerekir." />
      ) : childReports.length === 0 ? (
        <EmptyState icon="📝" title="Henüz rapor yok" desc="Öğretmen günlük rapor girdiğinde burada görünecek." />
      ) : (
        childReports.map((item, index) => <ReportCard key={item.id} item={item} isToday={index === 0} />)
      )}
    </ScreenShell>
  );
}

function ReportCard({ item, isToday }) {
  const mood = item?.mood || item?.ruhHali || item?.durum || '-';
  const meal = item?.yemekDurumu || (item?.yemek ? 'İyi' : '-');
  const sleep = item?.uyku?.sure ? `${item.uyku.sure} saat` : (item?.uykuDurumu || '-');
  const note = item?.not || item?.ogretmenNotu || item?.notlar || 'Öğretmen notu yok.';

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={styles.cardTitle}>{isToday ? 'Bugün' : item.tarih || 'Rapor'}</Text>
          <Text style={styles.cardText}>{item.tarih || '-'}</Text>
        </View>
        {isToday ? <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>Bugün</Text> : null}
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={styles.cardText}>😊 Ruh hali: {mood}</Text>
        <Text style={styles.cardText}>🍴 Yemek: {meal}</Text>
        <Text style={styles.cardText}>🌙 Uyku: {sleep}</Text>
        <Text style={[styles.cardText, { marginTop: 8 }]}>👩‍🏫 {note}</Text>
      </View>
    </View>
  );
}
