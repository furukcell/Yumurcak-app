// ============================================================
// YUMURCAK — TeacherMedicalScreen.js
// Öğretmen medikal bilgileri görür
// ============================================================
import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';

export default function TeacherMedicalScreen() {
  const navigation = useNavigation();
  const { loading, classChildren, medicalMap } = useTeacherData();

  if (loading) return <LoadingState text="Medikal bilgiler hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Medikal Bilgiler" subtitle="Alerji ve ilaç takibi" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="🩺" title="Çocuk yok" desc="Sınıfa çocuk bağlanınca medikal bilgiler görünür." />
        ) : (
          classChildren.map((child) => {
            const info = medicalMap[child.id] || {};
            return (
              <View key={child.id} style={styles.card}>
                <Text style={styles.name}>{getChildName(child)}</Text>
                <Text style={styles.label}>Alerjiler</Text>
                <Text style={styles.value}>{info.alerjiler || 'Bilgi yok'}</Text>
                <Text style={styles.label}>İlaçlar</Text>
                <Text style={styles.value}>{info.ilaclar || 'Bilgi yok'}</Text>
                <Text style={styles.label}>Notlar</Text>
                <Text style={styles.value}>{info.notlar || 'Bilgi yok'}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  name: { fontSize: 17, fontWeight: '900', color: THEME.primary, marginBottom: 10 },
  label: { color: THEME.muted, fontWeight: '900', marginTop: 8 },
  value: { color: THEME.text, fontWeight: '700', marginTop: 3, lineHeight: 19 },
});
