import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { onValue, ref, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
import MealAutocompleteInput from '../../components/MealAutocompleteInput';
import { createNotification } from '../../services/notificationCenter';
import {
  getDaysOfMonth,
  getMonthKey,
  getMonthLabel,
  shiftMonth,
  createInitialValues,
  countPublished,
  publishMonth,
  unpublishMonth,
  copyFromPreviousMonth,
  fetchActiveMonthValues,
} from '../../services/monthlyDocuments';

const NODE_PATH = 'yemekListeleri';
const KAYNAK = 'admin_aylik';

function emptyMealValue() {
  return { kahvalti: '', ogle: '', araOgun: '' };
}

function hasMealContent(value) {
  if (!value) return false;
  return !!(String(value.kahvalti || '').trim() || String(value.ogle || '').trim() || String(value.araOgun || '').trim());
}

function buildMealRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now }) {
  return {
    kresId,
    sinifId: null,
    tip: 'aylik',
    kaynak,
    ayKey: monthKey,
    tarih: day.dateKey,
    baslik: `${monthLabel} Yemek Listesi`,
    ogunler: {
      kahvalti: String(value.kahvalti || '').trim(),
      ogle: String(value.ogle || '').trim(),
      araOgun: String(value.araOgun || '').trim(),
    },
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };
}

function mealPreview(value) {
  if (!hasMealContent(value)) return '';
  return [value?.kahvalti, value?.ogle, value?.araOgun].filter(Boolean).join(' · ');
}

