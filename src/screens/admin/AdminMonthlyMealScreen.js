import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { onValue, ref, query, orderByChild, equalTo, get } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
import MealChipListInput from '../../components/MealChipListInput';
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
  forClass,
} from '../../services/monthlyDocuments';

// Öğretmenlerin kendi sınıfları için yayınladığı aylık yemek listesi
// (kaynak: 'ogretmen_aylik') — bkz. TeacherMealsScreen.js üst kısmındaki not.
// Admin bu kayıtları hiç düzenlemez, sadece OKUR: veri kaybı riskini
// önlemek için admin_aylik ile birleştirilmiyor, ayrı sekmede gösteriliyor.
const TEACHER_KAYNAK = 'ogretmen_aylik';

const NODE_PATH = 'yemekListeleri';
const KAYNAK = 'admin_aylik';

// FAZ — Çoklu Yemek Girişi: her öğün artık tek metin değil, yemek adlarından
// oluşan bir dizi (chip listesi). mealLibrary havuzuna her yemek AYRI yazılır.
function toMealArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
}

function emptyMealValue() {
  return { kahvalti: [], ogle: [], araOgun: [] };
}

function hasMealContent(value) {
  if (!value) return false;
  return toMealArray(value.kahvalti).length > 0 || toMealArray(value.ogle).length > 0 || toMealArray(value.araOgun).length > 0;
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
      kahvalti: toMealArray(value.kahvalti),
      ogle: toMealArray(value.ogle),
      araOgun: toMealArray(value.araOgun),
    },
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };
}

