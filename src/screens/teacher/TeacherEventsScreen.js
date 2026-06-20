// ============================================================
// YUMURCAK — TeacherEventsScreen.js
// Öğretmen sınıf etkinlikleri görüntüleme / basit oluşturma
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate, todayString } from './teacherShared';

export default function TeacherEventsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, events } = useTeacherData();
  const [showForm, setShowForm] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [tarih, setTarih] = useState(todayString());
  const [saat, setSaat] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [saving, setSaving] = useState(false);

  const classEvents = useMemo(() => {
    if (!currentClass?.id) return [];
    return events
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => Array.isArray(item.sinifIds) && item.sinifIds.includes(currentClass.id))
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [events, currentClass?.id, kresId]);

  if (loading) return <LoadingState text="Etkinlikler hazırlanıyor..." />;

  const save = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!baslik || !tarih) return Alert.alert('Eksik Bilgi', 'Başlık ve tarih zorunludur.');
    setSaving(true);
    try {
      await push(ref(database, 'etkinlikler'), {
        kresId: kresId || currentClass.kresId || '',
        baslik,
        tarih,
        saat,
        sinifIds: [currentClass.id],
        aciklama,
        aktif: true,
        olusturanId: teacherId || '',
        createdAt: Date.now(),
      });
      setBaslik('');
      setTarih(todayString());
      setSaat('');
      setAciklama('');
      setShowForm(false);
      Alert.alert('Başarılı', 'Etkinlik oluşturuldu.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Etkinlik kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        navigation={navigation}
        title="Etkinlikler"
        subtitle={currentClass?.ad || 'Sınıfım'}
        rightText={showForm ? 'Kapat' : '+ Ekle'}
        onRightPress={() => setShowForm((v) => !v)}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showForm ? (
          <View style={styles.formCard}>
            <TextInput style={styles.input} value={baslik} onChangeText={setBaslik} placeholder="Etkinlik başlığı" placeholderTextColor="#999" />
            <TextInput style={styles.input} value={tarih} onChangeText={setTarih} placeholder="2026-06-20" placeholderTextColor="#999" />
            <TextInput style={styles.input} value={saat} onChangeText={setSaat} placeholder="Saat (opsiyonel)" placeholderTextColor="#999" />
            <TextInput style={[styles.input, styles.textArea]} value={aciklama} onChangeText={setAciklama} placeholder="Açıklama" multiline placeholderTextColor="#999" />
            <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Etkinliği Kaydet</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {classEvents.length === 0 ? (
          <EmptyState icon="🎉" title="Etkinlik yok" desc="Sınıf etkinliği eklendiğinde burada görünür." />
        ) : (
          classEvents.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.date}>📅 {formatDate(item.tarih)} {item.saat ? `· ${item.saat}` : ''}</Text>
              <Text style={styles.title}>{item.baslik || 'Etkinlik'}</Text>
              {item.aciklama ? <Text style={styles.desc}>{item.aciklama}</Text> : null}
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
  formCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  date: { color: THEME.primary, fontWeight: '900', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  desc: { color: THEME.muted, marginTop: 6, lineHeight: 19, fontWeight: '600' },
});
