// ============================================================
// YUMURCAK — ParentScheduleScreen.js
// FAZ 4 — Veli tarafında ders programı ekranı yoktu, bu ekran onu ekliyor.
// Admin/öğretmen tarafında yayınlanan aylık ders programını, çocuğun
// sınıfına göre salt okunur gösterir + PDF indirme/paylaşma.
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME, toDateKey, getMonthKey } from './parentShared';
import { ETKINLIK_KATEGORILERI } from '../../constants';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';

const NODE_PATH = 'dersProgramlari';
const KAYNAK = 'admin_aylik';
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const classIdOf = (item) => item?.sinifId || item?.classId || '';

function getCategoryMeta(kategori) {
  const found = ETKINLIK_KATEGORILERI.find((item) => item.key === kategori);
  const colorKey = { sanat: 'secondary', drama: 'secondary', muzik: 'blue', matematik: 'blue', hareket: 'green', fen: 'orange', dil: 'primary', diger: 'muted' }[kategori] || 'primary';
  return { label: found?.label || kategori || '', emoji: found?.emoji || '📌', color: THEME[colorKey] || THEME.primary };
}
function parseTimeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]); const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}
function formatMonthLabel(monthKey, t) {
  const parts = String(monthKey || '').split('-'); const year = parts[0]; const monthIndex = Number(parts[1]) - 1;
  const monthName = MONTH_KEYS[monthIndex] ? t(`common.months.${MONTH_KEYS[monthIndex]}`) : t('parent.schedule.monthFallback');
  return `${monthName} ${year || ''}`.trim();
}
function shiftMonthKey(monthKey, delta) {
  const [yearStr, monthStr] = String(monthKey || '').split('-'); const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function formatSelectedDateLabel(dateKey, isToday, t) {
  const [year, month, day] = String(dateKey || '').split('-'); const base = year && month && day ? `${day}.${month}.${year}` : dateKey;
  return isToday ? `${t('common.today')} · ${base}` : base;
}
function buildCalendarCells(monthKey) {
  const [yearStr, monthStr] = String(monthKey || '').split('-'); const year = Number(yearStr); const monthIndex = Number(monthStr) - 1;
  const firstOfMonth = new Date(year, monthIndex, 1); const daysInMonth = new Date(year, monthIndex + 1, 0).getDate(); const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i -= 1) cells.push({ date: new Date(year, monthIndex, -i), inMonth: false });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ date: new Date(year, monthIndex, day), inMonth: true });
  while (cells.length < 42) { const last = cells[cells.length - 1].date; cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false }); }
  return cells;
}

