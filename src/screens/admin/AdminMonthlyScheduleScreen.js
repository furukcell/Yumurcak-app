// ============================================================
// YUMURCAK — AdminMonthlyScheduleScreen.js
// Ders programını da yemek listesiyle AYNI modele taşıyoruz:
// haftalık serbest metin yerine, ay + gün bazlı, yayınla/kaldır akışı.
// Sınıf bazlı çalışır (her sınıfın kendi aylık programı olur).
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onValue, ref } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import { useRoute } from '@react-navigation/native';
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
  forClass,
} from '../../services/monthlyDocuments';

const NODE_PATH = 'dersProgramlari';
const KAYNAK = 'admin_aylik';

function emptyScheduleValue() {
  return { etkinlik: '', aciklama: '' };
}

function hasScheduleContent(value) {
  if (!value) return false;
  return !!(String(value.etkinlik || '').trim() || String(value.aciklama || '').trim());
}

function buildScheduleRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now, sinifId }) {
  return {
    kresId,
    sinifId: sinifId || null,
    tip: 'aylik',
    kaynak,
    ayKey: monthKey,
    tarih: day.dateKey,
    baslik: `${monthLabel} Ders Programı`,
    etkinlik: String(value.etkinlik || '').trim(),
    aciklama: String(value.aciklama || '').trim(),
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };
}

function schedulePreview(value) {
  if (!hasScheduleContent(value)) return '';
  return [value?.etkinlik, value?.aciklama].filter(Boolean).join(' · ');
}

