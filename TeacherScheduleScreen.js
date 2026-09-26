// ============================================================
// YUMURCAK — TeacherScheduleScreen.js
// Öğretmenin kendi sınıfının AYLIK ders programı — admin tarafındaki
// AdminMonthlyScheduleScreen ile AYNI veri modelini (dersProgramlari,
// gün-bazlı kayıt, yayınla/kaldır) kullanır. Üstte "Bugün" kartı var.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
import ActivityChipRow from '../../components/ActivityChipRow';
import ActivityLibraryPicker from '../../components/ActivityLibraryPicker';
import ActivityAutocompleteInput from '../../components/ActivityAutocompleteInput';
import ActivityBalanceCard from '../../components/ActivityBalanceCard';
import { getTranslatedEtkinlikKategorileri, getTranslatedKazanimOnerileri } from '../../constants';
import { createNotification } from '../../services/notificationCenter';
import {
  getDaysOfMonth,
  getMonthKey,
  getMonthLabel,
  shiftMonth,
  createInitialValues,
  publishMonth,
  unpublishMonth,
  copyFromPreviousMonth,
  fetchActiveMonthValues,
  forClass,
} from '../../services/monthlyDocuments';

const NODE_PATH = 'dersProgramlari';
const KAYNAK = 'admin_aylik';

function emptyActivityItem() {
  return { etkinlik: '', aciklama: '', kategori: '', tema: '', kazanimlar: [], baslangicSaati: '', bitisSaati: '' };
}

const SAAT_SECENEKLERI = (() => {
  const list = [];
  for (let h = 8; h <= 18; h += 1) {
    list.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 18) list.push(`${String(h).padStart(2, '0')}:30`);
  }
  return list;
})();

function hasActivityItemContent(item) {
  return !!(String(item?.etkinlik || '').trim() || String(item?.aciklama || '').trim());
}

function emptyScheduleValue() {
  return { etkinlikler: [] };
}

function hasScheduleContent(value) {
  if (!value) return false;
  const list = Array.isArray(value.etkinlikler) ? value.etkinlikler : [];
  return list.some(hasActivityItemContent);
}

function buildScheduleRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now, sinifId }) {
  const list = Array.isArray(value.etkinlikler) ? value.etkinlikler : [];
  return {
    kresId,
    sinifId: sinifId || null,
    tip: 'aylik',
    kaynak,
    ayKey: monthKey,
    tarih: day.dateKey,
    baslik: `${monthLabel} Ders Programı`,
    etkinlikler: list.filter(hasActivityItemContent).map((item) => ({
      etkinlik: String(item.etkinlik || '').trim(),
      aciklama: String(item.aciklama || '').trim(),
      kategori: item.kategori || null,
      tema: item.tema || null,
      kazanimlar: Array.isArray(item.kazanimlar) ? item.kazanimlar : [],
      baslangicSaati: item.baslangicSaati || null,
      bitisSaati: item.bitisSaati || null,
    })),
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };
}

function schedulePreview(value) {
  if (!hasScheduleContent(value)) return '';
  const list = Array.isArray(value.etkinlikler) ? value.etkinlikler : [];
  return list.map((item) => item?.etkinlik).filter(Boolean).join(' · ');
}

function mapRecordToValue(record) {
  const list = Array.isArray(record?.etkinlikler) ? record.etkinlikler : [];
  return {
    etkinlikler: list.map((item) => ({
      etkinlik: item?.etkinlik || '',
      aciklama: item?.aciklama || '',
      kategori: item?.kategori || '',
      tema: item?.tema || '',
      kazanimlar: Array.isArray(item?.kazanimlar) ? item.kazanimlar : [],
      baslangicSaati: item?.baslangicSaati || '',
      bitisSaati: item?.bitisSaati || '',
    })),
  };
}

function formatDateKey(dateKey) {
  if (!dateKey) return '-';
  return dateKey.split('-').reverse().join('.');
}

