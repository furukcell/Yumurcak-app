import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  blue: '#0096C7',
  blueSoft: '#E3F7FF',
  text: '#191A23',
  muted: '#707386',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const MEALS = [
  { key: 'kahvalti', title: 'Kahvaltı', icon: '🥐', accent: '#FFF4DE', border: '#FFE2A8' },
  { key: 'ogle', title: 'Öğle', icon: '🍲', accent: '#EAF7FF', border: '#BEEAFF' },
  { key: 'araOgun', title: 'Ara Öğün', icon: '🍎', accent: '#FFF0F3', border: '#FFD2DC' },
];

function getMealText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.text || value.aciklama || '';
}

function getMealPhoto(value) {
  if (!value || typeof value === 'string') return '';
  return value.fotoUrl || value.photoUrl || value.imageUrl || '';
}

function formatDate(value) {
  const raw = String(value || '').slice(0, 10);
  const parts = raw.split('-');
  if (parts.length !== 3) return raw || '-';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export { MEALS, getMealText, getMealPhoto };

export default function MealTodayCard({ item, className, title, editable = false, onMealPress }) {
  const ogunler = item?.ogunler || {};
  const isEmpty = !MEALS.some((meal) => getMealText(ogunler[meal.key]) || getMealPhoto(ogunler[meal.key]));

  return (
    <View style={styles.card}>
      <View style={styles.chipRow}>
        <Text style={styles.dateChip}>📅 {formatDate(item?.tarih || item?.baslangicTarihi)}</Text>
        <Text style={styles.typeChip}>{item?.kaynak === 'admin_aylik' ? 'Aylık Liste' : item?.sinifId ? 'Sınıf Listesi' : 'Kurum Listesi'}</Text>
        {className ? <Text style={styles.classChip}>★ {className}</Text> : null}
      </View>

      <Text style={styles.title}>{title || item?.baslik || 'Günlük Yemek Listesi'}</Text>

      {isEmpty ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>Bugün için öğün bekleniyor</Text>
          <Text style={styles.emptyDesc}>Öğretmen kahvaltı, öğle veya ara öğün ekledikçe burada görünür.</Text>
        </View>
      ) : null}

      {MEALS.map((meal) => {
        const value = ogunler[meal.key];
        const text = getMealText(value);
        const photo = getMealPhoto(value);
        const filled = !!text || !!photo;

        return (
          <TouchableOpacity
            key={meal.key}
            style={[styles.mealCard, { backgroundColor: meal.accent, borderColor: meal.border }, !filled && styles.mealCardEmpty]}
            activeOpacity={editable ? 0.86 : 1}
            onPress={editable && onMealPress ? () => onMealPress(meal.key) : undefined}
          >
            <View style={styles.iconBubble}>
              <Text style={styles.icon}>{meal.icon}</Text>
            </View>

            <View style={styles.mealTextBox}>
              <Text style={styles.mealTitle}>{meal.title}</Text>
              <Text style={[styles.mealDesc, !filled && styles.emptyMealDesc]} numberOfLines={2}>
                {text || (editable ? 'Ekle / güncelle' : 'Henüz girilmedi')}
              </Text>
              {editable ? <Text style={styles.editHint}>{filled ? 'Düzenle' : '+ Öğün ekle'}</Text> : null}
            </View>

            {photo ? (
              <Image source={{ uri: photo }} style={styles.mealPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.emptyPhotoBox}>
                <Text style={styles.emptyPhotoIcon}>{filled ? meal.icon : '+'}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  dateChip: { backgroundColor: '#F7F7FB', color: COLORS.muted, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, overflow: 'hidden', fontWeight: '900', fontSize: 12 },
  typeChip: { backgroundColor: COLORS.blueSoft, color: COLORS.blue, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, overflow: 'hidden', fontWeight: '900', fontSize: 12 },
  classChip: { backgroundColor: COLORS.primarySoft, color: COLORS.primary, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, overflow: 'hidden', fontWeight: '900', fontSize: 12 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 14 },
  emptyBox: { backgroundColor: '#F8F6FF', borderRadius: 20, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { color: COLORS.text, fontWeight: '900', fontSize: 15, marginTop: 6 },
  emptyDesc: { color: COLORS.muted, fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  mealCard: { minHeight: 112, borderRadius: 22, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealCardEmpty: { opacity: 0.9 },
  iconBubble: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 28 },
  mealTextBox: { flex: 1, minWidth: 0 },
  mealTitle: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  mealDesc: { color: COLORS.muted, fontWeight: '800', fontSize: 15, marginTop: 5 },
  emptyMealDesc: { color: '#A2A5B6' },
  editHint: { color: COLORS.primary, fontWeight: '900', fontSize: 12, marginTop: 7 },
  mealPhoto: { width: 112, height: 82, borderRadius: 18, marginLeft: 12, backgroundColor: '#fff' },
  emptyPhotoBox: { width: 76, height: 76, borderRadius: 18, marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.62)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  emptyPhotoIcon: { color: COLORS.primary, fontSize: 26, fontWeight: '900' },
});
