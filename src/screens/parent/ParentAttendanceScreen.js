// ============================================================
// YUMURCAK — ParentAttendanceScreen.js
// FAZ 2: Yeni tek kayıt yoklama sistemini destekler
// yoklamalar/{tarih}_{cocukId}
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME, getMonthKey, getMonthLabel, isAbsentStatus } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';

const STATUS_LABELS = {
  geldi: 'Geldi',
  gelmedi: 'Gelmedi',
  gec: 'Geç',
  devamsiz: 'Devamsız',
  devamsız: 'Devamsız',
};

export default function ParentAttendanceScreen({ navigation }) {
  const { loading, selectedChild } = useParentBase();
  const raw = useNodeList('yoklamalar');
  const [selectedMonth, setSelectedMonth] = useState(null);

  const childRecords = useMemo(() => {
    if (!selectedChild?.id) return [];

    const map = {};
    raw
      .filter((item) => item.cocukId === selectedChild.id)
      .filter((item) => item.tarih)
      .forEach((item) => {
        const key = `${item.tarih}_${item.cocukId}`;
        const existing = map[key];
        if (!existing || Number(item.updatedAt || item.createdAt || 0) > Number(existing.updatedAt || existing.createdAt || 0)) {
          map[key] = item;
        }
      });

    return Object.values(map).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)));
  }, [raw, selectedChild?.id]);

  const months = useMemo(() => buildLast12Months(childRecords), [childRecords]);
  const currentMonth = selectedMonth || months[0]?.key;
  const days = currentMonth ? childRecords.filter((item) => String(item.tarih || '').startsWith(currentMonth)) : [];
  const yearAbsences = childRecords.filter((item) => isAbsentStatus(item.durum)).length;
  const monthAbsences = days.filter((item) => isAbsentStatus(item.durum)).length;

  if (loading) return <LoadingScreen text="Yoklama hazırlanıyor..." />;

  return (
    <ScreenShell title="Yoklama" emoji="✅" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Yoklama geçmişi için çocuğunuzun veli hesabına bağlı olması gerekir." />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Özet</Text>
            <Text style={styles.cardText}>Bu ay devamsızlık: {monthAbsences} gün</Text>
            <Text style={styles.cardText}>Son 12 ay toplam devamsızlık: {yearAbsences} gün</Text>
          </View>

          <Text style={styles.sectionTitle}>Son 12 Ay</Text>
          {months.map((month) => (
            <TouchableOpacity key={month.key} style={styles.card} onPress={() => setSelectedMonth(month.key)} activeOpacity={0.84}>
              <Text style={styles.cardTitle}>{getMonthLabel(month.key)}</Text>
              <Text style={styles.cardText}>{month.absentCount} devamsızlık</Text>
            </TouchableOpacity>
          ))}

          {currentMonth ? <Text style={styles.sectionTitle}>{getMonthLabel(currentMonth)} Gün Detayı</Text> : null}
          {days.length === 0 ? (
            <EmptyState icon="📅" title="Bu ay kayıt yok" desc="Yoklama kaydı girildiğinde burada görünecek." />
          ) : (
            days.map((item) => <AttendanceDay key={`${item.tarih}_${item.cocukId}`} item={item} />)
          )}
        </>
      )}
    </ScreenShell>
  );
}

function buildLast12Months(records) {
  const now = new Date();
  const keys = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(getMonthKey(d));
  }
  return keys.map((key) => {
    const monthRecords = records.filter((item) => String(item.tarih || '').startsWith(key));
    return { key, absentCount: monthRecords.filter((item) => isAbsentStatus(item.durum)).length };
  });
}

function AttendanceDay({ item }) {
  const absent = isAbsentStatus(item.durum);
  const isLate = String(item.durum || '').toLowerCase() === 'gec';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.tarih}</Text>
      <Text
        style={[
          styles.cardText,
          {
            color: absent ? THEME.red : isLate ? THEME.orange : THEME.green,
            fontWeight: '900',
          },
        ]}
      >
        Durum: {STATUS_LABELS[item.durum] || item.durum || '-'}
      </Text>
      {item.not ? <Text style={styles.cardText}>Not: {item.not}</Text> : null}
    </View>
  );
}
