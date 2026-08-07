// ============================================================
// YUMURCAK — TeacherDutyRosterScreen.js
// Yöneticinin yayınladığı "Nöbet Çizelgesi"nin öğretmen tarafındaki
// SALT OKUNUR görünümü. Öğretmen yazamaz/düzenleyemez, sadece hangi
// tarihte kimin nöbetçi olduğunu şablon olarak görür.
// Veri modeli AdminMonthlyDutyRosterScreen ile AYNI (nobetCizelgeleri,
// kaynak: 'admin_aylik', gün-bazlı kayıt) — sadece bu ekran yazmıyor.
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import { THEME, useTeacherData, ScreenHeader, LoadingState } from './teacherShared';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import { getDaysOfMonth, getMonthKey, getMonthLabel, shiftMonth } from '../../services/monthlyDocuments';

const KAYNAK = 'admin_aylik';

function hasDutyContent(value) {
  if (!value) return false;
  return !!(String(value.personel || '').trim() || String(value.not || '').trim());
}

function dutyPreview(value) {
  if (!hasDutyContent(value)) return '';
  return [value?.personel, value?.not].filter(Boolean).join(' · ');
}

export default function TeacherDutyRosterScreen({ navigation }) {
  const { loading, kresId, dutyRoster } = useTeacherData();

  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(() => getDaysOfMonth(monthDate), [monthDate]);
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [view, setView] = useState('list');
  const [selectedDateKey, setSelectedDateKey] = useState('');

  // Bu ay için yayınlanmış (aktif, admin_aylik) kayıtları tarihe göre indexliyoruz.
  const values = useMemo(() => {
    const map = {};
    dutyRoster
      .filter((item) => item?.aktif !== false && item?.kaynak === KAYNAK && item?.ayKey === monthKey)
      .forEach((item) => {
        map[item.tarih] = { personel: item.personel || '', not: item.not || '' };
      });
    return map;
  }, [dutyRoster, monthKey]);

  const publishedCount = useMemo(() => Object.values(values).filter(hasDutyContent).length, [values]);

  const daysWithContent = useMemo(
    () => days.map((day) => ({ ...day, hasContent: hasDutyContent(values[day.dateKey]) })),
    [days, values]
  );

  function changeMonth(direction) {
    setMonthDate(shiftMonth(monthDate, direction));
    setSelectedDateKey('');
  }

  if (loading) return <LoadingState text="Nöbet çizelgesi hazırlanıyor..." />;

  const selectedDay = days.find((day) => day.dateKey === selectedDateKey) || null;
  const selectedValue = values[selectedDateKey] || { personel: '', not: '' };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Nöbet Çizelgesi" subtitle="Yönetici tarafından yayınlanan plan" navigation={navigation} />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.monthCard}>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)} activeOpacity={0.8}>
            <Text style={styles.monthButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Text style={styles.monthHint}>{publishedCount > 0 ? `${publishedCount} gün planlı` : 'Bu ay için plan yok'}</Text>
          </View>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)} activeOpacity={0.8}>
            <Text style={styles.monthButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {!kresId ? null : (
          <MonthlyCalendarView
            days={daysWithContent}
            view={view}
            onChangeView={setView}
            selectedDateKey={selectedDateKey}
            onSelectDay={setSelectedDateKey}
            theme={THEME}
            renderDayPreview={(day) => {
              const preview = dutyPreview(values[day.dateKey]);
              return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>Boş</Text>;
            }}
          />
        )}

        {publishedCount === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Bu ay için nöbet çizelgesi yayınlanmamış</Text>
            <Text style={styles.emptyDesc}>Yönetici yayınladığında burada görünecek.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDateKey('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDay?.label}</Text>
              <TouchableOpacity onPress={() => setSelectedDateKey('')} activeOpacity={0.8}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {hasDutyContent(selectedValue) ? (
              <>
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>👤 Nöbetçi Personel</Text>
                  <Text style={styles.modalRowValue}>{selectedValue.personel || '-'}</Text>
                </View>
                {selectedValue.not ? (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>📝 Not</Text>
                    <Text style={styles.modalRowValue}>{selectedValue.not}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.modalEmptyText}>Bu gün için nöbetçi bilgisi girilmemiş.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 40 },
  monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { color: THEME.primary, fontSize: 26, fontWeight: '900', marginTop: -2 },
  monthCenter: { alignItems: 'center' },
  monthLabel: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  monthHint: { color: THEME.muted, fontWeight: '700', marginTop: 3, fontSize: 12 },
  previewText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 3 },
  previewEmpty: { color: '#C7C9D6', fontWeight: '700', fontSize: 12, marginTop: 3 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: THEME.border, marginTop: 4 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: THEME.muted, marginTop: 5, textAlign: 'center', lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  modalClose: { color: THEME.primary, fontWeight: '900' },
  modalRow: { marginBottom: 14 },
  modalRowLabel: { fontSize: 12, fontWeight: '900', color: THEME.muted, marginBottom: 4, textTransform: 'uppercase' },
  modalRowValue: { fontSize: 16, fontWeight: '800', color: THEME.text, lineHeight: 22 },
  modalEmptyText: { color: THEME.muted, fontWeight: '700', textAlign: 'center', paddingVertical: 10 },
});