export default function ParentScheduleScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const records = useNodeList(NODE_PATH, kresId);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [displayMonthKey, setDisplayMonthKey] = useState(() => getMonthKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const scheduledDateSet = useMemo(() => {
    const set = new Set();
    records.forEach((item) => {
      if (item.aktif === false || item.kaynak !== KAYNAK) return;
      const itemClassId = classIdOf(item);
      if (itemClassId && itemClassId !== sinifId) return;
      const entries = Array.isArray(item.etkinlikler) ? item.etkinlikler : [];
      if (entries.some((entry) => String(entry?.etkinlik || '').trim()) && item.tarih) set.add(item.tarih);
    });
    return set;
  }, [records, sinifId]);

  const selectedDayEntries = useMemo(() => {
    // Öncelik: öğretmenin yayınladığı program. Öğretmen programı yoksa admin programı.
    const teacherMatches = records.filter((item) => {
      if (item.aktif === false || item.kaynak !== 'ogretmen_aylik' || item.tarih !== selectedDateKey) return false;
      const itemClassId = classIdOf(item);
      return !itemClassId || itemClassId === sinifId;
    });
    const adminMatches = records.filter((item) => {
      if (item.aktif === false || item.kaynak !== KAYNAK || item.tarih !== selectedDateKey) return false;
      const itemClassId = classIdOf(item);
      return !itemClassId || itemClassId === sinifId;
    });
    const pickFreshest = (matches) => matches.sort((a, b) => {
      const aHas = Array.isArray(a.etkinlikler) && a.etkinlikler.some((entry) => String(entry?.etkinlik || '').trim()) ? 1 : 0;
      const bHas = Array.isArray(b.etkinlikler) && b.etkinlikler.some((entry) => String(entry?.etkinlik || '').trim()) ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
    })[0] || null;
    const match = pickFreshest(teacherMatches) || pickFreshest(adminMatches);
    const list = Array.isArray(match?.etkinlikler) ? match.etkinlikler : [];
    return list.filter((entry) => String(entry?.etkinlik || '').trim()).map((entry, index) => ({
      id: `${match?.id || 'ders'}-${index}`, baslik: entry.etkinlik, kategori: entry.kategori || '', tema: entry.tema || '', aciklama: entry.aciklama || '',
      baslangicSaati: entry.baslangicSaati || '', bitisSaati: entry.bitisSaati || '',
      saat: entry.baslangicSaati ? `${entry.baslangicSaati}${entry.bitisSaati ? ` - ${entry.bitisSaati}` : ''}` : '',
    })).sort((a, b) => {
      const aStart = parseTimeToMinutes(a.baslangicSaati); const bStart = parseTimeToMinutes(b.baslangicSaati);
      if (aStart === null && bStart === null) return 0; if (aStart === null) return 1; if (bStart === null) return -1; return aStart - bStart;
    });
  }, [records, sinifId, selectedDateKey]);

  const calendarCells = useMemo(() => buildCalendarCells(displayMonthKey), [displayMonthKey]);
  if (loading) return <LoadingScreen text={t('parent.schedule.loading')} />;

  return (
    <ScreenShell title={t('parent.schedule.title')} emoji="📘" navigation={navigation}>
      {!selectedChild ? <EmptyState icon="👧" title={t('parent.schedule.noChildTitle')} desc={t('parent.schedule.noChildDesc')} /> : (
        <>
          <View style={localStyles.calCard}>
            <View style={localStyles.calHead}>
              <TouchableOpacity style={localStyles.calNavBtn} onPress={() => setDisplayMonthKey((prev) => shiftMonthKey(prev, -1))} activeOpacity={0.7}><Text style={localStyles.calNavText}>‹</Text></TouchableOpacity>
              <Text style={localStyles.calMonthLabel}>{formatMonthLabel(displayMonthKey, t)}</Text>
              <TouchableOpacity style={localStyles.calNavBtn} onPress={() => setDisplayMonthKey((prev) => shiftMonthKey(prev, 1))} activeOpacity={0.7}><Text style={localStyles.calNavText}>›</Text></TouchableOpacity>
            </View>
            <View style={localStyles.calDowRow}>{WEEKDAY_KEYS.map((key) => <Text key={key} style={localStyles.calDow}>{t(`common.weekdaysShort.${key}`)}</Text>)}</View>
            <View style={localStyles.calGrid}>
              {calendarCells.map(({ date, inMonth }, index) => {
                const dateKey = toDateKey(date); const isSelected = dateKey === selectedDateKey; const isToday = dateKey === todayKey; const hasSchedule = scheduledDateSet.has(dateKey);
                return <TouchableOpacity key={`${dateKey}-${index}`} style={[localStyles.calDayCell, isSelected ? { backgroundColor: THEME.primary } : null, !isSelected && isToday ? { borderWidth: 1.5, borderColor: THEME.primary } : null]} onPress={() => setSelectedDateKey(dateKey)} activeOpacity={0.7}>
                  <Text style={[localStyles.calDayText, !inMonth ? { color: THEME.border } : null, isSelected ? { color: '#FFFFFF' } : null]}>{date.getDate()}</Text>
                  {hasSchedule ? <View style={[localStyles.calDot, { backgroundColor: isSelected ? '#FFFFFF' : THEME.primary }]} /> : null}
                </TouchableOpacity>;
              })}
            </View>
          </View>
          <MonthlyDocumentPdfBar kresId={kresId} nodePath={NODE_PATH} kaynak={KAYNAK} docType="ders" monthKey={displayMonthKey} monthLabel={formatMonthLabel(displayMonthKey, t)} theme={THEME} />
          <View style={localStyles.selectedDatePill}><Text style={localStyles.selectedDatePillText}>📅 {formatSelectedDateLabel(selectedDateKey, selectedDateKey === todayKey, t)}</Text></View>
          {selectedDayEntries.length === 0 ? <EmptyState icon="📘" title={t('parent.schedule.emptyDayTitle')} desc={t('parent.schedule.emptyDayDesc')} /> : (
            <View style={localStyles.timeline}>{selectedDayEntries.map((entry, index) => {
              const isLast = index === selectedDayEntries.length - 1; const meta = getCategoryMeta(entry.kategori);
              return <View key={entry.id} style={localStyles.timelineItem}><View style={localStyles.timelineRail}><View style={[localStyles.timelineDot, { backgroundColor: meta.color, borderColor: meta.color }]} />{!isLast ? <View style={[localStyles.timelineLine, { backgroundColor: THEME.border }]} /> : null}</View>
                <View style={[styles.card, localStyles.timelineCard]}><View style={localStyles.timelineCardHead}><Text style={[localStyles.categoryBadge, { color: meta.color, backgroundColor: THEME.primarySoft }]}>{meta.emoji} {meta.label}</Text>{entry.saat ? <Text style={localStyles.timelineTime}>{entry.saat}</Text> : null}</View><Text style={[styles.cardTitle, { marginTop: 7, fontSize: 14.5 }]}>{entry.baslik}</Text>{entry.tema ? <Text style={[styles.cardText, { marginTop: 3 }]}>🎨 {t('parent.schedule.theme')}: {entry.tema}</Text> : null}{entry.aciklama ? <Text style={[styles.cardText, { marginTop: 3 }]}>{entry.aciklama}</Text> : null}</View>
              </View>;
            })}</View>
          )}
        </>
      )}
    </ScreenShell>
  );
}

const localStyles = {
  calCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calNavBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft },
  calNavText: { color: THEME.primary, fontWeight: '900', fontSize: 17, marginTop: -2 },
  calMonthLabel: { color: THEME.text, fontWeight: '900', fontSize: 14.5 },
  calDowRow: { flexDirection: 'row', marginBottom: 4 }, calDow: { flex: 1, textAlign: 'center', color: THEME.muted, fontWeight: '800', fontSize: 10.5, paddingBottom: 4 }, calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginVertical: 1 }, calDayText: { color: THEME.text, fontWeight: '800', fontSize: 12.5 }, calDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  selectedDatePill: { alignSelf: 'flex-start', backgroundColor: THEME.primarySoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 12, marginTop: 4 }, selectedDatePillText: { color: THEME.primary, fontWeight: '800', fontSize: 12 }, timeline: { marginTop: 2 }, timelineItem: { flexDirection: 'row', alignItems: 'stretch' }, timelineRail: { width: 22, alignItems: 'center' }, timelineDot: { width: 13, height: 13, borderRadius: 7, marginTop: 5, borderWidth: 2.5 }, timelineLine: { width: 2, flex: 1, marginTop: 2, marginBottom: -8, opacity: 0.5, borderRadius: 1 }, timelineCard: { flex: 1, marginLeft: 9, marginBottom: 10 }, timelineCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, categoryBadge: { fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, overflow: 'hidden' }, timelineTime: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
};