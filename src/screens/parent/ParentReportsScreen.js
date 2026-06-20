// ============================================================
// YUMURCAK — ParentReportsScreen.js
// FAZ 2: Öğün detayları veli tarafında gösterilir
// Geriye dönük eski yemek formatını da destekler
// ============================================================
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';

const MEAL_LABELS = {
  kahvalti: 'Kahvaltı',
  ogle: 'Öğle Yemeği',
  araOgun: 'Ara Öğün',
};

const STATUS_LABELS = {
  yemedi: 'Yemedi',
  az_yedi: 'Az yedi',
  bitirdi: 'Bitirdi',
};

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
  const sleep = item?.uyku?.sure ? `${item.uyku.sure} saat` : (item?.uykuDurumu || '-');
  const toilet = item?.tuvalet?.sayi ? `${item.tuvalet.sayi} kez` : (item?.tuvaletDurumu || '-');
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
        <MealDetail yemek={item?.yemek} yemekDurumu={item?.yemekDurumu} />
        <Text style={styles.cardText}>🌙 Uyku: {sleep}</Text>
        <Text style={styles.cardText}>🚽 Tuvalet: {toilet}</Text>
        <Text style={[styles.cardText, { marginTop: 8 }]}>👩‍🏫 {note}</Text>
      </View>
    </View>
  );
}

function MealDetail({ yemek, yemekDurumu }) {
  if (!yemek) {
    return <Text style={styles.cardText}>🍴 Yemek: {yemekDurumu || '-'}</Text>;
  }

  if (typeof yemek === 'boolean') {
    return <Text style={styles.cardText}>🍴 Yemek: {yemek ? 'İyi' : '-'}</Text>;
  }

  const keys = ['kahvalti', 'ogle', 'araOgun'];
  const hasDetailed = keys.some((key) => typeof yemek[key] === 'object' && yemek[key]?.durum);

  if (!hasDetailed) {
    const oldSelected = keys.filter((key) => yemek[key]).map((key) => MEAL_LABELS[key]);
    return <Text style={styles.cardText}>🍴 Yemek: {oldSelected.length ? oldSelected.join(', ') : (yemekDurumu || '-')}</Text>;
  }

  return (
    <View style={{ marginVertical: 4 }}>
      <Text style={[styles.cardText, { fontWeight: '900', color: THEME.text }]}>🍴 Yemek Detayları</Text>
      {keys.map((key) => {
        const status = yemek[key]?.durum;
        if (!status) return null;
        return (
          <Text key={key} style={[styles.cardText, { marginLeft: 12 }]}>
            • {MEAL_LABELS[key]}: {STATUS_LABELS[status] || status}
          </Text>
        );
      })}
    </View>
  );
}