export default function AdminMonthlyMealScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const kresId = kullanici?.kresId;
  const adminId = kullanici?.uid || kullanici?.id || null;

  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(() => getDaysOfMonth(monthDate), [monthDate]);
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [values, setValues] = useState(() => createInitialValues(days, emptyMealValue));
  const [view, setView] = useState('list');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!kresId) {
      setPublishedCount(0);
      return undefined;
    }
    const q = query(ref(database, NODE_PATH), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(
      q,
      (snap) => setPublishedCount(countPublished(snap.val(), { kresId, monthKey, kaynak: KAYNAK })),
      () => setPublishedCount(0)
    );
    return () => unsub();
  }, [kresId, monthKey]);

  // FAZ FIX — bu ay zaten yayınlanmışsa, taslağı boş bırakmak yerine
  // yayınlanmış veriyi geri okuyup forma dolduruyoruz.
  useEffect(() => {
    let cancelled = false;
    if (!kresId) return undefined;

    fetchActiveMonthValues({
      nodePath: NODE_PATH,
      kresId,
      monthKey,
      kaynak: KAYNAK,
      valueMapper: (record) => ({
        kahvalti: record.ogunler?.kahvalti || '',
        ogle: record.ogunler?.ogle || '',
        araOgun: record.ogunler?.araOgun || '',
      }),
      onError: (error) => {
        if (cancelled) return;
        Alert.alert(
          'Liste okunamadı',
          `Yayınlanmış aylık yemek listesi Firebase'den okunamadı (${error?.code || error?.message || 'bilinmeyen hata'}). Bu yüzden form boş görünüyor olabilir — veri kaybolmadı, sadece okuma başarısız oldu.`
        );
      },
    }).then((loadedValues) => {
      if (cancelled) return;
      setValues((prev) => ({ ...prev, ...loadedValues }));
    });

    return () => { cancelled = true; };
  }, [kresId, monthKey]);

  function changeMonth(direction) {
    const next = shiftMonth(monthDate, direction);
    setMonthDate(next);
    setValues(createInitialValues(getDaysOfMonth(next), emptyMealValue));
    setSelectedDateKey('');
  }

  // Arşivden bir aya doğrudan atlar (+/-1 kaydırma değil, hedef aya).
  function jumpToMonth(date) {
    setMonthDate(date);
    setValues(createInitialValues(getDaysOfMonth(date), emptyMealValue));
    setSelectedDateKey('');
  }

  function updateField(dateKey, field, text) {
    setValues((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyMealValue()), [field]: text },
    }));
  }

  function clearDay(dateKey) {
    setValues((prev) => ({ ...prev, [dateKey]: emptyMealValue() }));
  }

  const daysWithContent = useMemo(
    () => days.map((day) => ({ ...day, hasContent: hasMealContent(values[day.dateKey]) })),
    [days, values]
  );

  const hasAnyMeal = useMemo(() => Object.values(values).some(hasMealContent), [values]);

  async function handleCopyPreviousMonth() {
    if (!kresId) return;
    setCopying(true);
    try {
      const { values: copiedValues, prevMonthKey, found } = await copyFromPreviousMonth({
        nodePath: NODE_PATH,
        kresId,
        kaynak: KAYNAK,
        currentMonthDate: monthDate,
        days,
        valueMapper: (prevItem) => ({
          kahvalti: prevItem?.ogunler?.kahvalti || '',
          ogle: prevItem?.ogunler?.ogle || '',
          araOgun: prevItem?.ogunler?.araOgun || '',
        }),
      });

      if (!found) {
        Alert.alert('Bulunamadı', `${prevMonthKey} için yayınlanmış bir yemek listesi yok.`);
        return;
      }

      setValues((prev) => {
        const next = { ...prev };
        Object.entries(copiedValues).forEach(([dateKey, value]) => {
          if (value) next[dateKey] = value;
        });
        return next;
      });

      Alert.alert('Kopyalandı', `${found} günlük yemek bilgisi geçen aydan kopyalandı. Değişiklikleri yapıp yayınlayabilirsin.`);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Geçen ay kopyalanamadı.');
    } finally {
      setCopying(false);
    }
  }

  function confirmPublish() {
    if (!kresId) {
      Alert.alert('Hata', 'Kreş bilgisi bulunamadı.');
      return;
    }
    if (!hasAnyMeal) {
      Alert.alert('Eksik Bilgi', 'Yayınlamak için en az bir güne yemek bilgisi gir.');
      return;
    }
    Alert.alert(
      'Ayı Paylaş',
      `${monthLabel} yemek listesi yayınlansın mı? Aynı ay için eski yayın pasife alınır ve veliler yeni listeyi görür.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yayınla', onPress: doPublish },
      ]
    );
  }

  async function doPublish() {
    setSaving(true);
    try {
      await publishMonth({
        nodePath: NODE_PATH,
        kresId,
        monthKey,
        monthLabel,
        kaynak: KAYNAK,
        days,
        values,
        hasContent: hasMealContent,
        buildRecord: buildMealRecord,
      });

      await createNotification({
        kresId,
        hedefRoller: ['veli'],
        baslik: '🍽️ Yemek listesi güncellendi',
        mesaj: `${monthLabel} yemek listesi yayınlandı.`,
        tip: 'yemek',
        routeName: 'ParentMeals',
        createdBy: adminId || '',
      });

      setSuccessMessage(`${monthLabel} yemek listesi yayınlandı`);
      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Aylık yemek listesi yayınlanamadı.');
    } finally {
      setSaving(false);
    }
  }

  function confirmUnpublish() {
    if (!kresId || publishedCount === 0) return;
    Alert.alert(
      'Yayından Kaldır',
      `${monthLabel} için yayınlanmış yemek listesi kaldırılsın mı? Veliler artık bu ayın listesini göremeyecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kaldır', style: 'destructive', onPress: doUnpublish },
      ]
    );
  }

  async function doUnpublish() {
    setUnpublishing(true);
    try {
      await unpublishMonth({ nodePath: NODE_PATH, kresId, monthKey, kaynak: KAYNAK });
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Yayından kaldırılamadı.');
    } finally {
      setUnpublishing(false);
    }
  }

  const selectedDay = days.find((day) => day.dateKey === selectedDateKey) || null;
  const selectedValue = values[selectedDateKey] || emptyMealValue();

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast visible={successToast} message={successMessage || `${monthLabel} yemek listesi yayınlandı`} onHide={() => setSuccessToast(false)} />

        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Aylık Yemek Listesi</Text>
              <Text style={styles.subtitle}>Kurum geneli ay bazlı yemek planı</Text>
            </View>
          </View>

          <View style={styles.monthCard}>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)} activeOpacity={0.8}>
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.monthCenter}>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Text style={styles.monthHint}>{days.length} günlük plan</Text>
            </View>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)} activeOpacity={0.8}>
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {publishedCount > 0 ? (
            <View style={styles.publishedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.publishedTitle}>✅ {monthLabel} yayında</Text>
                <Text style={styles.publishedText}>Veliler şu an bu ayın listesini görüyor.</Text>
              </View>
              <TouchableOpacity disabled={unpublishing} style={[styles.unpublishButton, unpublishing && { opacity: 0.6 }]} onPress={confirmUnpublish} activeOpacity={0.85}>
                <Text style={styles.unpublishButtonText}>{unpublishing ? 'Kaldırılıyor...' : 'Yayından Kaldır'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.utilityRow}>
            <TouchableOpacity disabled={copying} style={[styles.copyButton, styles.utilityFlex, copying && { opacity: 0.6 }]} onPress={handleCopyPreviousMonth} activeOpacity={0.85}>
              <Text style={styles.copyButtonText}>{copying ? 'Kopyalanıyor...' : '📋 Geçen Ayı Kopyala'}</Text>
            </TouchableOpacity>
            <MonthlyArchivePicker
              kresId={kresId}
              nodePath={NODE_PATH}
              kaynak={KAYNAK}
              currentMonthKey={monthKey}
              onSelectMonth={jumpToMonth}
              theme={theme}
            />
          </View>

          <MonthlyCalendarView
            days={daysWithContent}
            view={view}
            onChangeView={setView}
            selectedDateKey={selectedDateKey}
            onSelectDay={setSelectedDateKey}
            theme={theme}
            renderDayPreview={(day) => {
              const preview = mealPreview(values[day.dateKey]);
              return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>Boş</Text>;
            }}
          />

          <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={confirmPublish} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? 'Yayınlanıyor...' : `${monthLabel} Listesini Yayınla`}</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 14 }}>
            <MonthlyDocumentPdfBar
              kresId={kresId}
              nodePath={NODE_PATH}
              kaynak={KAYNAK}
              docType="yemek"
              monthKey={monthKey}
              monthLabel={monthLabel}
              theme={theme}
            />
          </View>
        </ScrollView>

        <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDateKey('')}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedDay?.label || ''}</Text>
                <TouchableOpacity onPress={() => setSelectedDateKey('')} activeOpacity={0.8}>
                  <Text style={styles.modalClose}>Kapat</Text>
                </TouchableOpacity>
              </View>

              <MealAutocompleteInput
                ogun="kahvalti"
                value={selectedValue.kahvalti}
                onChangeText={(text) => updateField(selectedDateKey, 'kahvalti', text)}
                placeholder="Kahvaltı"
                style={styles.modalInput}
                theme={theme}
              />
              <MealAutocompleteInput
                ogun="ogle"
                value={selectedValue.ogle}
                onChangeText={(text) => updateField(selectedDateKey, 'ogle', text)}
                placeholder="Öğle yemeği"
                style={styles.modalInput}
                theme={theme}
              />
              <MealAutocompleteInput
                ogun="araOgun"
                value={selectedValue.araOgun}
                onChangeText={(text) => updateField(selectedDateKey, 'araOgun', text)}
                placeholder="Ara öğün"
                style={styles.modalInput}
                theme={theme}
              />

              {hasMealContent(selectedValue) ? (
                <TouchableOpacity style={styles.modalClearButton} onPress={() => clearDay(selectedDateKey)} activeOpacity={0.85}>
                  <Text style={styles.modalClearButtonText}>Bu Günü Temizle</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </ThemedBackground>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    screen: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: theme.border },
    backText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    headerTextWrap: { flex: 1, minWidth: 0 },
    title: { color: theme.primary, fontSize: 24, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 3 },
    monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.primary, borderRadius: 22, padding: 14, marginBottom: 12 },
    monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    monthButtonText: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: -2 },
    monthCenter: { alignItems: 'center' },
    monthLabel: { color: '#fff', fontSize: 20, fontWeight: '900' },
    monthHint: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 3 },
    publishedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    publishedTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
    publishedText: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    unpublishButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FF4D6D' },
    unpublishButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    copyButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    utilityRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'stretch' },
    utilityFlex: { flex: 1 },
    copyButtonText: { color: theme.primary, fontWeight: '900', fontSize: 14 },
    previewText: { color: theme.muted, fontWeight: '700', fontSize: 12, marginTop: 3 },
    previewEmpty: { color: '#C7C9D6', fontWeight: '700', fontSize: 12, marginTop: 3 },
    saveButton: { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: theme.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.text },
    modalClose: { color: theme.primary, fontWeight: '900' },
    modalInput: { minHeight: 46, backgroundColor: theme.bg, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontWeight: '700', marginBottom: 10, textAlignVertical: 'top' },
    modalClearButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,77,109,0.12)' },
    modalClearButtonText: { color: '#FF4D6D', fontWeight: '900' },
  });
}
