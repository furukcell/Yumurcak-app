// ============================================================
// YUMURCAK — TeacherMealsScreen.js
// Öğretmen yemek listesi görüntüleme
// ============================================================
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate } from './teacherShared';

export default function TeacherMealsScreen() {
  const navigation = useNavigation();
  const { loading, kresId, meals } = useTeacherData();

  const visibleMeals = useMemo(() => {
    return meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .sort((a, b) => String(b.baslangicTarihi || b.createdAt || '').localeCompare(String(a.baslangicTarihi || a.createdAt || '')));
  }, [meals, kresId]);

  if (loading) return <LoadingState text="Yemek listesi hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Yemek Listesi" subtitle="Kurum menüsü" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visibleMeals.length === 0 ? (
          <EmptyState icon="🍽️" title="Yemek listesi yok" desc="Yönetici yemek listesi eklediğinde burada görünür." />
        ) : (
          visibleMeals.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.type}>{item.tip === 'aylik' ? '🗓️ Aylık' : '📅 Haftalık'}</Text>
              <Text style={styles.title}>{item.baslik || 'Yemek Listesi'}</Text>
              <Text style={styles.date}>{formatDate(item.baslangicTarihi)} - {formatDate(item.bitisTarihi)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  type: { color: THEME.primary, fontWeight: '900', marginBottom: 7 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  date: { color: THEME.muted, marginTop: 5, fontWeight: '700' },
});
