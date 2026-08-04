// ============================================================
// YUMURCAK — TeacherEventsScreen.js
// FAZ 3: Öğretmen sadece kendi sınıfına etkinlik oluşturur
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate, todayString } from './teacherShared';
import { parseChildBirthDate, normalizeChildBirthDate, formatChildBirthDate } from '../../utils/childDates';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function TeacherEventsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, events } = useTeacherData();
  const [showForm, setShowForm] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [tarih, setTarih] = useState(formatChildBirthDate(todayString()));
  const [saat, setSaat] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const classEvents = useMemo(() => {
    if (!currentClass?.id) return [];
    return events
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        if (Array.isArray(item.sinifIds)) return item.sinifIds.includes(currentClass.id);
        if (item.sinifId) return item.sinifId === currentClass.id;
        return true; // genel etkinlik
      })
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [events, currentClass?.id, kresId]);

  if (loading) return <LoadingState text="Etkinlikler hazırlanıyor..." />;

  const save = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!baslik.trim() || !tarih.trim()) return Alert.alert('Eksik Bilgi', 'Başlık ve tarih zorunludur.');

    if (!parseChildBirthDate(tarih)) {
      Alert.alert('Hata', 'Tarihi 25.06.2026 formatında gir.');
      return;
    }

    setSaving(true);
    try {
      await push(ref(database, 'etkinlikler'), {
        kresId: kresId || currentClass.kresId || '',
        sinifId: currentClass.id,
        sinifIds: [currentClass.id],
        olusturanId: teacherId || '',
        olusturanRol: 'ogretmen',
        baslik: baslik.trim(),
        tarih: normalizeChildBirthDate(tarih),
        saat: saat.trim(),
        aciklama: aciklama.trim(),
        aktif: true,
        createdAt: Date.now(),
      });
      setBaslik('');
      setTarih(formatChildBirthDate(todayString()));
      setSaat('');
      setAciklama('');
      setShowForm(false);
      setSuccessToast(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Etkinlik kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message="Etkinlik sınıf velilerine eklendi"
        onHide={() => setSuccessToast(false)}
      />

      <ScreenHeader
        navigation={navigation}
        title="Etkinlikler"
        subtitle={currentClass?.ad || 'Sınıfım'}
        rightText={showForm ? 'Kapat' : '+ Ekle'}
        onRightPress={() => setShowForm((v) => !v)}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sınıf Etkinliği</Text>
            <TextInput style={styles.input} value={baslik} onChangeText={setBaslik} placeholder="Etkinlik başlığı" placeholderTextColor="#999" />
            <TextInput style={styles.input} value={tarih} onChangeText={setTarih} placeholder="20.06.2026" placeholderTextColor="#999" />
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
              <Text style={styles.badge}>{item.sinifId ? 'Sınıf Etkinliği' : 'Genel Etkinlik'}</Text>
            </View>
          ))
        )}
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  formCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  formTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  date: { color: THEME.primary, fontWeight: '900', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  desc: { color: THEME.muted, marginTop: 6, lineHeight: 19, fontWeight: '600' },
  badge: { color: THEME.primary, fontWeight: '900', marginTop: 10, fontSize: 12 },
});
