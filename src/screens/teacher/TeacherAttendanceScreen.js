// ============================================================
// YUMURCAK — TeacherAttendanceScreen.js
// Öğretmen günlük yoklama girişi
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName, todayString } from './teacherShared';

export default function TeacherAttendanceScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, classChildren, attendance } = useTeacherData();
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState({});

  const today = todayString();

  const todayMap = useMemo(() => {
    const map = {};
    attendance
      .filter((item) => item.tarih === today && item.sinifId === currentClass?.id)
      .forEach((item) => {
        map[item.cocukId] = item.durum;
      });
    return map;
  }, [attendance, currentClass?.id, today]);

  if (loading) return <LoadingState text="Yoklama hazırlanıyor..." />;

  const saveOne = async (child, status) => {
    setLocalStatus((prev) => ({ ...prev, [child.id]: status }));
    setSaving(true);
    try {
      await push(ref(database, 'yoklamalar'), {
        kresId: child.kresId || kresId || '',
        sinifId: child.sinifId || currentClass?.id || '',
        cocukId: child.id,
        ogretmenId: teacherId || '',
        tarih: today,
        durum: status,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Yoklama kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (childId) => localStatus[childId] || todayMap[childId] || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Yoklama" subtitle={today} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="✅" title="Çocuk bulunamadı" desc="Sınıfa çocuk bağlanınca yoklama alınabilir." />
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Bugünkü Yoklama</Text>
              <Text style={styles.infoDesc}>Her çocuk için geldi, gelmedi veya geç seçimi yap.</Text>
            </View>

            {classChildren.map((child) => {
              const status = getStatus(child.id);
              return (
                <View key={child.id} style={styles.card}>
                  <Text style={styles.childName}>{getChildName(child)}</Text>
                  <View style={styles.buttons}>
                    {renderButton(child, 'geldi', 'Geldi', status)}
                    {renderButton(child, 'gelmedi', 'Gelmedi', status)}
                    {renderButton(child, 'gec', 'Geç', status)}
                  </View>
                </View>
              );
            })}
            {saving ? <ActivityIndicator color={THEME.primary} style={{ marginTop: 12 }} /> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  function renderButton(child, value, label, status) {
    const active = status === value;
    return (
      <TouchableOpacity
        style={[styles.statusButton, active && styles.statusButtonActive]}
        onPress={() => saveOne(child, value)}
        activeOpacity={0.85}
      >
        <Text style={[styles.statusText, active && styles.statusTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  infoCard: { backgroundColor: THEME.primarySoft, borderRadius: 18, padding: 15, marginBottom: 14 },
  infoTitle: { fontSize: 16, fontWeight: '900', color: THEME.primaryDark },
  infoDesc: { color: THEME.muted, marginTop: 4, fontWeight: '600' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  childName: { fontSize: 16, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, paddingVertical: 11, borderRadius: 13, backgroundColor: THEME.bg, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  statusButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  statusText: { color: THEME.text, fontWeight: '900' },
  statusTextActive: { color: '#FFF' },
});
