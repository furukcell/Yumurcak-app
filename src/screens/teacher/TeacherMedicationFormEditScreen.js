// ============================================================
// YUMURCAK — TeacherMedicationFormEditScreen.js
// FAZ 8: "İlaç Takip Formu" oluşturma ekranı — çocuk seç, ilaç bilgilerini
// gir, veli onayı durumunu işaretle. Günlük uygulama kaydı (kayıtlar)
// TeacherMedicationFormDetailScreen'de tutulur, burada sadece kür bilgisi
// oluşturuluyor.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRoute } from '@react-navigation/native';
import { ref, push, update } from 'firebase/database';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
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
    () => [...classChildren].sort((a, b) => getChildName(a).localeCompare(getChildName(b))),
    [classChildren]
  );

  async function handleSave() {
    if (!cocukId) {
      Alert.alert(t('teacher.medicationFormEdit.missingInfoTitle'), t('teacher.medicationFormEdit.missingChildDesc'));
      return;
    }
    if (!ilacAdi.trim() || !baslangicTarihi.trim() || !bitisTarihi.trim()) {
      Alert.alert(t('teacher.medicationFormEdit.missingInfoTitle'), t('teacher.medicationFormEdit.missingFieldsDesc'));
      return;
    }
    if (hatirlaticiSaat.trim() && !normalizeTimeInput(hatirlaticiSaat)) {
      Alert.alert(t('teacher.medicationFormEdit.invalidTimeTitle'), t('teacher.medicationFormEdit.invalidTimeDesc'));
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
        // Not: bildirim başlığı/metni kalıcı olarak DB'ye yazılıyor ve veli
        // tarafında olduğu gibi gösteriliyor — bildirimler henüz görüntüleyen
        // kişinin diline göre değil, oluşturanın diline göre saklanıyor
        // (uygulama genelinde henüz çözülmemiş, ayrı bir mimari konu).
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
      Alert.alert(t('teacher.medicationFormEdit.errorTitle'), t('teacher.medicationFormEdit.saveErrorDesc'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={t('teacher.medicationFormEdit.successMessage')} onHide={() => setSuccessToast(false)} />
      <View onLayout={onHeaderLayout}>
        <ScreenHeader navigation={navigation} title={t('teacher.medicationFormEdit.title')} subtitle={currentClass?.ad || t('teacher.medicationFormEdit.classFallback')} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title={t('teacher.medicationFormEdit.noClassTitle')} desc={t('teacher.medicationFormEdit.noClassDesc')} />
        ) : (
          <>
            <Text style={styles.fieldLabel}>{t('teacher.medicationFormEdit.childLabel')}</Text>
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

            <TextInput value={ilacAdi} onChangeText={setIlacAdi} placeholder={t('teacher.medicationFormEdit.medicineNamePlaceholder')} placeholderTextColor={THEME.muted} style={styles.input} />
            <TextInput value={doz} onChangeText={setDoz} placeholder={t('teacher.medicationFormEdit.dosePlaceholder')} placeholderTextColor={THEME.muted} style={styles.input} />
            <TextInput value={uygulamaSekli} onChangeText={setUygulamaSekli} placeholder={t('teacher.medicationFormEdit.usagePlaceholder')} placeholderTextColor={THEME.muted} style={styles.input} />

            <View style={styles.row}>
              <TextInput value={baslangicTarihi} onChangeText={setBaslangicTarihi} placeholder={t('teacher.medicationFormEdit.startDatePlaceholder')} placeholderTextColor={THEME.muted} style={[styles.input, styles.rowFlex]} />
              <TextInput value={bitisTarihi} onChangeText={setBitisTarihi} placeholder={t('teacher.medicationFormEdit.endDatePlaceholder')} placeholderTextColor={THEME.muted} style={[styles.input, styles.rowFlex]} />
            </View>

            <TextInput
              value={hatirlaticiSaat}
              onChangeText={setHatirlaticiSaat}
              placeholder={t('teacher.medicationFormEdit.reminderPlaceholder')}
              placeholderTextColor={THEME.muted}
              style={styles.input}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
            <Text style={styles.hintText}>{t('teacher.medicationFormEdit.hintText')}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>{t('teacher.medicationFormEdit.infoText')}</Text>
            </View>

            <TouchableOpacity disabled={saving} style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveButtonText}>{saving ? t('teacher.medicationFormEdit.sending') : t('teacher.medicationFormEdit.saveButton')}</Text>
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
