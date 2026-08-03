// ============================================================
// YUMURCAK — TeacherMedicationFormEditScreen.js
// FAZ 8: "İlaç Takip Formu" oluşturma ekranı — çocuk seç, ilaç bilgilerini
// gir, veli onayı durumunu işaretle. Günlük uygulama kaydı (kayıtlar)
// TeacherMedicationFormDetailScreen'de tutulur, burada sadece kür bilgisi
// oluşturuluyor.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ref, push, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, EmptyState, getChildName } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import { normalizeChildBirthDate } from '../../utils/childDates';

export default function TeacherMedicationFormEditScreen({ navigation }) {
  const { kullanici, teacherId, currentClass, kresId, classChildren } = useTeacherData();

  const [cocukId, setCocukId] = useState('');
  const [ilacAdi, setIlacAdi] = useState('');
  const [doz, setDoz] = useState('');
  const [uygulamaSekli, setUygulamaSekli] = useState('');
  const [baslangicTarihi, setBaslangicTarihi] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [veliOnayi, setVeliOnayi] = useState(false);
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
    if (!veliOnayi) {
      Alert.alert(
        'Veli Onayı Yok',
        'Veli onayı işaretlenmedi. Onay alınmadan ilaç uygulamasına başlamamanı öneririz. Yine de kaydetmek istiyor musun?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Yine de Kaydet', onPress: doSave },
        ]
      );
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
        veliOnayi,
        kayitlar: {},
        aktif: true,
        createdAt: now,
        updatedAt: now,
        olusturanId: teacherId || kullanici?.uid || null,
      });
      setSuccessToast(true);
      setTimeout(() => navigation.goBack(), 700);
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

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Veli Onayı Alındı</Text>
              <Switch value={veliOnayi} onValueChange={setVeliOnayi} trackColor={{ true: THEME.primary }} />
            </View>

            <TouchableOpacity disabled={saving} style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Formu Oluştur'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  row: { flexDirection: 'row', gap: 10 },
  rowFlex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  switchLabel: { fontWeight: '800', color: THEME.text, fontSize: 14 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
