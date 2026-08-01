// ============================================================
// YUMURCAK — MonthlyCalendarView.js
// Aylık gün-bazlı ekranlar (Yemek Listesi, Ders Programı, ...) için
// ORTAK Liste / Takvim görünüm toggle'ı.
//
// Bu component sadece "hangi gün" sorusuna cevap verir; günün
// içeriğini (kahvaltı/öğle/ara öğün ya da etkinlik/açıklama gibi)
// düzenleme formu, bunu kullanan ekranda ayrı bir Modal içinde kalır.
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const WEEKDAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function toMondayFirstIndex(jsWeekday) {
  return (jsWeekday + 6) % 7;
}

export default function MonthlyCalendarView({
  days,
  view,
  onChangeView,
  selectedDateKey,
  onSelectDay,
  theme,
  renderDayPreview,
}) {
  const palette = theme || { primary: '#6C3DEB', primarySoft: '#EFE8FF', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8', bg: '#F8F6FF' };
  const leadingBlanks = days.length ? toMondayFirstIndex(days[0].weekday) : 0;
  const cells = [...Array(leadingBlanks).fill(null), ...days];
  const today = todayKey();

  return (
    <View>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: palette.bg, borderColor: palette.border }, view === 'list' && { backgroundColor: palette.primary, borderColor: palette.primary }]}
          onPress={() => onChangeView('list')}
          activeOpacity={0.85}
        >
          <Text style={[styles.toggleText, { color: palette.primary }, view === 'list' && styles.toggleTextActive]}>📋 Liste</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: palette.bg, borderColor: palette.border }, view === 'calendar' && { backgroundColor: palette.primary, borderColor: palette.primary }]}
          onPress={() => onChangeView('calendar')}
          activeOpacity={0.85}
        >
          <Text style={[styles.toggleText, { color: palette.primary }, view === 'calendar' && styles.toggleTextActive]}>🗓️ Takvim</Text>
        </TouchableOpacity>
      </View>

      {view === 'calendar' ? (
        <View style={[styles.calendarCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={[styles.weekdayLabel, { color: palette.muted }]}>{label}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const selected = day.dateKey === selectedDateKey;
              const isToday = day.dateKey === today;
              return (
                <TouchableOpacity
                  key={day.dateKey}
                  style={[
                    styles.dayCell,
                    isToday && { backgroundColor: palette.primarySoft, borderRadius: 12 },
                    selected && { borderWidth: 2, borderColor: palette.primary, borderRadius: 12 },
                  ]}
                  onPress={() => onSelectDay(day.dateKey)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayNumber, { color: palette.text }, selected && { color: palette.primary }]}>{day.day}</Text>
                  {day.hasContent ? <View style={[styles.dot, { backgroundColor: palette.primary }]} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <ScrollView style={styles.listWrap} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {days.map((day) => {
            const selected = day.dateKey === selectedDateKey;
            return (
              <TouchableOpacity
                key={day.dateKey}
                style={[
                  styles.listRow,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  selected && { borderWidth: 2, borderColor: palette.primary },
                ]}
                onPress={() => onSelectDay(day.dateKey)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.listDayLabel, { color: palette.text }]}>{day.label}</Text>
                  {renderDayPreview ? renderDayPreview(day) : null}
                </View>
                {day.hasContent ? <View style={[styles.dot, { backgroundColor: palette.primary }]} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  toggleText: { fontWeight: '900', fontSize: 13 },
  toggleTextActive: { color: '#FFF' },
  calendarCard: { borderRadius: 20, padding: 12, marginBottom: 14, borderWidth: 1 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 3 },
  dayNumber: { fontWeight: '800', fontSize: 13 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  listWrap: { maxHeight: 440, marginBottom: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  listDayLabel: { fontWeight: '900', fontSize: 14 },
});
