// ============================================================
// YUMURCAK — TeacherScheduleScreen.js
// Öğretmen ders programı görüntüleme / basit giriş
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ref, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState } from './teacherShared';

const DAYS = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
const LABELS = { pazartesi: 'Pazartesi', sali: 'Salı', carsamba: 'Çarşamba', persembe: 'Perşembe', cuma: 'Cuma' };

export default function TeacherScheduleScreen() {
  const navigation = useNavigation();
  const { loading, kresId, currentClass, schedules } = useTeacherData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const program = useMemo(() => {
    if (!currentClass?.id) return null;
    return schedules.find((item) => item.sinifId === currentClass.id || item.id === currentClass.id) || null;
  }, [schedules, currentClass?.id]);

  if (loading) return <LoadingState text="Ders programı hazırlanıyor..." />;

  const source = editing ? draft : (program?.gunler || {});

  const startEdit = () => {
    setDraft(program?.gunler || {});
    setEditing(true);
  };

  const save = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    setSaving(true);
    try {
      await set(ref(database, `dersProgramlari/${currentClass.id}`), {
        kresId: kresId || currentClass.kresId || '',
        sinifId: currentClass.id,
        gunler: draft,
        updatedAt: Date.now(),
      });
      setEditing(false);
      Alert.alert('Başarılı', 'Ders programı kaydedildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Ders programı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day, value) => setDraft((prev) => ({ ...prev, [day]: value }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        navigation={navigation}
        title="Ders Programı"
        subtitle={currentClass?.ad || 'Sınıfım'}
        rightText={editing ? 'Kaydet' : 'Düzenle'}
        onRightPress={editing ? save : startEdit}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="📚" title="Sınıf bulunamadı" desc="Öğretmen bir sınıfa bağlanınca program görüntülenir." />
        ) : (
          DAYS.map((day) => (
            <View key={day} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{LABELS[day]}</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={String(source[day] || '')}
                  onChangeText={(text) => updateDay(day, text)}
                  placeholder="Örn: 09:00 Serbest oyun, 10:00 Müzik"
                  multiline
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.programText}>{source[day] || 'Program girilmemiş.'}</Text>
              )}
            </View>
          ))
        )}
        {saving ? <ActivityIndicator color={THEME.primary} style={{ marginTop: 12 }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  dayCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  dayTitle: { color: THEME.primary, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  programText: { color: THEME.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  input: { backgroundColor: THEME.bg, borderRadius: 14, minHeight: 82, padding: 12, color: THEME.text, borderWidth: 1, borderColor: THEME.border, textAlignVertical: 'top' },
});
