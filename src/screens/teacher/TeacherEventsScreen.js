// ============================================================
// YUMURCAK — TeacherEventsScreen.js
// FAZ 3: Öğretmen sadece kendi sınıfına etkinlik oluşturur
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate, todayString } from './teacherShared';
import { parseChildBirthDate, normalizeChildBirthDate, formatChildBirthDate } from '../../utils/childDates';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function TeacherEventsScreen() {
  const { t } = useTranslation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
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

  if (loading) return <LoadingState text={t('teacher.events.loading')} />;

  const save = async () => {
    if (!currentClass?.id) return Alert.alert(t('teacher.events.errorTitle'), t('teacher.events.classNotFoundDesc'));
    if (!baslik.trim() || !tarih.trim()) return Alert.alert(t('teacher.events.missingInfoTitle'), t('teacher.events.missingFieldsDesc'));

    if (!parseChildBirthDate(tarih)) {
      Alert.alert(t('teacher.events.errorTitle'), t('teacher.events.invalidDateDesc'));
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
      Alert.alert(t('teacher.events.errorTitle'), t('teacher.events.saveErrorDesc'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message={t('teacher.events.successMessage')}
        onHide={() => setSuccessToast(false)}
      />

      <View onLayout={onHeaderLayout}>
        <ScreenHeader
        navigation={navigation}
        title={t('teacher.events.title')}
        subtitle={currentClass?.ad || t('teacher.events.classFallback')}
        rightText={showForm ? t('teacher.events.closeButton') : t('teacher.events.addButton')}
        onRightPress={() => setShowForm((v) => !v)}
      />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('teacher.events.formTitle')}</Text>
            <TextInput style={styles.input} value={baslik} onChangeText={setBaslik} placeholder={t('teacher.events.titlePlaceholder')} placeholderTextColor="#999" />
            <TextInput style={styles.input} value={tarih} onChangeText={setTarih} placeholder={t('teacher.events.datePlaceholder')} placeholderTextColor="#999" />
            <TextInput style={styles.input} value={saat} onChangeText={setSaat} placeholder={t('teacher.events.timePlaceholder')} placeholderTextColor="#999" />
            <TextInput style={[styles.input, styles.textArea]} value={aciklama} onChangeText={setAciklama} placeholder={t('teacher.events.descPlaceholder')} multiline placeholderTextColor="#999" />
            <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{t('teacher.events.saveButton')}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {classEvents.length === 0 ? (
          <EmptyState icon="🎉" title={t('teacher.events.emptyTitle')} desc={t('teacher.events.emptyDesc')} />
        ) : (
          classEvents.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.date}>📅 {formatDate(item.tarih)} {item.saat ? `· ${item.saat}` : ''}</Text>
              <Text style={styles.title}>{item.baslik || t('parent.events.defaultTitle')}</Text>
              {item.aciklama ? <Text style={styles.desc}>{item.aciklama}</Text> : null}
              <Text style={styles.badge}>{item.sinifId ? t('parent.events.classEvent') : t('parent.events.generalEvent')}</Text>
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