export default function AdminMonthlyScheduleScreen({ navigation }) {
  const route = useRoute();
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Sınıf bazlı: ClassList'ten "bu sınıfın programını düzenle" ile gelinir.
  const sinifId = route.params?.sinifId || null;
  const sinifAd = route.params?.sinifAd || 'Sınıf';

  const kresId = kullanici?.kresId;
  const adminId = kullanici?.uid || kullanici?.id || null;

  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(() => getDaysOfMonth(monthDate), [monthDate]);
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [values, setValues] = useState(() => createInitialValues(days, emptyScheduleValue));
  const [view, setView] = useState('list');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!kresId || !sinifId) {
      setPublishedCount(0);
      return undefined;
    }
    const unsub = onValue(
      ref(database, NODE_PATH),
      (snap) => setPublishedCount(countPublished(snap.val(), { kresId, monthKey, kaynak: KAYNAK, matchExtra: forClass(sinifId) })),
      () => setPublishedCount(0)
    );
    return () => unsub();
  }, [kresId, sinifId, monthKey]);

  function changeMonth(direction) {
    const next = shiftMonth(monthDate, direction);
    setMonthDate(next);
    setValues(createInitialValues(getDaysOfMonth(next), emptyScheduleValue));
    setSelectedDateKey('');
  }

  function updateField(dateKey, field, text) {
    setValues((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyScheduleValue()), [field]: text },
    }));
  }

  function clearDay(dateKey) {
    setValues((prev) => ({ ...prev, [dateKey]: emptyScheduleValue() }));
  }

  const daysWithContent = useMemo(
    () => days.map((day) => ({ ...day, hasContent: hasScheduleContent(values[day.dateKey]) })),
    [days, values]
  );

  const hasAnyEntry = useMemo(() => Object.values(values).some(hasScheduleContent), [values]);

  async function handleCopyPreviousMonth() {
    if (!kresId || !sinifId) return;
    setCopying(true);
    try {
      const { values: copiedValues, found } = await copyFromPreviousMonth({
        nodePath: NODE_PATH,
        kresId,
        kaynak: KAYNAK,
        currentMonthDate: monthDate,
        days,
        matchExtra: forClass(sinifId),
        valueMapper: (prevItem) => ({
          etkinlik: prevItem?.etkinlik || '',
          aciklama: prevItem?.aciklama || '',
        }),
      });

      if (!found) {
        Alert.alert('Bulunamadı', 'Geçen ay için yayınlanmış bir ders programı bulunamadı.');
        return;
      }

      setValues((prev) => {
        const next = { ...prev };
        Object.entries(copiedValues).forEach(([dateKey, value]) => {
          if (value) next[dateKey] = value;
        });
        return next;
      });

      Alert.alert('Kopyalandı', `${found} günlük etkinlik geçen aydan kopyalandı. Değişiklikleri yapıp yayınlayabilirsin.`);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Geçen ay kopyalanamadı.');
    } finally {
      setCopying(false);
    }
  }

  function confirmPublish() {
    if (!kresId || !sinifId) {
      Alert.alert('Hata', 'Sınıf bilgisi bulunamadı.');
      return;
    }
    if (!hasAnyEntry) {
      Alert.alert('Eksik Bilgi', 'Yayınlamak için en az bir güne etkinlik gir.');
      return;
    }
    Alert.alert(
      'Ayı Paylaş',
      `${sinifAd} sınıfının ${monthLabel} ders programı yayınlansın mı? Aynı ay için eski yayın pasife alınır.`,
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
        hasContent: hasScheduleContent,
        buildRecord: (args) => buildScheduleRecord({ ...args, sinifId }),
        matchExtra: forClass(sinifId),
      });

      await createNotification({
        kresId,
        hedefRoller: ['veli'],
        hedefSinifIds: [sinifId],
        baslik: '📅 Ders programı güncellendi',
        mesaj: `${sinifAd} sınıfının ${monthLabel} ders programı yayınlandı.`,
        tip: 'ders_programi',
        routeName: 'ParentSummary',
        createdBy: adminId || '',
      });

      setSuccessMessage(`${monthLabel} ders programı yayınlandı`);
      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Aylık ders programı yayınlanamadı.');
    } finally {
      setSaving(false);
    }
  }

  function confirmUnpublish() {
    if (!kresId || !sinifId || publishedCount === 0) return;
    Alert.alert(
      'Yayından Kaldır',
      `${monthLabel} için yayınlanmış ders programı kaldırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kaldır', style: 'destructive', onPress: doUnpublish },
      ]
    );
  }

  async function doUnpublish() {
    setUnpublishing(true);
    try {
      await unpublishMonth({ nodePath: NODE_PATH, kresId, monthKey, kaynak: KAYNAK, matchExtra: forClass(sinifId) });
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Yayından kaldırılamadı.');
    } finally {
      setUnpublishing(false);
    }
  }

  const selectedDay = days.find((day) => day.dateKey === selectedDateKey) || null;
  const selectedValue = values[selectedDateKey] || emptyScheduleValue();

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast visible={successToast} message={successMessage || `${monthLabel} ders programı yayınlandı`} onHide={() => setSuccessToast(false)} />

        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Aylık Ders Programı</Text>
              <Text style={styles.subtitle}>{sinifAd} — ay bazlı, gün gün etkinlik planı</Text>
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
                <Text style={styles.publishedText}>Veliler şu an bu ayın programını görüyor.</Text>
              </View>
              <TouchableOpacity disabled={unpublishing} style={[styles.unpublishButton, unpublishing && { opacity: 0.6 }]} onPress={confirmUnpublish} activeOpacity={0.85}>
                <Text style={styles.unpublishButtonText}>{unpublishing ? 'Kaldırılıyor...' : 'Yayından Kaldır'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity disabled={copying} style={[styles.copyButton, copying && { opacity: 0.6 }]} onPress={handleCopyPreviousMonth} activeOpacity={0.85}>
            <Text style={styles.copyButtonText}>{copying ? 'Kopyalanıyor...' : '📋 Geçen Ayı Kopyala'}</Text>
          </TouchableOpacity>

          <MonthlyCalendarView
            days={daysWithContent}
            view={view}
            onChangeView={setView}
            selectedDateKey={selectedDateKey}
            onSelectDay={setSelectedDateKey}
            theme={theme}
            renderDayPreview={(day) => {
              const preview = schedulePreview(values[day.dateKey]);
              return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>Boş</Text>;
            }}
          />

          <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={confirmPublish} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? 'Yayınlanıyor...' : `${monthLabel} Programını Yayınla`}</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDateKey('')}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedDay?.label || ''}</Text>
                <TouchableOpacity onPress={() => setSelectedDateKey('')} activeOpacity={0.8}>
                  <Text style={styles.modalClose}>Kapat</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={selectedValue.etkinlik}
                onChangeText={(text) => updateField(selectedDateKey, 'etkinlik', text)}
                placeholder="Etkinlik (örn: Parmak Boyası)"
                placeholderTextColor={theme.muted}
                style={styles.modalInput}
                multiline
              />
              <TextInput
                value={selectedValue.aciklama}
                onChangeText={(text) => updateField(selectedDateKey, 'aciklama', text)}
                placeholder="Açıklama (opsiyonel)"
                placeholderTextColor={theme.muted}
                style={styles.modalInput}
                multiline
              />

              {hasScheduleContent(selectedValue) ? (
                <TouchableOpacity style={styles.modalClearButton} onPress={() => clearDay(selectedDateKey)} activeOpacity={0.85}>
                  <Text style={styles.modalClearButtonText}>Bu Günü Temizle</Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
    copyButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: theme.border },
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
