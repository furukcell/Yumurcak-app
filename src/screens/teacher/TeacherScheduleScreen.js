// ============================================================
// YUMURCAK — TeacherScheduleScreen.js
// Öğretmenin kendi sınıfının AYLIK ders programı — admin tarafındaki
// AdminMonthlyScheduleScreen ile AYNI veri modelini (dersProgramlari,
// gün-bazlı kayıt, yayınla/kaldır) kullanır. Üstte "Bugün" kartı var.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
import ActivityLibraryPicker from '../../components/ActivityLibraryPicker';
import ActivityAutocompleteInput from '../../components/ActivityAutocompleteInput';
import ActivityBalanceCard from '../../components/ActivityBalanceCard';
import { ETKINLIK_KATEGORILERI, KAZANIM_ONERILERI } from '../../constants';
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
  forClass,
} from '../../services/monthlyDocuments';

const NODE_PATH = 'dersProgramlari';
const KAYNAK = 'admin_aylik';

function emptyScheduleValue() {
  return { etkinlik: '', aciklama: '', kategori: '', tema: '', kazanimlar: [] };
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
    kategori: value.kategori || null,
    tema: value.tema || null,
    kazanimlar: Array.isArray(value.kazanimlar) ? value.kazanimlar : [],
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };
}

function schedulePreview(value) {
  if (!hasScheduleContent(value)) return '';
  return [value?.etkinlik, value?.aciklama].filter(Boolean).join(' · ');
}

function formatDateKey(dateKey) {
  if (!dateKey) return '-';
  return dateKey.split('-').reverse().join('.');
}

