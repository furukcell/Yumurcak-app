// ============================================================
// YUMURCAK — TeacherAnnouncementsScreen.js
// Öğretmen duyuruları görür
// ============================================================
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate } from './teacherShared';

export default function TeacherAnnouncementsScreen() {
  const navigation = useNavigation();
  const { loading, kresId, announcements } = useTeacherData();

  const visible = useMemo(() => {
    return announcements
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')))
      .slice(0, 20);
  }, [announcements, kresId]);

  if (loading) return <LoadingState text="Duyurular hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Duyurular" subtitle="Kurum bilgilendirmeleri" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visible.length === 0 ? (
          <EmptyState icon="📣" title="Duyuru yok" desc="Yeni duyuru eklendiğinde burada görünür." />
        ) : (
          visible.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.date}>📅 {formatDate(item.tarih || item.createdAt)}</Text>
              <Text style={styles.title}>{item.baslik || item.title || 'Duyuru'}</Text>
              <Text style={styles.body}>{item.icerik || item.metin || item.aciklama || '-'}</Text>
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
  date: { color: THEME.primary, fontWeight: '900', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  body: { color: THEME.muted, marginTop: 6, lineHeight: 19, fontWeight: '600' },
});