export default function TeacherScheduleScreen() {
  const { t } = useTranslation();
  const ETKINLIK_KATEGORILERI = useMemo(() => getTranslatedEtkinlikKategorileri(t), [t]);
  const KAZANIM_ONERILERI = useMemo(() => getTranslatedKazanimOnerileri(t), [t]);
  const navigation = useNavigation();
  const { loading, kresId, teacherId, currentClass, schedules } = useTeacherData();

  const sinifId = currentClass?.id || null;
  const sinifAd = currentClass?.ad || t('teacher.schedule.myClassFallback');

  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(() => getDaysOfMonth(monthDate), [monthDate]);
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [values, setValues] = useState(() => createInitialValues(days, emptyScheduleValue));
  const [view, setView] = useState('list');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [customKazanimText, setCustomKazanimText] = useState('');

  const dirtyDatesRef = useRef(new Set());
  function markDirty(dateKey) {
    if (dateKey) dirtyDatesRef.current.add(dateKey);
  }

  // Yeni kayıtlar sinifId ile gelir; eski kayıtlar classId kullanmış olabilir.
  // İki formatı da okuyarak geçmiş programların öğretmende kaybolmasını önlüyoruz.
  const classSchedules = useMemo(
    () => schedules.filter((item) => item?.aktif !== false && item?.kaynak === KAYNAK && (item?.sinifId || item?.classId) === sinifId),
    [schedules, sinifId]
  );

  const publishedCount = useMemo(
    () => classSchedules.filter((item) => item?.ayKey === monthKey).length,
    [classSchedules, monthKey]
  );

  const todaySchedule = useMemo(() => {
    const today = todayString();
    return classSchedules.find((item) => item.tarih === today) || null;
  }, [classSchedules]);

  useEffect(() => {
    let cancelled = false;
    if (!kresId || !sinifId) return undefined;
    fetchActiveMonthValues({
      nodePath: NODE_PATH,
      kresId,
      monthKey,
      kaynak: KAYNAK,
      matchExtra: forClass(sinifId),
      valueMapper: mapRecordToValue,
    }).then((loadedValues) => {
      if (cancelled) return;
      setValues((prev) => ({ ...prev, ...loadedValues }));
    });
    return () => { cancelled = true; };
  }, [kresId, sinifId, monthKey]);

  useEffect(() => {
    const monthRecords = classSchedules.filter((item) => item?.ayKey === monthKey);
    if (monthRecords.length === 0) return;
    setValues((prev) => {
      const next = { ...prev };
      let changed = false;
      monthRecords.forEach((record) => {
        const dateKey = record?.tarih;
        if (!dateKey || dateKey === selectedDateKey) return;
        if (dirtyDatesRef.current.has(dateKey)) return;
        const mapped = mapRecordToValue(record);
        if (JSON.stringify(prev[dateKey]) !== JSON.stringify(mapped)) {
          next[dateKey] = mapped;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [classSchedules, monthKey, selectedDateKey]);

  const daysWithContent = useMemo(
    () => days.map((day) => ({ ...day, hasContent: hasScheduleContent(values[day.dateKey]) })),
    [days, values]
  );
  const hasAnyEntry = useMemo(() => Object.values(values).some(hasScheduleContent), [values]);
  const selectedDay = days.find((day) => day.dateKey === selectedDateKey) || null;
  const selectedValue = values[selectedDateKey] || emptyScheduleValue();
  const selectedItem = (selectedValue.etkinlikler && selectedValue.etkinlikler[editingIndex]) || null;

  const recentRepeat = useMemo(() => {
    const etkinlikAdi = String(selectedItem?.etkinlik || '').trim().toLowerCase();
    if (!etkinlikAdi || !selectedDateKey) return null;
    const selectedTime = new Date(selectedDateKey).getTime();
    const eslesenler = [];
    classSchedules.forEach((day) => {
      if (day.tarih === selectedDateKey) return;
      const items = Array.isArray(day.etkinlikler) ? day.etkinlikler : [];
      const eslesti = items.some((it) => String(it?.etkinlik || '').trim().toLowerCase() === etkinlikAdi);
      if (!eslesti) return;
      const farkGun = (selectedTime - new Date(day.tarih).getTime()) / 86400000;
      if (farkGun > 0 && farkGun <= 10) eslesenler.push(day.tarih);
    });
    if (eslesenler.length === 0) return null;
    const enSonTarih = [...eslesenler].sort().slice(-1)[0];
    return { sayi: eslesenler.length, enSonTarih };
  }, [selectedItem?.etkinlik, selectedDateKey, classSchedules]);

  const lastYearSchedule = useMemo(() => {
    if (!selectedDateKey) return null;
    const [y, m, d] = selectedDateKey.split('-');
    const lastYearKey = `${Number(y) - 1}-${m}-${d}`;
    const item = classSchedules.find((entry) => entry.tarih === lastYearKey);
    return item && hasScheduleContent(item) ? item : null;
  }, [selectedDateKey, classSchedules]);

  const kazanimOnerisi = useMemo(() => {
    const etkinlikAdi = String(selectedItem?.etkinlik || '').trim().toLowerCase();
    if (!etkinlikAdi || !selectedDateKey) return null;
    const adaylar = [];
    schedules.forEach((day) => {
      if (day?.aktif === false || day?.kaynak !== KAYNAK) return;
      if (day.tarih === selectedDateKey) return;
      const items = Array.isArray(day.etkinlikler) ? day.etkinlikler : [];
      items.forEach((it) => {
        if (String(it?.etkinlik || '').trim().toLowerCase() !== etkinlikAdi) return;
        if (Array.isArray(it.kazanimlar) && it.kazanimlar.length > 0) adaylar.push({ tarih: day.tarih, kazanimlar: it.kazanimlar });
      });
    });
    if (adaylar.length === 0) return null;
    const enSon = [...adaylar].sort((a, b) => (a.tarih < b.tarih ? 1 : -1))[0];
    const mevcut = Array.isArray(selectedItem?.kazanimlar) ? selectedItem.kazanimlar : [];
    const ayni = mevcut.length === enSon.kazanimlar.length && mevcut.every((k) => enSon.kazanimlar.includes(k));
    if (ayni) return null;
    return enSon.kazanimlar;
  }, [selectedItem?.etkinlik, selectedItem?.kazanimlar, selectedDateKey, schedules]);

  if (loading) return <LoadingState text={t('teacher.schedule.loading')} />;

  function changeMonth(direction) {
    const next = shiftMonth(monthDate, direction);
    setMonthDate(next);
    setValues(createInitialValues(getDaysOfMonth(next), emptyScheduleValue));
    setSelectedDateKey('');
    dirtyDatesRef.current.clear();
  }
  function jumpToMonth(date) {
    setMonthDate(date);
    setValues(createInitialValues(getDaysOfMonth(date), emptyScheduleValue));
    setSelectedDateKey('');
    dirtyDatesRef.current.clear();
  }
  function updateItemField(dateKey, index, field, text) {
    markDirty(dateKey);
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const list = [...(current.etkinlikler || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], [field]: text };
      return { ...prev, [dateKey]: { ...current, etkinlikler: list } };
    });
  }
  function toggleKazanim(dateKey, index, etiket) {
    markDirty(dateKey);
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const list = [...(current.etkinlikler || [])];
      if (!list[index]) return prev;
      const mevcut = Array.isArray(list[index].kazanimlar) ? list[index].kazanimlar : [];
      const varMi = mevcut.includes(etiket);
      const yeni = varMi ? mevcut.filter((k) => k !== etiket) : [...mevcut, etiket];
      list[index] = { ...list[index], kazanimlar: yeni };
      return { ...prev, [dateKey]: { ...current, etkinlikler: list } };
    });
  }
  function setKazanimlar(dateKey, index, kazanimlar) {
    markDirty(dateKey);
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const list = [...(current.etkinlikler || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], kazanimlar };
      return { ...prev, [dateKey]: { ...current, etkinlikler: list } };
    });
  }
  function handleActivitySuggestion(dateKey, index, item) {
    markDirty(dateKey);
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const list = [...(current.etkinlikler || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], kategori: list[index].kategori || item.kategori || '', tema: list[index].tema || item.tema || '' };
      return { ...prev, [dateKey]: { ...current, etkinlikler: list } };
    });
  }
  function addActivityItem(dateKey) {
    markDirty(dateKey);
    let newIndex = 0;
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const existing = current.etkinlikler || [];
      newIndex = existing.length;
      return { ...prev, [dateKey]: { ...current, etkinlikler: [...existing, emptyActivityItem()] } };
    });
    setEditingIndex(newIndex);
    setCustomKazanimText('');
  }
  function removeActivityItem(dateKey, index) {
    markDirty(dateKey);
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const list = (current.etkinlikler || []).filter((_, i) => i !== index);
      return { ...prev, [dateKey]: { ...current, etkinlikler: list } };
    });
    setEditingIndex((prev) => (prev === index ? -1 : prev > index ? prev - 1 : prev));
    setCustomKazanimText('');
  }
  function clearDay(dateKey) {
    markDirty(dateKey);
    setValues((prev) => ({ ...prev, [dateKey]: emptyScheduleValue() }));
    setEditingIndex(-1);
  }
  async function handleCopyPreviousMonth() {
    if (!kresId || !sinifId) return;
    setCopying(true);
    try {
      const { values: copiedValues, found } = await copyFromPreviousMonth({ nodePath: NODE_PATH, kresId, kaynak: KAYNAK, currentMonthDate: monthDate, days, matchExtra: forClass(sinifId), valueMapper: mapRecordToValue });
      if (!found) {
        Alert.alert(t('teacher.schedule.notFoundTitle'), t('teacher.schedule.noPreviousMonthDesc'));
        return;
      }
      setValues((prev) => {
        const next = { ...prev };
        Object.entries(copiedValues).forEach(([dateKey, value]) => {
          if (value) { next[dateKey] = value; markDirty(dateKey); }
        });
        return next;
      });
      Alert.alert(t('teacher.schedule.copiedTitle'), t('teacher.schedule.copiedDesc', { count: found }));
    } catch (error) {
      console.log(error);
      Alert.alert(t('teacher.schedule.errorTitle'), t('teacher.schedule.copyErrorDesc'));
    } finally { setCopying(false); }
  }
  function confirmPublish() {
    if (!kresId || !sinifId) { Alert.alert(t('teacher.schedule.errorTitle'), t('teacher.schedule.classNotFoundDesc')); return; }
    if (!hasAnyEntry) { Alert.alert(t('teacher.schedule.missingInfoTitle'), t('teacher.schedule.noEntryDesc')); return; }
    Alert.alert(t('teacher.schedule.publishConfirmTitle'), t('teacher.schedule.publishConfirmDesc', { class: sinifAd, month: monthLabel }), [
      { text: t('teacher.schedule.cancelButton'), style: 'cancel' }, { text: t('teacher.schedule.publishButton'), onPress: doPublish },
    ]);
  }
  async function doPublish() {
    setSaving(true);
    try {
      await publishMonth({ nodePath: NODE_PATH, kresId, monthKey, monthLabel, kaynak: KAYNAK, days, values, hasContent: hasScheduleContent, buildRecord: (args) => buildScheduleRecord({ ...args, sinifId }), matchExtra: forClass(sinifId) });
      await createNotification({ kresId, hedefRoller: ['veli'], hedefSinifIds: [sinifId], baslik: '📅 Ders programı güncellendi', mesaj: `${sinifAd} sınıfının ${monthLabel} ders programı yayınlandı.`, tip: 'ders_programi', routeName: 'ParentSummary', createdBy: teacherId || '' });
      dirtyDatesRef.current.clear();
      setSuccessMessage(t('teacher.schedule.publishedSuccess', { month: monthLabel }));
      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert(t('teacher.schedule.errorTitle'), t('teacher.schedule.publishErrorDesc'));
    } finally { setSaving(false); }
  }
  function confirmUnpublish() {
    if (!kresId || !sinifId || publishedCount === 0) return;
    Alert.alert(t('teacher.schedule.unpublishConfirmTitle'), t('teacher.schedule.unpublishConfirmDesc', { month: monthLabel }), [
      { text: t('teacher.schedule.cancelButton'), style: 'cancel' }, { text: t('teacher.schedule.removeButton'), style: 'destructive', onPress: doUnpublish },
    ]);
  }
  async function doUnpublish() {
    setUnpublishing(true);
    try { await unpublishMonth({ nodePath: NODE_PATH, kresId, monthKey, kaynak: KAYNAK, matchExtra: forClass(sinifId) }); }
    catch (error) { console.log(error); Alert.alert(t('teacher.schedule.errorTitle'), t('teacher.schedule.unpublishErrorDesc')); }
    finally { setUnpublishing(false); }
  }
  function selectDay(dateKey) {
    setCustomKazanimText(''); setSelectedDateKey(dateKey);
    const list = values[dateKey]?.etkinlikler || []; setEditingIndex(list.length > 0 ? 0 : -1);
  }
  function closeModal() { setCustomKazanimText(''); setSelectedDateKey(''); setEditingIndex(-1); }
  function useLastYearSchedule() {
    if (!lastYearSchedule || !selectedDateKey) return;
    markDirty(selectedDateKey);
    setValues((prev) => ({ ...prev, [selectedDateKey]: mapRecordToValue(lastYearSchedule) }));
    setEditingIndex(0);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={successMessage || t('teacher.schedule.publishedSuccess', { month: monthLabel })} onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title={t('teacher.schedule.title')} subtitle={sinifAd} />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!currentClass ? (
            <EmptyState icon="📚" title={t('teacher.schedule.noClassTitle')} desc={t('teacher.schedule.noClassDesc')} />
          ) : (
            <>
              <View style={styles.todayCard}>
                <Text style={styles.todayLabel}>{t('teacher.schedule.todayLabel')}</Text>
                {todaySchedule && Array.isArray(todaySchedule.etkinlikler) && todaySchedule.etkinlikler.length > 0 ? (
                  <>
                    <Text style={styles.todayTitle}>{todaySchedule.etkinlikler.map((it) => it.etkinlik).filter(Boolean).join(', ')}</Text>
                    {todaySchedule.etkinlikler.some((it) => it.aciklama) ? <Text style={styles.todayDesc}>{todaySchedule.etkinlikler.map((it) => it.aciklama).filter(Boolean).join(' · ')}</Text> : null}
                  </>
                ) : <Text style={styles.todayEmpty}>{t('teacher.schedule.todayEmptyLabel')}</Text>}
              </View>
              <View style={styles.monthCard}>
                <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)} activeOpacity={0.8}><Text style={styles.monthButtonText}>‹</Text></TouchableOpacity>
                <View style={styles.monthCenter}><Text style={styles.monthLabel}>{monthLabel}</Text><Text style={styles.monthHint}>{t('teacher.schedule.monthDaysHint', { count: days.length })}</Text></View>
                <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)} activeOpacity={0.8}><Text style={styles.monthButtonText}>›</Text></TouchableOpacity>
              </View>
              {publishedCount > 0 ? (
                <View style={styles.publishedCard}>
                  <View style={{ flex: 1 }}><Text style={styles.publishedTitle}>{t('teacher.schedule.publishedLabel', { month: monthLabel })}</Text><Text style={styles.publishedText}>{t('teacher.schedule.publishedDesc')}</Text></View>
                  <TouchableOpacity disabled={unpublishing} style={[styles.unpublishButton, unpublishing && { opacity: 0.6 }]} onPress={confirmUnpublish} activeOpacity={0.85}><Text style={styles.unpublishButtonText}>{unpublishing ? t('teacher.schedule.unpublishingLabel') : t('teacher.schedule.unpublishButton')}</Text></TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.utilityRow}>
                <TouchableOpacity disabled={copying} style={[styles.copyButton, styles.utilityFlex, copying && { opacity: 0.6 }]} onPress={handleCopyPreviousMonth} activeOpacity={0.85}><Text style={styles.copyButtonText}>{copying ? t('teacher.schedule.copyingLabel') : t('teacher.schedule.copyPreviousMonthButton')}</Text></TouchableOpacity>
                <MonthlyArchivePicker kresId={kresId} nodePath={NODE_PATH} kaynak={KAYNAK} matchExtra={forClass(sinifId)} currentMonthKey={monthKey} onSelectMonth={jumpToMonth} theme={THEME} />
              </View>
              <ActivityBalanceCard schedules={classSchedules} monthKey={monthKey} monthLabel={monthLabel} theme={THEME} />
              <MonthlyCalendarView days={daysWithContent} view={view} onChangeView={setView} selectedDateKey={selectedDateKey} onSelectDay={selectDay} theme={THEME} renderDayPreview={(day) => { const preview = schedulePreview(values[day.dateKey]); return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>{t('teacher.schedule.emptyPreview')}</Text>; }} />
              <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={confirmPublish} activeOpacity={0.85}><Text style={styles.saveButtonText}>{saving ? t('teacher.schedule.publishingLabel') : t('teacher.schedule.publishMonthButton', { month: monthLabel })}</Text></TouchableOpacity>
              {publishedCount > 0 ? <View style={{ marginTop: 14 }}><MonthlyDocumentPdfBar kresId={kresId} nodePath={NODE_PATH} kaynak={KAYNAK} docType="ders" monthKey={monthKey} monthLabel={monthLabel} sinifId={sinifId} sinifAd={sinifAd} theme={THEME} /></View> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={styles.modalSheetContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{selectedDay?.label || ''}</Text><TouchableOpacity onPress={closeModal} activeOpacity={0.8} style={styles.modalCloseButton}><Text style={styles.modalCloseCheck}>✓</Text></TouchableOpacity></View>
            {lastYearSchedule ? <TouchableOpacity style={styles.lastYearCard} onPress={useLastYearSchedule} activeOpacity={0.85}><Text style={styles.lastYearLabel}>{t('teacher.schedule.lastYearLabel', { date: formatDateKey(lastYearSchedule.tarih) })}</Text><Text style={styles.lastYearTitle}>{(lastYearSchedule.etkinlikler || []).map((it) => it.etkinlik).filter(Boolean).join(', ')}</Text><Text style={styles.lastYearHint}>{t('teacher.schedule.lastYearHint')}</Text></TouchableOpacity> : null}
            <ActivityChipRow items={selectedValue.etkinlikler} activeIndex={editingIndex} onSelect={(index) => { setCustomKazanimText(''); setEditingIndex(index); }} onAdd={() => addActivityItem(selectedDateKey)} onRemove={(index) => removeActivityItem(selectedDateKey, index)} theme={THEME} />
            {editingIndex >= 0 && selectedItem ? (
              <>
                <View style={styles.libraryRow}><ActivityLibraryPicker yasGrubu={currentClass?.yasGrubu} initialKategori={selectedItem.kategori || ETKINLIK_KATEGORILERI[0].key} onSelect={(ad) => updateItemField(selectedDateKey, editingIndex, 'etkinlik', ad)} theme={THEME} /></View>
                <ActivityAutocompleteInput value={selectedItem.etkinlik} onChangeText={(text) => updateItemField(selectedDateKey, editingIndex, 'etkinlik', text)} onSelectSuggestion={(item) => handleActivitySuggestion(selectedDateKey, editingIndex, item)} placeholder={t('teacher.schedule.activityPlaceholder')} style={styles.modalInput} theme={THEME} />
                {recentRepeat ? <View style={styles.repeatWarning}><Text style={styles.repeatWarningText}>{t('teacher.schedule.repeatWarning', { count: recentRepeat.sayi, date: formatDateKey(recentRepeat.enSonTarih) })}</Text></View> : null}
                <Text style={styles.modalLabel}>{t('teacher.schedule.startTimeLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>{SAAT_SECENEKLERI.map((saat) => { const active = selectedItem.baslangicSaati === saat; return <TouchableOpacity key={saat} style={[styles.saatChip, active && styles.saatChipActive]} onPress={() => updateItemField(selectedDateKey, editingIndex, 'baslangicSaati', active ? '' : saat)} activeOpacity={0.85}><Text style={[styles.saatChipText, active && styles.saatChipTextActive]}>{saat}</Text></TouchableOpacity>; })}</ScrollView>
                <Text style={styles.modalLabel}>{t('teacher.schedule.endTimeLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>{SAAT_SECENEKLERI.map((saat) => { const active = selectedItem.bitisSaati === saat; return <TouchableOpacity key={saat} style={[styles.saatChip, active && styles.saatChipActive]} onPress={() => updateItemField(selectedDateKey, editingIndex, 'bitisSaati', active ? '' : saat)} activeOpacity={0.85}><Text style={[styles.saatChipText, active && styles.saatChipTextActive]}>{saat}</Text></TouchableOpacity>; })}</ScrollView>
                <Text style={styles.modalLabel}>{t('teacher.schedule.categoryLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>{ETKINLIK_KATEGORILERI.map((item) => { const active = selectedItem.kategori === item.key; return <TouchableOpacity key={item.key} style={[styles.kategoriChip, active && styles.kategoriChipActive]} onPress={() => updateItemField(selectedDateKey, editingIndex, 'kategori', active ? '' : item.key)} activeOpacity={0.85}><Text style={[styles.kategoriChipText, active && styles.kategoriChipTextActive]}>{item.emoji} {item.label}</Text></TouchableOpacity>; })}</ScrollView>
                {kazanimOnerisi ? <TouchableOpacity style={styles.kazanimOneriCard} onPress={() => setKazanimlar(selectedDateKey, editingIndex, kazanimOnerisi)} activeOpacity={0.85}><Text style={styles.kazanimOneriLabel}>{t('teacher.schedule.suggestedOutcomesLabel')}</Text><Text style={styles.kazanimOneriText}>{kazanimOnerisi.map((deger) => KAZANIM_ONERILERI.find((k) => k.value === deger)?.label || deger).join(', ')}</Text><Text style={styles.kazanimOneriHint}>{t('teacher.schedule.tapToUseHint')}</Text></TouchableOpacity> : null}
                <Text style={styles.modalLabel}>{t('teacher.schedule.outcomesLabel')}</Text>
                <View style={styles.kazanimGrid}>{KAZANIM_ONERILERI.map(({ value, label }) => { const active = (selectedItem.kazanimlar || []).includes(value); return <TouchableOpacity key={value} style={[styles.kazanimChip, active && styles.kazanimChipActive]} onPress={() => toggleKazanim(selectedDateKey, editingIndex, value)} activeOpacity={0.85}><Text style={[styles.kazanimChipText, active && styles.kazanimChipTextActive]}>{label}</Text></TouchableOpacity>; })}</View>
                <TextInput value={customKazanimText} onChangeText={setCustomKazanimText} placeholder={t('teacher.schedule.customOutcomePlaceholder')} placeholderTextColor={THEME.muted} style={styles.modalInput} onSubmitEditing={() => { const metin = customKazanimText.trim(); if (!metin) return; const mevcut = selectedItem.kazanimlar || []; if (!mevcut.includes(metin)) setKazanimlar(selectedDateKey, editingIndex, [...mevcut, metin]); setCustomKazanimText(''); }} returnKeyType="done" />
                <TextInput value={selectedItem.aciklama} onChangeText={(text) => updateItemField(selectedDateKey, editingIndex, 'aciklama', text)} placeholder={t('teacher.schedule.notePlaceholder')} placeholderTextColor={THEME.muted} style={styles.modalInput} multiline />
              </>
            ) : null}
            {hasScheduleContent(selectedValue) ? <TouchableOpacity style={styles.modalClearButton} onPress={() => clearDay(selectedDateKey)} activeOpacity={0.85}><Text style={styles.modalClearButtonText}>{t('teacher.schedule.clearDayButton')}</Text></TouchableOpacity> : null}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg }, keyboardView: { flex: 1 }, content: { padding: 16, paddingBottom: 60 },
  todayCard: { backgroundColor: THEME.primary, borderRadius: 20, padding: 16, marginBottom: 14 }, todayLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginBottom: 6 }, todayTitle: { color: '#fff', fontWeight: '900', fontSize: 18 }, todayDesc: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 4 }, todayEmpty: { color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border }, monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' }, monthButtonText: { color: THEME.primary, fontSize: 26, fontWeight: '900', marginTop: -2 }, monthCenter: { alignItems: 'center' }, monthLabel: { color: THEME.text, fontSize: 18, fontWeight: '900' }, monthHint: { color: THEME.muted, fontWeight: '700', marginTop: 3, fontSize: 12 },
  publishedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 }, publishedTitle: { color: THEME.text, fontSize: 14, fontWeight: '900' }, publishedText: { color: THEME.muted, fontSize: 12, fontWeight: '700', marginTop: 2 }, unpublishButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: THEME.red }, unpublishButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 }, copyButton: { backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: THEME.border }, utilityRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'stretch' }, utilityFlex: { flex: 1 }, copyButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 14 }, previewText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 3 }, previewEmpty: { color: '#C7C9D6', fontWeight: '700', fontSize: 12, marginTop: 3 }, saveButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4 }, saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }, modalSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '88%' }, modalSheetContent: { padding: 18, paddingBottom: 30 }, saatChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.bg }, saatChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary }, saatChipText: { fontWeight: '800', fontSize: 12, color: THEME.text }, saatChipTextActive: { color: '#FFF' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, modalTitle: { fontSize: 18, fontWeight: '900', color: THEME.text }, modalClose: { color: THEME.primary, fontWeight: '900' }, modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.green, alignItems: 'center', justifyContent: 'center' }, modalCloseCheck: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 }, modalInput: { minHeight: 46, backgroundColor: THEME.bg, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, paddingVertical: 10, color: THEME.text, fontWeight: '700', marginBottom: 10, textAlignVertical: 'top' }, repeatWarning: { backgroundColor: '#FFF3D9', borderRadius: 12, padding: 10, marginBottom: 10 }, repeatWarningText: { color: '#8A6100', fontWeight: '800', fontSize: 12, lineHeight: 17 }, lastYearCard: { backgroundColor: THEME.primarySoft, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: THEME.border }, lastYearLabel: { color: THEME.primary, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }, lastYearTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 }, lastYearDesc: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 2 }, lastYearHint: { color: THEME.primary, fontWeight: '800', fontSize: 11, marginTop: 6 }, kazanimOneriCard: { backgroundColor: '#FFF3D9', borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 4 }, kazanimOneriLabel: { color: '#8A6100', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }, kazanimOneriText: { color: '#5C4200', fontWeight: '700', fontSize: 13, lineHeight: 18 }, kazanimOneriHint: { color: '#8A6100', fontWeight: '800', fontSize: 11, marginTop: 6 }, kazanimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, kazanimChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.bg }, kazanimChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary }, kazanimChipText: { fontWeight: '800', fontSize: 12, color: THEME.text }, kazanimChipTextActive: { color: '#FFF' }, libraryRow: { alignItems: 'flex-start', marginBottom: 10 }, modalLabel: { fontSize: 12, fontWeight: '900', color: THEME.muted, marginBottom: 8, textTransform: 'uppercase' }, kategoriChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.bg }, kategoriChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary }, kategoriChipText: { fontWeight: '800', fontSize: 12, color: THEME.text }, kategoriChipTextActive: { color: '#FFF' }, modalClearButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,77,109,0.12)' }, modalClearButtonText: { color: '#FF4D6D', fontWeight: '900' },
});