export default function TeacherScheduleScreen() {
  const navigation = useNavigation();
  const { loading, kresId, teacherId, currentClass, schedules } = useTeacherData();

  const sinifId = currentClass?.id || null;
  const sinifAd = currentClass?.ad || 'Sınıfım';

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
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [customKazanimText, setCustomKazanimText] = useState('');

  // publishedCount ve bugünün etkinliği: hook zaten kresId'ye göre
  // filtrelenmiş 'dersProgramlari' listesini veriyor, ayrıca query açmaya gerek yok.
  const classSchedules = useMemo(
    () => schedules.filter((item) => item?.aktif !== false && item?.kaynak === KAYNAK && item?.sinifId === sinifId),
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

  if (loading) return <LoadingState text="Ders programı hazırlanıyor..." />;

  function changeMonth(direction) {
    const next = shiftMonth(monthDate, direction);
    setMonthDate(next);
    setValues(createInitialValues(getDaysOfMonth(next), emptyScheduleValue));
    setSelectedDateKey('');
  }

  function jumpToMonth(date) {
    setMonthDate(date);
    setValues(createInitialValues(getDaysOfMonth(date), emptyScheduleValue));
    setSelectedDateKey('');
  }

  function updateField(dateKey, field, text) {
    setValues((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyScheduleValue()), [field]: text },
    }));
  }

  // FAZ 10 — Hazır Kazanımlar: sabit etiketlerden aç/kapa veya elle
  // özel bir kazanım ekle. Tekrar eden etiketler otomatik engellenir.
  function toggleKazanim(dateKey, etiket) {
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      const mevcut = Array.isArray(current.kazanimlar) ? current.kazanimlar : [];
      const varMi = mevcut.includes(etiket);
      const yeni = varMi ? mevcut.filter((k) => k !== etiket) : [...mevcut, etiket];
      return { ...prev, [dateKey]: { ...current, kazanimlar: yeni } };
    });
  }

  function setKazanimlar(dateKey, kazanimlar) {
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      return { ...prev, [dateKey]: { ...current, kazanimlar } };
    });
  }

  // Autocomplete'ten bir öneri seçilince: etkinlik adı zaten onChangeText ile
  // yazılıyor, burada sadece havuzdan gelen kategori/tema'yı (varsa ve
  // öğretmen henüz kendi seçmediyse) otomatik dolduruyoruz.
  function handleActivitySuggestion(dateKey, item) {
    setValues((prev) => {
      const current = prev[dateKey] || emptyScheduleValue();
      return {
        ...prev,
        [dateKey]: {
          ...current,
          kategori: current.kategori || item.kategori || '',
          tema: current.tema || item.tema || '',
        },
      };
    });
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
          kategori: prevItem?.kategori || '',
          tema: prevItem?.tema || '',
          kazanimlar: Array.isArray(prevItem?.kazanimlar) ? prevItem.kazanimlar : [],
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
        { text: 'Paylaş', onPress: doPublish },
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
        createdBy: teacherId || '',
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

  function selectDay(dateKey) {
    setCustomKazanimText('');
    setSelectedDateKey(dateKey);
  }

  function closeModal() {
    setCustomKazanimText('');
    setSelectedDateKey('');
  }

  const selectedDay = days.find((day) => day.dateKey === selectedDateKey) || null;

  const selectedValue = values[selectedDateKey] || emptyScheduleValue();

  // FAZ 10 — Akıllı Tekrar Uyarısı: girilen etkinlik adı, seçili günden
  // geriye doğru son 10 gün içinde bu sınıfta zaten uygulanmışsa bilgi
  // verir. Sadece bilgilendirme amaçlı, seçimi ENGELLEMEZ.
  const recentRepeat = useMemo(() => {
    const etkinlikAdi = String(selectedValue.etkinlik || '').trim().toLowerCase();
    if (!etkinlikAdi || !selectedDateKey) return null;

    const selectedTime = new Date(selectedDateKey).getTime();

    const eslesenler = classSchedules.filter((item) => {
      if (item.tarih === selectedDateKey) return false;
      if (String(item.etkinlik || '').trim().toLowerCase() !== etkinlikAdi) return false;
      const farkGun = (selectedTime - new Date(item.tarih).getTime()) / 86400000;
      return farkGun > 0 && farkGun <= 10;
    });

    if (eslesenler.length === 0) return null;

    const enSonTarih = eslesenler.map((item) => item.tarih).sort().slice(-1)[0];
    return { sayi: eslesenler.length, enSonTarih };
  }, [selectedValue.etkinlik, selectedDateKey, classSchedules]);

  // FAZ 10 — Aynı Gün Geçen Yıl: seçili günün bir önceki yılki aynı
  // tarihinde (MM-DD aynı, YYYY-1) bu sınıfta girilmiş bir etkinlik
  // varsa gösterir. Dokununca alanları dolduruyor, zorunlu değil.
  const lastYearSchedule = useMemo(() => {
    if (!selectedDateKey) return null;
    const [y, m, d] = selectedDateKey.split('-');
    const lastYearKey = `${Number(y) - 1}-${m}-${d}`;
    const item = classSchedules.find((entry) => entry.tarih === lastYearKey);
    return item && hasScheduleContent(item) ? item : null;
  }, [selectedDateKey, classSchedules]);

  function useLastYearSchedule() {
    if (!lastYearSchedule || !selectedDateKey) return;
    setValues((prev) => ({
      ...prev,
      [selectedDateKey]: {
        etkinlik: lastYearSchedule.etkinlik || '',
        aciklama: lastYearSchedule.aciklama || '',
        kategori: lastYearSchedule.kategori || '',
        tema: lastYearSchedule.tema || '',
        kazanimlar: Array.isArray(lastYearSchedule.kazanimlar) ? lastYearSchedule.kazanimlar : [],
      },
    }));
  }

  // FAZ 10 — Hazır Kazanımlar: aynı etkinlik adı bu kreşte (herhangi bir
  // sınıfta) daha önce kazanımlarla girilmişse, en son kullanılanı önerir.
  const kazanimOnerisi = useMemo(() => {
    const etkinlikAdi = String(selectedValue.etkinlik || '').trim().toLowerCase();
    if (!etkinlikAdi || !selectedDateKey) return null;

    const eslesenler = schedules.filter((item) => {
      if (item?.aktif === false || item?.kaynak !== KAYNAK) return false;
      if (item.tarih === selectedDateKey) return false;
      if (String(item.etkinlik || '').trim().toLowerCase() !== etkinlikAdi) return false;
      return Array.isArray(item.kazanimlar) && item.kazanimlar.length > 0;
    });

    if (eslesenler.length === 0) return null;

    const enSon = [...eslesenler].sort((a, b) => (a.tarih < b.tarih ? 1 : -1))[0];
    const mevcut = Array.isArray(selectedValue.kazanimlar) ? selectedValue.kazanimlar : [];
    const ayni = mevcut.length === enSon.kazanimlar.length && mevcut.every((k) => enSon.kazanimlar.includes(k));
    if (ayni) return null;

    return enSon.kazanimlar;
  }, [selectedValue.etkinlik, selectedValue.kazanimlar, selectedDateKey, schedules]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={successMessage || `${monthLabel} ders programı yayınlandı`} onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title="Ders Programı" subtitle={sinifAd} />

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!currentClass ? (
            <EmptyState icon="📚" title="Sınıf bulunamadı" desc="Öğretmen bir sınıfa bağlanınca program görüntülenir." />
          ) : (
            <>
              <View style={styles.todayCard}>
                <Text style={styles.todayLabel}>Bugün</Text>
                {todaySchedule ? (
                  <>
                    <Text style={styles.todayTitle}>{todaySchedule.etkinlik || 'Etkinlik girilmemiş'}</Text>
                    {todaySchedule.aciklama ? <Text style={styles.todayDesc}>{todaySchedule.aciklama}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.todayEmpty}>Bugün için yayınlanmış bir etkinlik yok.</Text>
                )}
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

              <View style={styles.utilityRow}>
                <TouchableOpacity disabled={copying} style={[styles.copyButton, styles.utilityFlex, copying && { opacity: 0.6 }]} onPress={handleCopyPreviousMonth} activeOpacity={0.85}>
                  <Text style={styles.copyButtonText}>{copying ? 'Kopyalanıyor...' : '📋 Geçen Ayı Kopyala'}</Text>
                </TouchableOpacity>
                <MonthlyArchivePicker
                  kresId={kresId}
                  nodePath={NODE_PATH}
                  kaynak={KAYNAK}
                  matchExtra={forClass(sinifId)}
                  currentMonthKey={monthKey}
                  onSelectMonth={jumpToMonth}
                  theme={THEME}
                />
              </View>

              <ActivityBalanceCard
                schedules={classSchedules}
                monthKey={monthKey}
                monthLabel={monthLabel}
                theme={THEME}
              />

              <MonthlyCalendarView
                days={daysWithContent}
                view={view}
                onChangeView={setView}
                selectedDateKey={selectedDateKey}
                onSelectDay={selectDay}
                theme={THEME}
                renderDayPreview={(day) => {
                  const preview = schedulePreview(values[day.dateKey]);
                  return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>Boş</Text>;
                }}
              />

              <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={confirmPublish} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>{saving ? 'Paylaşılıyor...' : `${monthLabel} Programını Paylaş`}</Text>
              </TouchableOpacity>

              {publishedCount > 0 ? (
                <View style={{ marginTop: 14 }}>
                  <MonthlyDocumentPdfBar
                    kresId={kresId}
                    nodePath={NODE_PATH}
                    kaynak={KAYNAK}
                    docType="ders"
                    monthKey={monthKey}
                    monthLabel={monthLabel}
                    sinifId={sinifId}
                    sinifAd={sinifAd}
                    theme={THEME}
                  />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDay?.label || ''}</Text>
              <TouchableOpacity onPress={closeModal} activeOpacity={0.8}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {lastYearSchedule ? (
              <TouchableOpacity style={styles.lastYearCard} onPress={useLastYearSchedule} activeOpacity={0.85}>
                <Text style={styles.lastYearLabel}>📅 Geçen yıl bugün ({formatDateKey(lastYearSchedule.tarih)})</Text>
                <Text style={styles.lastYearTitle}>{lastYearSchedule.etkinlik}</Text>
                {lastYearSchedule.aciklama ? <Text style={styles.lastYearDesc} numberOfLines={2}>{lastYearSchedule.aciklama}</Text> : null}
                <Text style={styles.lastYearHint}>Dokun, bu ayki güne kopyala</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.libraryRow}>
              <ActivityLibraryPicker
                yasGrubu={currentClass?.yasGrubu}
                initialKategori={selectedValue.kategori || ETKINLIK_KATEGORILERI[0].key}
                onSelect={(ad) => updateField(selectedDateKey, 'etkinlik', ad)}
                theme={THEME}
              />
            </View>

            <ActivityAutocompleteInput
              value={selectedValue.etkinlik}
              onChangeText={(text) => updateField(selectedDateKey, 'etkinlik', text)}
              onSelectSuggestion={(item) => handleActivitySuggestion(selectedDateKey, item)}
              placeholder="Etkinlik (örn: Parmak Boyası)"
              style={styles.modalInput}
              theme={THEME}
            />

            {recentRepeat ? (
              <View style={styles.repeatWarning}>
                <Text style={styles.repeatWarningText}>
                  🔁 Bu etkinlik son 10 gün içinde {recentRepeat.sayi} kez uygulanmış (en son: {formatDateKey(recentRepeat.enSonTarih)}).
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {ETKINLIK_KATEGORILERI.map((item) => {
                const active = selectedValue.kategori === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.kategoriChip, active && styles.kategoriChipActive]}
                    onPress={() => updateField(selectedDateKey, 'kategori', active ? '' : item.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.kategoriChipText, active && styles.kategoriChipTextActive]}>{item.emoji} {item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {kazanimOnerisi ? (
              <TouchableOpacity
                style={styles.kazanimOneriCard}
                onPress={() => setKazanimlar(selectedDateKey, kazanimOnerisi)}
                activeOpacity={0.85}
              >
                <Text style={styles.kazanimOneriLabel}>💡 Bu etkinlik için önceden kullanılan kazanımlar</Text>
                <Text style={styles.kazanimOneriText}>{kazanimOnerisi.join(', ')}</Text>
                <Text style={styles.kazanimOneriHint}>Dokun, kullan</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.modalLabel}>Kazanımlar</Text>
            <View style={styles.kazanimGrid}>
              {KAZANIM_ONERILERI.map((etiket) => {
                const active = (selectedValue.kazanimlar || []).includes(etiket);
                return (
                  <TouchableOpacity
                    key={etiket}
                    style={[styles.kazanimChip, active && styles.kazanimChipActive]}
                    onPress={() => toggleKazanim(selectedDateKey, etiket)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.kazanimChipText, active && styles.kazanimChipTextActive]}>{etiket}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={customKazanimText}
              onChangeText={setCustomKazanimText}
              placeholder="+ Özel kazanım ekle (yazıp Enter'a bas)"
              placeholderTextColor={THEME.muted}
              style={styles.modalInput}
              onSubmitEditing={() => {
                const metin = customKazanimText.trim();
                if (!metin) return;
                const mevcut = selectedValue.kazanimlar || [];
                if (!mevcut.includes(metin)) setKazanimlar(selectedDateKey, [...mevcut, metin]);
                setCustomKazanimText('');
              }}
              returnKeyType="done"
            />

            <TextInput
              value={selectedValue.aciklama}
              onChangeText={(text) => updateField(selectedDateKey, 'aciklama', text)}
              placeholder="Açıklama (opsiyonel)"
              placeholderTextColor={THEME.muted}
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
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  keyboardView: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  todayCard: { backgroundColor: THEME.primary, borderRadius: 20, padding: 16, marginBottom: 14 },
  todayLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginBottom: 6 },
  todayTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
  todayDesc: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 4 },
  todayEmpty: { color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { color: THEME.primary, fontSize: 26, fontWeight: '900', marginTop: -2 },
  monthCenter: { alignItems: 'center' },
  monthLabel: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  monthHint: { color: THEME.muted, fontWeight: '700', marginTop: 3, fontSize: 12 },
  publishedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  publishedTitle: { color: THEME.text, fontSize: 14, fontWeight: '900' },
  publishedText: { color: THEME.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  unpublishButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: THEME.red },
  unpublishButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  copyButton: { backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  utilityRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'stretch' },
  utilityFlex: { flex: 1 },
  copyButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 14 },
  previewText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 3 },
  previewEmpty: { color: '#C7C9D6', fontWeight: '700', fontSize: 12, marginTop: 3 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  modalClose: { color: THEME.primary, fontWeight: '900' },
  modalInput: { minHeight: 46, backgroundColor: THEME.bg, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, paddingVertical: 10, color: THEME.text, fontWeight: '700', marginBottom: 10, textAlignVertical: 'top' },
  repeatWarning: { backgroundColor: '#FFF3D9', borderRadius: 12, padding: 10, marginBottom: 10 },
  repeatWarningText: { color: '#8A6100', fontWeight: '800', fontSize: 12, lineHeight: 17 },
  lastYearCard: { backgroundColor: THEME.primarySoft, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  lastYearLabel: { color: THEME.primary, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  lastYearTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  lastYearDesc: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 2 },
  lastYearHint: { color: THEME.primary, fontWeight: '800', fontSize: 11, marginTop: 6 },
  kazanimOneriCard: { backgroundColor: '#FFF3D9', borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 4 },
  kazanimOneriLabel: { color: '#8A6100', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  kazanimOneriText: { color: '#5C4200', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  kazanimOneriHint: { color: '#8A6100', fontWeight: '800', fontSize: 11, marginTop: 6 },
  kazanimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kazanimChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.bg },
  kazanimChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  kazanimChipText: { fontWeight: '800', fontSize: 12, color: THEME.text },
  kazanimChipTextActive: { color: '#FFF' },
  libraryRow: { alignItems: 'flex-start', marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '900', color: THEME.muted, marginBottom: 8, textTransform: 'uppercase' },
  kategoriChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.bg },
  kategoriChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  kategoriChipText: { fontWeight: '800', fontSize: 12, color: THEME.text },
  kategoriChipTextActive: { color: '#FFF' },
  modalClearButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,77,109,0.12)' },
  modalClearButtonText: { color: '#FF4D6D', fontWeight: '900' },
});
