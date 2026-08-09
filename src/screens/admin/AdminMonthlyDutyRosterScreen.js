// ============================================================
// YUMURCAK — AdminMonthlyDutyRosterScreen.js
// FAZ 8: "Nöbet Çizelgesi" — kurum geneli (sınıf bazlı DEĞİL), gün-bazlı
// nöbetçi personel planı. AdminMonthlyScheduleScreen ile AYNI altyapı
// (monthlyDocuments.js, MonthlyCalendarView, MonthlyDocumentPdfBar,
// MonthlyArchivePicker) — sadece kategori/tema/etkinlik-havuzu YOK,
// tek alan: "Nöbetçi Personel" + opsiyonel "Not".
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
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

const NODE_PATH = 'nobetCizelgeleri';
const KAYNAK = 'admin_aylik';

function emptyDutyValue() {
  return { personel: '', not: '' };
}

function hasDutyContent(value) {
  if (!value) return false;
  return !!(String(value.personel || '').trim() || String(value.not || '').trim());
}

function buildDutyRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now }) {
  return {
    kresId,
    tip: 'aylik',
    kaynak,
    ayKey: monthKey,
    tarih: day.dateKey,
    baslik: `${monthLabel} Nöbet Çizelgesi`,
    personel: String(value.personel || '').trim(),
    not: String(value.not || '').trim(),
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };
}

function dutyPreview(value) {
  if (!hasDutyContent(value)) return '';
  return [value?.personel, value?.not].filter(Boolean).join(' · ');
}

export default function AdminMonthlyDutyRosterScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const kresId = kullanici?.kresId;

  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(() => getDaysOfMonth(monthDate), [monthDate]);
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [values, setValues] = useState(() => createInitialValues(days, emptyDutyValue));
  const [view, setView] = useState('list');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [successToast, setSuccessToast] = useState(false);

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
        personel: record.personel || '',
        not: record.not || '',
      }),
    }).then((loadedValues) => {
      if (cancelled) return;
      setValues((prev) => ({ ...prev, ...loadedValues }));
    });

    return () => { cancelled = true; };
  }, [kresId, monthKey]);

  function changeMonth(direction) {
    const next = shiftMonth(monthDate, direction);
    setMonthDate(next);
    setValues(createInitialValues(getDaysOfMonth(next), emptyDutyValue));
    setSelectedDateKey('');
  }

  function jumpToMonth(date) {
    setMonthDate(date);
    setValues(createInitialValues(getDaysOfMonth(date), emptyDutyValue));
    setSelectedDateKey('');
  }

  function updateField(dateKey, field, text) {
    setValues((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyDutyValue()), [field]: text },
    }));
  }

  function clearDay(dateKey) {
    setValues((prev) => ({ ...prev, [dateKey]: emptyDutyValue() }));
  }

  const daysWithContent = useMemo(
    () => days.map((day) => ({ ...day, hasContent: hasDutyContent(values[day.dateKey]) })),
    [days, values]
  );

  const hasAnyEntry = useMemo(() => Object.values(values).some(hasDutyContent), [values]);

  async function handleCopyPreviousMonth() {
    if (!kresId) return;
    setCopying(true);
    try {
      const { values: copiedValues, found } = await copyFromPreviousMonth({
        nodePath: NODE_PATH,
        kresId,
        kaynak: KAYNAK,
        currentMonthDate: monthDate,
        days,
        valueMapper: (prevItem) => ({
          personel: prevItem?.personel || '',
          not: prevItem?.not || '',
        }),
      });

      if (!found) {
        Alert.alert('Bulunamadı', 'Geçen ay için yayınlanmış bir nöbet çizelgesi bulunamadı.');
        return;
      }

      setValues((prev) => {
        const next = { ...prev };
        Object.entries(copiedValues).forEach(([dateKey, value]) => {
          if (value) next[dateKey] = value;
        });
        return next;
      });

      Alert.alert('Kopyalandı', `${found} günlük nöbet planı geçen aydan kopyalandı.`);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Geçen ay kopyalanamadı.');
    } finally {
      setCopying(false);
    }
  }

  function confirmPublish() {
    if (!kresId) {
      Alert.alert('Hata', 'Kurum bilgisi bulunamadı.');
      return;
    }
    if (!hasAnyEntry) {
      Alert.alert('Eksik Bilgi', 'Yayınlamak için en az bir güne nöbetçi gir.');
      return;
    }
    Alert.alert(
      'Çizelgeyi Paylaş',
      `${monthLabel} nöbet çizelgesi yayınlansın mı? Aynı ay için eski yayın pasife alınır.`,
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
        hasContent: hasDutyContent,
        buildRecord: buildDutyRecord,
      });

      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Nöbet çizelgesi yayınlanamadı.');
    } finally {
      setSaving(false);
    }
  }

  function confirmUnpublish() {
    if (!kresId || publishedCount === 0) return;
    Alert.alert(
      'Yayından Kaldır',
      `${monthLabel} için yayınlanmış nöbet çizelgesi kaldırılsın mı?`,
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
  const selectedValue = values[selectedDateKey] || emptyDutyValue();

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast visible={successToast} message={`${monthLabel} nöbet çizelgesi yayınlandı`} onHide={() => setSuccessToast(false)} />

        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Nöbet Çizelgesi</Text>
              <Text style={styles.subtitle}>Kurum geneli, ay bazlı nöbetçi planı</Text>
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
                <Text style={styles.publishedText}>Personel şu an bu ayın nöbet çizelgesini görüyor.</Text>
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
              const preview = dutyPreview(values[day.dateKey]);
              return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>Boş</Text>;
            }}
          />

          <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={confirmPublish} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? 'Yayınlanıyor...' : `${monthLabel} Çizelgesini Yayınla`}</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 14 }}>
            <MonthlyDocumentPdfBar
              kresId={kresId}
              nodePath={NODE_PATH}
              kaynak={KAYNAK}
              docType="nobet"
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
                <Text style={styles.modalTitle}>{selectedDay?.label}</Text>
                <TouchableOpacity onPress={() => setSelectedDateKey('')} activeOpacity={0.8} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseCheck}>✓</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={selectedValue.personel}
                onChangeText={(text) => updateField(selectedDateKey, 'personel', text)}
                placeholder="Nöbetçi Personel (örn: Ayşe Öğretmen)"
                placeholderTextColor={theme.muted}
                style={styles.modalInput}
              />
              <TextInput
                value={selectedValue.not}
                onChangeText={(text) => updateField(selectedDateKey, 'not', text)}
                placeholder="Not (opsiyonel)"
                placeholderTextColor={theme.muted}
                style={styles.modalInput}
                multiline
              />

              {hasDutyContent(selectedValue) ? (
                <TouchableOpacity style={styles.modalClearButton} onPress={() => clearDay(selectedDateKey)} activeOpacity={0.85}>
                  <Text style={styles.modalClearButtonText}>Bu Günü Temizle</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
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
    modalSheet: { backgroundColor: theme.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '88%' },
    modalSheetContent: { padding: 18, paddingBottom: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.text },
    modalClose: { color: theme.primary, fontWeight: '900' },
    modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center' },
    modalCloseCheck: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
    modalInput: { minHeight: 46, backgroundColor: theme.bg, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontWeight: '700', marginBottom: 10, textAlignVertical: 'top' },
    modalClearButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,77,109,0.12)' },
    modalClearButtonText: { color: '#FF4D6D', fontWeight: '900' },
  });
}