function mealPreview(value) {
  if (!hasMealContent(value)) return '';
  return [...toMealArray(value?.kahvalti), ...toMealArray(value?.ogle), ...toMealArray(value?.araOgun)].join(' · ');
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

  // Sınıf Listeleri (öğretmenlerin girdiği, sadece görüntüleme) — bkz. TEACHER_KAYNAK notu.
  const [classes, setClasses] = useState([]);
  const [classValues, setClassValues] = useState({});
  const [classListLoading, setClassListLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    if (!kresId) {
      setClasses([]);
      setClassListLoading(false);
      return undefined;
    }
    setClassListLoading(true);
    const indexRef = ref(database, `kresSiniflari/${kresId}`);
    const unsubscribe = onValue(indexRef, (snapshot) => {
      const idsData = snapshot.val();
      if (!idsData) {
        setClasses([]);
        setClassListLoading(false);
        return;
      }
      const classIds = Object.keys(idsData);
      Promise.all(
        classIds.map((id) => get(ref(database, `siniflar/${id}`)).then((s) => (s.exists() ? { id, ...s.val() } : null)))
      ).then((results) => {
        setClasses(results.filter(Boolean).sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr')));
        setClassListLoading(false);
      }).catch(() => setClassListLoading(false));
    }, () => setClassListLoading(false));
    return () => unsubscribe();
  }, [kresId]);

  useEffect(() => {
    if (!kresId || classes.length === 0) {
      setClassValues({});
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      classes.map((c) =>
        fetchActiveMonthValues({
          nodePath: NODE_PATH,
          kresId,
          monthKey,
          kaynak: TEACHER_KAYNAK,
          matchExtra: forClass(c.id),
          valueMapper: (record) => ({
            kahvalti: toMealArray(record.ogunler?.kahvalti),
            ogle: toMealArray(record.ogunler?.ogle),
            araOgun: toMealArray(record.ogunler?.araOgun),
          }),
        }).then((values) => [c.id, values])
      )
    ).then((entries) => {
      if (cancelled) return;
      setClassValues(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [kresId, monthKey, classes]);

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
        kahvalti: toMealArray(record.ogunler?.kahvalti),
        ogle: toMealArray(record.ogunler?.ogle),
        araOgun: toMealArray(record.ogunler?.araOgun),
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

  function updateMealList(dateKey, field, list) {
    setValues((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyMealValue()), [field]: list },
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
          kahvalti: toMealArray(prevItem?.ogunler?.kahvalti),
          ogle: toMealArray(prevItem?.ogunler?.ogle),
          araOgun: toMealArray(prevItem?.ogunler?.araOgun),
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

          {classes.length > 0 ? (
            <View style={styles.classSection}>
              <Text style={styles.classSectionTitle}>👩‍🏫 Sınıf Listeleri</Text>
              <Text style={styles.classSectionHint}>Öğretmenlerin kendi sınıfları için girdiği aylık liste — sadece görüntüleme.</Text>
              {classes.map((c) => {
                const dayCount = Object.values(classValues[c.id] || {}).filter(hasMealContent).length;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.classRow}
                    activeOpacity={0.85}
                    onPress={() => setSelectedClassId(c.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classRowTitle}>{c.ad || 'Sınıf'}</Text>
                      <Text style={styles.classRowSubtitle}>
                        {dayCount > 0 ? `${monthLabel} için ${dayCount} gün girilmiş` : `${monthLabel} için henüz giriş yok`}
                      </Text>
                    </View>
                    <Text style={styles.classRowArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView style={styles.modalSheet} contentContainerStyle={styles.modalSheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedDay?.label || ''}</Text>
                <TouchableOpacity onPress={() => setSelectedDateKey('')} activeOpacity={0.8} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseCheck}>✓</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Kahvaltı</Text>
              <MealChipListInput
                ogun="kahvalti"
                values={selectedValue.kahvalti}
                onChange={(list) => updateMealList(selectedDateKey, 'kahvalti', list)}
                placeholder="Kahvaltı yemeği ekle"
                theme={theme}
              />

              <Text style={styles.modalLabel}>Öğle Yemeği</Text>
              <MealChipListInput
                ogun="ogle"
                values={selectedValue.ogle}
                onChange={(list) => updateMealList(selectedDateKey, 'ogle', list)}
                placeholder="Öğle yemeği ekle"
                theme={theme}
              />

              <Text style={styles.modalLabel}>Ara Öğün</Text>
              <MealChipListInput
                ogun="araOgun"
                values={selectedValue.araOgun}
                onChange={(list) => updateMealList(selectedDateKey, 'araOgun', list)}
                placeholder="Ara öğün ekle"
                theme={theme}
              />

              {hasMealContent(selectedValue) ? (
                <TouchableOpacity style={styles.modalClearButton} onPress={() => clearDay(selectedDateKey)} activeOpacity={0.85}>
                  <Text style={styles.modalClearButtonText}>Bu Günü Temizle</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={!!selectedClassId} transparent animationType="slide" onRequestClose={() => setSelectedClassId('')}>
          <View style={styles.modalBackdrop}>
            <ScrollView style={styles.modalSheet} contentContainerStyle={styles.modalSheetContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{classes.find((c) => c.id === selectedClassId)?.ad || 'Sınıf'} — {monthLabel}</Text>
                <TouchableOpacity onPress={() => setSelectedClassId('')} activeOpacity={0.8} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseCheck}>✓</Text>
                </TouchableOpacity>
              </View>

              {(() => {
                const dayValues = classValues[selectedClassId] || {};
                const filledDays = days
                  .map((day) => ({ day, value: dayValues[day.dateKey] }))
                  .filter(({ value }) => hasMealContent(value));

                if (filledDays.length === 0) {
                  return <Text style={styles.classEmptyText}>Bu sınıfın öğretmeni {monthLabel} için henüz yemek girmemiş.</Text>;
                }

                return filledDays.map(({ day, value }) => (
                  <View key={day.dateKey} style={styles.classDayCard}>
                    <Text style={styles.classDayLabel}>{day.label}</Text>
                    {toMealArray(value.kahvalti).length > 0 ? (
                      <Text style={styles.classDayMeal}><Text style={styles.classDayMealTag}>Kahvaltı: </Text>{toMealArray(value.kahvalti).join(', ')}</Text>
                    ) : null}
                    {toMealArray(value.ogle).length > 0 ? (
                      <Text style={styles.classDayMeal}><Text style={styles.classDayMealTag}>Öğle: </Text>{toMealArray(value.ogle).join(', ')}</Text>
                    ) : null}
                    {toMealArray(value.araOgun).length > 0 ? (
                      <Text style={styles.classDayMeal}><Text style={styles.classDayMealTag}>Ara Öğün: </Text>{toMealArray(value.araOgun).join(', ')}</Text>
                    ) : null}
                  </View>
                ));
              })()}
            </ScrollView>
          </View>
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
    modalSheet: { backgroundColor: theme.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '88%' },
    modalSheetContent: { padding: 18, paddingBottom: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.text },
    modalClose: { color: theme.primary, fontWeight: '900' },
    modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center' },
    modalCloseCheck: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
    modalInput: { minHeight: 46, backgroundColor: theme.bg, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontWeight: '700', marginBottom: 10, textAlignVertical: 'top' },
    modalLabel: { fontSize: 12, fontWeight: '900', color: theme.muted, marginBottom: 8, textTransform: 'uppercase' },
    modalClearButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,77,109,0.12)' },
    modalClearButtonText: { color: '#FF4D6D', fontWeight: '900' },
    classSection: { backgroundColor: theme.card, borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
    classSectionTitle: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    classSectionHint: { color: theme.muted, fontWeight: '700', fontSize: 11, marginTop: 3, marginBottom: 10, lineHeight: 15 },
    classRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
    classRowTitle: { color: theme.text, fontWeight: '900', fontSize: 14 },
    classRowSubtitle: { color: theme.muted, fontWeight: '700', fontSize: 12, marginTop: 2 },
    classRowArrow: { color: theme.primary, fontWeight: '900', fontSize: 20, marginLeft: 8 },
    classEmptyText: { color: theme.muted, fontWeight: '700', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
    classDayCard: { backgroundColor: theme.bg, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    classDayLabel: { color: theme.primary, fontWeight: '900', fontSize: 13, marginBottom: 4 },
    classDayMeal: { color: theme.text, fontWeight: '700', fontSize: 13, marginTop: 2, lineHeight: 18 },
    classDayMealTag: { color: theme.muted, fontWeight: '900' },
  });
}
