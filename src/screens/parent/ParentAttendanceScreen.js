// ============================================================
// YUMURCAK — ParentAttendanceScreen.js
// FAZ 2: Yeni tek kayıt yoklama sistemini destekler
// yoklamalar/{tarih}_{cocukId}
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME, getMonthKey, getMonthLabel, isAbsentStatus } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';

function getStatusLabel(status, t) {
  const value = String(status || '').toLowerCase();
  if (value === 'geldi') return t('parent.attendance.status.geldi');
  if (value === 'gelmedi') return t('parent.attendance.status.gelmedi');
  if (value === 'gec') return t('parent.attendance.status.gec');
  if (value === 'devamsiz' || value === 'devamsız') return t('parent.attendance.status.devamsiz');
  return status || '-';
}

export default function ParentAttendanceScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresId } = useParentBase();
  const raw = useNodeList('yoklamalar', kresId);
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

  if (loading) return <LoadingScreen text={t('parent.attendance.loading')} />;

  return (
    <ScreenShell title={t('parent.attendance.title')} emoji="✅" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.attendance.noChildTitle')} desc={t('parent.attendance.noChildDesc')} />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('parent.attendance.summary')}</Text>
            <Text style={styles.cardText}>{t('parent.attendance.monthAbsences', { count: monthAbsences })}</Text>
            <Text style={styles.cardText}>{t('parent.attendance.yearAbsences', { count: yearAbsences })}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t('parent.attendance.last12Months')}</Text>
          {months.map((month) => (
            <TouchableOpacity key={month.key} style={styles.card} onPress={() => setSelectedMonth(month.key)} activeOpacity={0.84}>
              <Text style={styles.cardTitle}>{getMonthLabel(month.key)}</Text>
              <Text style={styles.cardText}>{t('parent.attendance.absenceCount', { count: month.absentCount })}</Text>
            </TouchableOpacity>
          ))}

          {currentMonth ? <Text style={styles.sectionTitle}>{t('parent.attendance.dayDetailTitle', { month: getMonthLabel(currentMonth) })}</Text> : null}
          {days.length === 0 ? (
            <EmptyState icon="📅" title={t('parent.attendance.noRecordsTitle')} desc={t('parent.attendance.noRecordsDesc')} />
          ) : (
            days.map((item) => <AttendanceDay key={`${item.tarih}_${item.cocukId}`} item={item} t={t} />)
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

function AttendanceDay({ item, t }) {
  const absent = isAbsentStatus(item.durum);
  const isLate = String(item.durum || '').toLowerCase() === 'gec';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{formatDisplayDate(item.tarih)}</Text>
      <Text
        style={[
          styles.cardText,
          {
            color: absent ? THEME.red : isLate ? THEME.orange : THEME.green,
            fontWeight: '900',
          },
        ]}
      >
        {t('parent.attendance.status.label')}: {getStatusLabel(item.durum, t)}
      </Text>
      {item.not ? <Text style={styles.cardText}>{t('parent.attendance.note')}: {item.not}</Text> : null}
    </View>
  );
}
