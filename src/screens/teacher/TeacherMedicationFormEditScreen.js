// ============================================================
// YUMURCAK — TeacherMedicationFormEditScreen.js
// FAZ 8: "İlaç Takip Formu" oluşturma ekranı — çocuk seç, ilaç bilgilerini
// gir, veli onayı durumunu işaretle. Günlük uygulama kaydı (kayıtlar)
// TeacherMedicationFormDetailScreen'de tutulur, burada sadece kür bilgisi
// oluşturuluyor.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRoute } from '@react-navigation/native';
import { ref, push, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, EmptyState, getChildName } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import { normalizeChildBirthDate } from '../../utils/childDates';
import { normalizeTimeInput } from '../../utils/timeFormat';
import { createNotification } from '../../services/notificationCenter';

function getChildParentIds(child) {
  const raw = [...(Array.isArray(child?.veliIds) ? child.veliIds : []), child?.veliId, child?.parentId];
  return [...new Set(raw.filter(Boolean))];
}

export default function TeacherMedicationFormEditScreen({ navigation }) {
  const route = useRoute();
  const { kullanici, teacherId, currentClass, kresId, classChildren } = useTeacherData();

  const [cocukId, setCocukId] = useState(route.params?.cocukId || '');
  const [ilacAdi, setIlacAdi] = useState('');
  const [doz, setDoz] = useState('');
  const [uygulamaSekli, setUygulamaSekli] = useState('');
  const [baslangicTarihi, setBaslangicTarihi] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [hatirlaticiSaat, setHatirlaticiSaat] = useState('');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const sortedChildren = useMemo(
    () => [...classChildren].sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr')),
    [classChildren]
  );

  async function handleSave() {
    if (!cocukId) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir çocuk seç.');
      return;
    }
    if (!ilacAdi.trim() || !baslangicTarihi.trim() || !bitisTarihi.trim()) {
      Alert.alert('Eksik Bilgi', 'İlaç adı, başlangıç ve bitiş tarihi zorunludur.');
      return;
    }
    if (hatirlaticiSaat.trim() && !normalizeTimeInput(hatirlaticiSaat)) {
      Alert.alert('Geçersiz Saat', 'Hatırlatma saatini SS:DD formatında gir (örn: 14:30) ya da boş bırak.');
      return;
    }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    try {
      const child = classChildren.find((c) => c.id === cocukId);
      const now = Date.now();
      const newRef = push(ref(database, 'ilacTakipFormlari'));
      await update(newRef, {
        kresId,
        sinifId: currentClass?.id || null,
        cocukId,
        cocukAdi: getChildName(child),
        ilacAdi: ilacAdi.trim(),
        doz: doz.trim(),
        uygulamaSekli: uygulamaSekli.trim(),
        baslangicTarihi: normalizeChildBirthDate(baslangicTarihi),
        bitisTarihi: normalizeChildBirthDate(bitisTarihi),
        hatirlaticiSaat: normalizeTimeInput(hatirlaticiSaat) || null,
        veliOnayi: false,
        onayDurumu: 'bekliyor',
        kayitlar: {},
        aktif: false,
        createdAt: now,
        updatedAt: now,
        olusturanId: teacherId || kullanici?.uid || null,
      });
      setSuccessToast(true);
      setTimeout(() => navigation.goBack(), 700);

      const parentIds = getChildParentIds(child);
      if (parentIds.length > 0) {
        createNotification({
          kresId,
          hedefUserIds: parentIds,
          hedefCocukIds: [cocukId],
          baslik: '💊 İlaç takip formu onayınızı bekliyor',
          mesaj: `${getChildName(child)} için "${ilacAdi.trim()}" ilaç takip formu oluşturuldu, onayınız bekleniyor.`,
          tip: 'ilac_takip',
          routeName: 'ParentMedical',
          createdBy: teacherId || kullanici?.uid || '',
        }).catch((error) => console.log('İlaç bildirimi gönderilemedi:', error));
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Form kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message="İlaç takip formu oluşturuldu" onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title="Yeni İlaç Takip Formu" subtitle={currentClass?.ad || 'Sınıfım'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title="Sınıf ataması yok" desc="Bu özellik için yönetici tarafından bir sınıfa atanman gerekir." />
        ) : (
          <>
            <Text style={styles.fieldLabel}>Çocuk *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 14 }}>
              {sortedChildren.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.chip, cocukId === child.id && styles.chipActive]}
                  onPress={() => setCocukId(child.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, cocukId === child.id && styles.chipTextActive]}>{getChildName(child)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput value={ilacAdi} onChangeText={setIlacAdi} placeholder="İlaç Adı *" placeholderTextColor={THEME.muted} style={styles.input} />
            <TextInput value={doz} onChangeText={setDoz} placeholder="Doz (örn: 5 ml)" placeholderTextColor={THEME.muted} style={styles.input} />
            <TextInput value={uygulamaSekli} onChangeText={setUygulamaSekli} placeholder="Uygulama Şekli (örn: Günde 2 kez, sabah-akşam)" placeholderTextColor={THEME.muted} style={styles.input} />

            <View style={styles.row}>
              <TextInput value={baslangicTarihi} onChangeText={setBaslangicTarihi} placeholder="Başlangıç * (15.09.2026)" placeholderTextColor={THEME.muted} style={[styles.input, styles.rowFlex]} />
              <TextInput value={bitisTarihi} onChangeText={setBitisTarihi} placeholder="Bitiş * (20.09.2026)" placeholderTextColor={THEME.muted} style={[styles.input, styles.rowFlex]} />
            </View>

            <TextInput
              value={hatirlaticiSaat}
              onChangeText={setHatirlaticiSaat}
              placeholder="Hatırlatma Saati (opsiyonel, örn: 14:30)"
              placeholderTextColor={THEME.muted}
              style={styles.input}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
            <Text style={styles.hintText}>⏰ Girilirse, o saatte hem öğretmene hem veliye hatırlatma bildirimi gönderilir.</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>ℹ️ Form oluşturulduğunda veliye onay isteği gönderilecek. Veli onaylamadan form aktif olmaz ve senin listende görünmez.</Text>
            </View>

            <TouchableOpacity disabled={saving} style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveButtonText}>{saving ? 'Gönderiliyor...' : 'Onay İsteği Gönder'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 36 },
  fieldLabel: { fontSize: 12, fontWeight: '900', color: THEME.muted, marginBottom: 8, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.card },
  chipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText: { fontWeight: '800', fontSize: 13, color: THEME.text },
  chipTextActive: { color: '#fff' },
  input: { minHeight: 46, backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, color: THEME.text, fontWeight: '700', marginBottom: 12 },
  hintText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: -6, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  rowFlex: { flex: 1 },
  infoBox: { backgroundColor: '#F0F6FF', borderWidth: 1, borderColor: '#CDEBFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  infoBoxText: { color: '#31527D', fontWeight: '700', fontSize: 13, lineHeight: 19 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
