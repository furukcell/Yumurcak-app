// ============================================================
// YUMURCAK — TeacherChildrenScreen.js
// Öğretmenin sınıfındaki çocuklar
// ============================================================
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName, formatDate } from './teacherShared';

export default function TeacherChildrenScreen() {
  const navigation = useNavigation();
  const { loading, currentClass, classChildren } = useTeacherData();

  if (loading) return <LoadingState text="Çocuklar hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Çocuklarım" subtitle={currentClass?.ad || 'Sınıfım'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="👧" title="Sınıfta çocuk yok" desc="Yönetici çocukları sınıfa bağladığında burada görünecek." />
        ) : (
          classChildren.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={styles.card}
              onPress={() => navigation.navigate('ChildReport', { child })}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}><Text style={styles.avatarText}>👧</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{getChildName(child)}</Text>
                <Text style={styles.sub}>Doğum: {formatDate(child.dogumTarihi)}</Text>
              </View>
              <Text style={styles.action}>Rapor Gir ›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 25 },
  name: { fontSize: 16, fontWeight: '900', color: THEME.text },
  sub: { color: THEME.muted, marginTop: 3, fontWeight: '600' },
  action: { color: THEME.primary, fontWeight: '900' },
});
