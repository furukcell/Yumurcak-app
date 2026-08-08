// ============================================================
// YUMURCAK — TeacherMealsScreen.js
// Öğretmen günlük yemek girişi + yemek fotoğrafı + aylık kurum listesi
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Platform, Modal } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, push, remove, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { database, storage } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import MealTodayCard, { MEALS, getMealText, getMealPhoto } from '../../components/MealTodayCard';
import MealChipListInput from '../../components/MealChipListInput';
import MonthlyCalendarView from '../../components/MonthlyCalendarView';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
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

// FAZ 3 → FAZ 4 DÜZELTME — Öğretmen ÖNCEDEN admin ile AYNI "kurum geneli"
// belgeyi (yemekListeleri/admin_aylik, sinifId: null) yazıyordu. Bu, bir
// öğretmenin yayınla'ya basmasının TÜM KURUMUN aylık listesini (admin'in ve
// diğer sınıfların günlerini) pasife alıp kendi taslağıyla değiştirmesi
// anlamına geliyordu — veri kaybı riski. Artık öğretmenin aylık listesi
// KENDİ SINIFINA ÖZEL ayrı bir kayıt (kaynak: 'ogretmen_aylik', sinifId:
// sınıfın id'si). Admin'in kurum geneli listesine hiç dokunmuyor.
// "Bugün" sekmesinde önce sınıfa özel liste, o gün için yoksa kurum geneli
// (admin_aylik) liste kullanılıyor — bkz. mergeTodayMeal / todayMonthlyMeal.
const MONTHLY_NODE_PATH = 'yemekListeleri';
const MONTHLY_KAYNAK = 'ogretmen_aylik';
const INSTITUTION_KAYNAK = 'admin_aylik';

function forTeacherClass(sinifId) {
  return (item) => item?.sinifId === sinifId;
}

// FAZ — Çoklu Yemek Girişi: aylık liste artık öğün başına string yerine
// bir dizi (chip listesi). AdminMonthlyMealScreen ile AYNI desen.
function toMealArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
}

function emptyMonthlyMealValue() {
  return { kahvalti: [], ogle: [], araOgun: [] };
}

function hasMonthlyMealContent(value) {
  if (!value) return false;
  return toMealArray(value.kahvalti).length > 0 || toMealArray(value.ogle).length > 0 || toMealArray(value.araOgun).length > 0;
}

function buildMonthlyMealRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now, sinifId, sinifAdi }) {
  return {
    kresId,
    sinifId: sinifId || null,
    tip: 'aylik',
    kaynak,
    ayKey: monthKey,
    tarih: day.dateKey,
    baslik: `${sinifAdi ? sinifAdi + ' - ' : ''}${monthLabel} Yemek Listesi`,
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

function monthlyMealPreview(value) {
  if (!hasMonthlyMealContent(value)) return '';
  return [...toMealArray(value?.kahvalti), ...toMealArray(value?.ogle), ...toMealArray(value?.araOgun)].join(' · ');
}

function getCurrentMonthKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey) {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const parts = String(monthKey || '').split('-');
  const year = parts[0];
  const monthIndex = Number(parts[1]) - 1;
  return `${months[monthIndex] || 'Ay'} ${year || ''}`.trim();
}

function getMealDateKey(item) {
  return String(item?.tarih || item?.baslangicTarihi || '').slice(0, 10);
}

function parseDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return null;
  const date = new Date(`${dateKey}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getLast7DaysStart() {
  const minDate = getTodayStart();
  minDate.setDate(minDate.getDate() - 6);
  return minDate;
}

function isDateInLast7Days(dateKey) {
  const targetDate = parseDateKey(dateKey);
  if (!targetDate) return false;
  return targetDate >= getLast7DaysStart() && targetDate <= getTodayStart();
}

function isDateExpired(dateKey) {
  const targetDate = parseDateKey(dateKey);
  if (!targetDate) return false;
  return targetDate < getLast7DaysStart();
}

function isExpiredDailyMeal(item) {
  return item?.kaynak !== 'admin_aylik' && item?.kaynak !== 'ogretmen_aylik' && item?.kaynak !== 'aylik_plan' && isDateExpired(getMealDateKey(item));
}

function getMealPhotoPath(value) {
  if (!value || typeof value === 'string') return '';
  return value.fotoPath || value.photoPath || value.imagePath || value.storagePath || '';
}

function getPhotoFileInfo(asset, mealKey) {
  const contentType = asset?.mimeType || 'image/jpeg';
  const rawUri = String(asset?.uri || '').split('?')[0];
  const rawExt = rawUri.includes('.') ? rawUri.split('.').pop() : '';
  let extension = String(rawExt || '').toLowerCase();

  if (!extension || extension.length > 5) {
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else extension = 'jpg';
  }

  return { contentType, fileName: `${Date.now()}_${mealKey}.${extension}` };
}

function readAssetAsBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Fotoğraf dosyası okunamadı.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadMealPhoto(asset, kresId, sinifId, mealKey) {
  if (!asset?.uri) return { url: '', path: '' };

  const blob = await readAssetAsBlob(asset.uri);
  const { contentType, fileName } = getPhotoFileInfo(asset, mealKey);
  const filePath = `yemekFotograflari/${kresId || 'kres'}/${sinifId || 'sinif'}/${fileName}`;
  const fileRef = storageRef(storage, filePath);
  await uploadBytes(fileRef, blob, { contentType });
  const url = await getDownloadURL(fileRef);

  return { url, path: filePath };
}

function buildEmptyTodayMeal(kresId, classItem) {
  const today = todayString();
  return {
    kresId: kresId || classItem?.kresId || '',
    sinifId: classItem?.id || '',
    tip: 'gunluk',
    tarih: today,
    baslik: `${classItem?.ad || 'Sınıf'} Günlük Yemek Listesi`,
    ogunler: {},
    aktif: true,
    createdAt: Date.now(),
  };
}

function hasMealValue(value) {
  return !!(getMealText(value) || getMealPhoto(value));
}

function mergeMealValue(monthlyValue, dailyValue) {
  return hasMealValue(dailyValue) ? dailyValue : (monthlyValue || {});
}

function mergeTodayMeal({ kresId, classItem, monthlyMeal, dailyMeal }) {
  const emptyMeal = buildEmptyTodayMeal(kresId, classItem);
  const base = monthlyMeal || emptyMeal;
  const dailyOguns = dailyMeal?.ogunler || {};
  const monthlyOguns = monthlyMeal?.ogunler || {};

  return {
    ...base,
    ...(dailyMeal || {}),
    id: dailyMeal?.id || '',
    dailySourceId: dailyMeal?.id || '',
    monthlySourceId: monthlyMeal?.id || '',
    kaynak: dailyMeal?.kaynak || (monthlyMeal ? 'aylik_plan' : ''),
    tip: dailyMeal?.tip || 'gunluk',
    tarih: todayString(),
    baslik: dailyMeal?.baslik || monthlyMeal?.baslik || emptyMeal.baslik,
    ogunler: {
      kahvalti: mergeMealValue(monthlyOguns.kahvalti, dailyOguns.kahvalti),
      ogle: mergeMealValue(monthlyOguns.ogle, dailyOguns.ogle),
      araOgun: mergeMealValue(monthlyOguns.araOgun, dailyOguns.araOgun),
    },
  };
}

function buildEmptyMealTexts() {
  return { kahvalti: '', ogle: '', araOgun: '' };
}

export default function TeacherMealsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, meals } = useTeacherData();

  const [tab, setTab] = useState('today');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [mealTexts, setMealTexts] = useState(buildEmptyMealTexts);
  const [selectedMealKey, setSelectedMealKey] = useState('kahvalti');
  // FAZ 10 — Önceden tek bir "mealPhoto" state'i vardı ve sadece seçili öğüne
  // bağlıydı; 3 öğüne foto eklemek için 3 ayrı "Kaydet" gerekiyordu. Artık her
  // öğün için ayrı foto tutuyoruz, tek "Kaydet" hepsini birlikte yüklüyor.
  const [mealPhotos, setMealPhotos] = useState({ kahvalti: null, ogle: null, araOgun: null });

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  // FAZ 3 — Aylık yemek listesi editörü (öğretmen artık burada yazabiliyor,
  // sadece görüntülemiyor). Admin tarafındaki AdminMonthlyMealScreen ile
  // AYNI kayıt (kurum geneli, aynı NODE_PATH/kaynak) üzerinde çalışır.
  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(() => getDaysOfMonth(monthDate), [monthDate]);
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [monthlyValues, setMonthlyValues] = useState(() => createInitialValues(days, emptyMonthlyMealValue));
  const [monthlyView, setMonthlyView] = useState('list');
  const [monthlySelectedDateKey, setMonthlySelectedDateKey] = useState('');
  const [monthlySaving, setMonthlySaving] = useState(false);
  const [monthlyCopying, setMonthlyCopying] = useState(false);
  const [monthlyUnpublishing, setMonthlyUnpublishing] = useState(false);
  const [monthlyPublishedCount, setMonthlyPublishedCount] = useState(0);
  const [monthlySuccessToast, setMonthlySuccessToast] = useState(false);

  useEffect(() => {
    if (!kresId || !currentClass?.id) {
      setMonthlyPublishedCount(0);
      return undefined;
    }
    const q = query(ref(database, MONTHLY_NODE_PATH), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(
      q,
      (snap) => setMonthlyPublishedCount(countPublished(snap.val(), { kresId, monthKey, kaynak: MONTHLY_KAYNAK, matchExtra: forTeacherClass(currentClass.id) })),
      () => setMonthlyPublishedCount(0)
    );
    return () => unsub();
  }, [kresId, monthKey, currentClass?.id]);

  // Bu ay zaten yayınlanmışsa (bu sınıf için, öğretmen tarafından), taslağı
  // boş bırakmak yerine mevcut veriyi geri okuyup forma dolduruyoruz.
  // Admin'in kurum geneli listesine burada BAKMIYORUZ — o ayrı bir kayıt.
  useEffect(() => {
    let cancelled = false;
    if (!kresId || !currentClass?.id) return undefined;

    fetchActiveMonthValues({
      nodePath: MONTHLY_NODE_PATH,
      kresId,
      monthKey,
      kaynak: MONTHLY_KAYNAK,
      matchExtra: forTeacherClass(currentClass.id),
      valueMapper: (record) => ({
        kahvalti: toMealArray(record.ogunler?.kahvalti),
        ogle: toMealArray(record.ogunler?.ogle),
        araOgun: toMealArray(record.ogunler?.araOgun),
      }),
      onError: (error) => {
        if (cancelled) return;
        Alert.alert(
          'Liste okunamadı',
          `Yayınlanmış aylık yemek listesi okunamadı (${error?.code || error?.message || 'bilinmeyen hata'}). Form boş görünüyor olabilir, veri kaybolmadı.`
        );
      },
    }).then((loadedValues) => {
      if (cancelled) return;
      setMonthlyValues((prev) => ({ ...prev, ...loadedValues }));
    });

    return () => { cancelled = true; };
  }, [kresId, monthKey, currentClass?.id]);

  function changeMonth(direction) {
    const next = shiftMonth(monthDate, direction);
    setMonthDate(next);
    setMonthlyValues(createInitialValues(getDaysOfMonth(next), emptyMonthlyMealValue));
    setMonthlySelectedDateKey('');
  }

  function jumpToMonth(date) {
    setMonthDate(date);
    setMonthlyValues(createInitialValues(getDaysOfMonth(date), emptyMonthlyMealValue));
    setMonthlySelectedDateKey('');
  }

  function updateMonthlyList(dateKey, field, list) {
    setMonthlyValues((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyMonthlyMealValue()), [field]: list },
    }));
  }

  function clearMonthlyDay(dateKey) {
    setMonthlyValues((prev) => ({ ...prev, [dateKey]: emptyMonthlyMealValue() }));
  }

  const monthlyDaysWithContent = useMemo(
    () => days.map((day) => ({ ...day, hasContent: hasMonthlyMealContent(monthlyValues[day.dateKey]) })),
    [days, monthlyValues]
  );

  const hasAnyMonthlyMeal = useMemo(() => Object.values(monthlyValues).some(hasMonthlyMealContent), [monthlyValues]);

  async function handleCopyPreviousMonthlyMonth() {
    if (!kresId || !currentClass?.id) return;
    setMonthlyCopying(true);
    try {
      const { values: copiedValues, found } = await copyFromPreviousMonth({
        nodePath: MONTHLY_NODE_PATH,
        kresId,
        kaynak: MONTHLY_KAYNAK,
        matchExtra: forTeacherClass(currentClass.id),
        currentMonthDate: monthDate,
        days,
        valueMapper: (prevItem) => ({
          kahvalti: toMealArray(prevItem?.ogunler?.kahvalti),
          ogle: toMealArray(prevItem?.ogunler?.ogle),
          araOgun: toMealArray(prevItem?.ogunler?.araOgun),
        }),
      });

      if (!found) {
        Alert.alert('Bulunamadı', 'Geçen ay için sınıfına ait yayınlanmış bir yemek listesi bulunamadı.');
        return;
      }

      setMonthlyValues((prev) => {
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
      setMonthlyCopying(false);
    }
  }

  function confirmPublishMonthly() {
    if (!kresId || !currentClass?.id) {
      Alert.alert('Hata', 'Sınıf bilgisi bulunamadı.');
      return;
    }
    if (!hasAnyMonthlyMeal) {
      Alert.alert('Eksik Bilgi', 'Yayınlamak için en az bir güne yemek bilgisi gir.');
      return;
    }
    Alert.alert(
      'Ayı Paylaş',
      `${monthLabel} yemek listesi ${currentClass.ad || 'sınıfın'} için yayınlansın mı? Sadece kendi sınıfının eski yayını pasife alınır, kurum geneli liste etkilenmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yayınla', onPress: doPublishMonthly },
      ]
    );
  }

  async function doPublishMonthly() {
    setMonthlySaving(true);
    try {
      await publishMonth({
        nodePath: MONTHLY_NODE_PATH,
        kresId,
        monthKey,
        monthLabel,
        kaynak: MONTHLY_KAYNAK,
        matchExtra: forTeacherClass(currentClass.id),
        days,
        values: monthlyValues,
        hasContent: hasMonthlyMealContent,
        buildRecord: (args) => buildMonthlyMealRecord({ ...args, sinifId: currentClass.id, sinifAdi: currentClass.ad }),
      });

      await createNotification({
        kresId,
        hedefRoller: ['veli'],
        baslik: '🍽️ Yemek listesi güncellendi',
        mesaj: `${currentClass.ad || 'Sınıf'} için ${monthLabel} yemek listesi yayınlandı.`,
        tip: 'yemek',
        routeName: 'ParentMeals',
        createdBy: teacherId || '',
      });

      setMonthlySuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Aylık yemek listesi yayınlanamadı.');
    } finally {
      setMonthlySaving(false);
    }
  }

  function confirmUnpublishMonthly() {
    if (!kresId || !currentClass?.id || monthlyPublishedCount === 0) return;
    Alert.alert(
      'Yayından Kaldır',
      `${monthLabel} için ${currentClass.ad || 'sınıfının'} yayınlanmış yemek listesi kaldırılsın mı? Veliler artık bu ayın listesini göremeyecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kaldır', style: 'destructive', onPress: doUnpublishMonthly },
      ]
    );
  }

  async function doUnpublishMonthly() {
    setMonthlyUnpublishing(true);
    try {
      await unpublishMonth({ nodePath: MONTHLY_NODE_PATH, kresId, monthKey, kaynak: MONTHLY_KAYNAK, matchExtra: forTeacherClass(currentClass.id) });
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Yayından kaldırılamadı.');
    } finally {
      setMonthlyUnpublishing(false);
    }
  }

  const monthlySelectedDay = days.find((day) => day.dateKey === monthlySelectedDateKey) || null;
  const monthlySelectedValue = monthlyValues[monthlySelectedDateKey] || emptyMonthlyMealValue();

  const visibleMeals = useMemo(() => {
    return meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === currentClass?.id)
      .sort((a, b) => String(b.tarih || b.baslangicTarihi || b.createdAt || '').localeCompare(String(a.tarih || a.baslangicTarihi || a.createdAt || '')));
  }, [meals, kresId, currentClass?.id]);

  const monthlyMeals = useMemo(() => {
    return visibleMeals
      .filter((item) => item.kaynak === 'admin_aylik')
      .filter((item) => item.ayKey === currentMonthKey)
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [visibleMeals, currentMonthKey]);

  const today = todayString();
  // Aynı gün için (kaydet'e birden fazla basma, senkron gecikmesi vb.
  // nedenlerle) birden fazla aktif kayıt kalmışsa, içeriği (metin/foto)
  // olan ve en son güncellenen kaydı seç — eski/boş kopya "kaydedildi"
  // dedikten sonra fotoğrafın görünmemesine sebep oluyordu.
  const pickFreshestMeal = (list) => {
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => {
      const aHas = MEALS.some((meal) => hasMealValue(a?.ogunler?.[meal.key])) ? 1 : 0;
      const bHas = MEALS.some((meal) => hasMealValue(b?.ogunler?.[meal.key])) ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
    });
    return sorted[0];
  };
  const todayDailyMeal = pickFreshestMeal(visibleMeals.filter((item) => item.tarih === today && item.kaynak !== 'admin_aylik' && item.kaynak !== MONTHLY_KAYNAK));
  // Önce BU SINIFA özel öğretmen yayını, yoksa admin'in kurum geneli yayını.
  const todayOwnClassMonthlyMeal = pickFreshestMeal(visibleMeals.filter((item) => item.tarih === today && item.kaynak === MONTHLY_KAYNAK && item.sinifId === currentClass?.id));
  const todayInstitutionMonthlyMeal = pickFreshestMeal(visibleMeals.filter((item) => item.tarih === today && item.kaynak === INSTITUTION_KAYNAK));
  const todayMonthlyMeal = todayOwnClassMonthlyMeal || todayInstitutionMonthlyMeal;
  const todayMeal = useMemo(() => mergeTodayMeal({ kresId, classItem: currentClass, monthlyMeal: todayMonthlyMeal, dailyMeal: todayDailyMeal }), [currentClass, kresId, todayDailyMeal, todayMonthlyMeal]);

  useEffect(() => {
    if (loading) return;

    const expiredMeals = visibleMeals.filter((item) => item.id && isExpiredDailyMeal(item));
    if (expiredMeals.length === 0) return;

    let cancelled = false;

    const cleanupExpiredMeals = async () => {
      for (const item of expiredMeals) {
        if (cancelled) return;
        try {
          await remove(ref(database, `yemekListeleri/${item.id}`));
        } catch (err) {
          console.warn('Süresi geçen yemek listesi temizlenemedi:', err?.message || err);
        }
      }
    };

    cleanupExpiredMeals();

    return () => {
      cancelled = true;
    };
  }, [loading, visibleMeals]);

  useEffect(() => {
    const ogunler = todayMeal?.ogunler || {};

    setMealTexts({
      kahvalti: getMealText(ogunler.kahvalti),
      ogle: getMealText(ogunler.ogle),
      araOgun: getMealText(ogunler.araOgun),
    });
    setMealPhotos({ kahvalti: null, ogle: null, araOgun: null });
  }, [todayMeal?.dailySourceId, todayMeal?.monthlySourceId, todayMeal?.updatedAt, todayMeal?.createdAt]);

  if (loading) return <LoadingState text="Yemek listesi hazırlanıyor..." />;

  const updateMealText = (mealKey, value) => {
    setMealTexts((prev) => ({ ...prev, [mealKey]: value }));
  };

  const pickMealPhoto = async (source) => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('İzin Gerekli', source === 'camera' ? 'Kamera kullanımı için izin vermelisin.' : 'Galeriden fotoğraf seçmek için izin vermelisin.');
        return;
      }

      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      setMealPhotos((prev) => ({ ...prev, [selectedMealKey]: result.assets[0] }));
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Fotoğraf seçilemedi.');
    }
  };

  // Henüz kaydedilmemiş, sadece önizlemede duran fotoğrafı kaldırır — hiçbir şey paylaşılmaz.
  const removePickedPhoto = () => {
    setMealPhotos((prev) => ({ ...prev, [selectedMealKey]: null }));
  };

  // Daha önce kaydedilip veliye açık olan fotoğrafı kaldırır (metin kalır).
  const removePublishedPhoto = () => {
    if (!todayMeal?.dailySourceId) return;

    Alert.alert(
      'Fotoğrafı Kaldır',
      `${selectedMeal.title} fotoğrafı veli ekranından kaldırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              await update(ref(database, `yemekListeleri/${todayMeal.dailySourceId}/ogunler/${selectedMealKey}`), {
                fotoUrl: '',
                fotoPath: '',
                updatedAt: Date.now(),
              });
            } catch (err) {
              console.error(err);
              Alert.alert('Hata', 'Fotoğraf kaldırılamadı.');
            }
          },
        },
      ]
    );
  };

  const saveTodayMeals = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı. Öğretmenin bir sınıfa bağlı olması gerekiyor.');

    const hasAnyText = MEALS.some((meal) => String(mealTexts[meal.key] || '').trim());
    const hasAnyPhoto = MEALS.some((meal) => mealPhotos[meal.key]) || MEALS.some((meal) => getMealPhoto(todayMeal?.ogunler?.[meal.key]));

    if (!hasAnyText && !hasAnyPhoto) {
      return Alert.alert('Eksik Bilgi', 'Yayınlamak için en az bir öğün bilgisi veya fotoğraf girmelisin.');
    }

    setSaving(true);
    try {
      const finalKresId = kresId || currentClass.kresId || '';
      const now = Date.now();
      const photoMap = {};

      for (const meal of MEALS) {
        const currentValue = todayMeal?.ogunler?.[meal.key] || {};
        photoMap[meal.key] = {
          url: getMealPhoto(currentValue),
          path: getMealPhotoPath(currentValue),
        };
      }

      // FAZ 10 — 3 öğünün fotoğrafı da seçilmişse hepsini burada, aynı
      // kaydetme işleminde, paralel olarak yüklüyoruz.
      const pendingUploads = MEALS.filter((meal) => mealPhotos[meal.key]?.uri);
      if (pendingUploads.length > 0) {
        const uploadedEntries = await Promise.all(
          pendingUploads.map((meal) => uploadMealPhoto(mealPhotos[meal.key], finalKresId, currentClass.id, meal.key))
        );
        pendingUploads.forEach((meal, index) => {
          photoMap[meal.key] = uploadedEntries[index];
        });
      }

      const ogunler = MEALS.reduce((acc, meal) => {
        const photoData = photoMap[meal.key] || { url: '', path: '' };
        acc[meal.key] = {
          text: String(mealTexts[meal.key] || '').trim(),
          fotoUrl: photoData.url || '',
          fotoPath: photoData.path || '',
          updatedAt: now,
        };
        return acc;
      }, {});

      const payload = {
        kresId: finalKresId,
        sinifId: currentClass.id,
        sinifAdi: currentClass.ad || '',
        olusturanId: teacherId || '',
        olusturanRol: 'ogretmen',
        tip: 'gunluk',
        kaynak: 'ogretmen_gunluk',
        tarih: todayString(),
        baslik: `${currentClass.ad || 'Sınıf'} Günlük Yemek Listesi`,
        ogunler,
        monthlySourceId: todayMeal?.monthlySourceId || '',
        aktif: true,
        updatedAt: now,
      };

      if (todayMeal?.dailySourceId) {
        await update(ref(database, `yemekListeleri/${todayMeal.dailySourceId}`), payload);
      } else {
        const newRef = push(ref(database, 'yemekListeleri'));
        await update(newRef, { ...payload, createdAt: now });
      }

      setMealPhotos({ kahvalti: null, ogle: null, araOgun: null });
      setSuccessToast(true);
    } catch (err) {
      console.error('Yemek listesi kaydedilemedi:', err?.code || err?.message || err);
      Alert.alert('Hata', `Yemek listesi kaydedilemedi. ${err?.code || err?.message || 'İnternet bağlantısını kontrol et.'}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedMeal = MEALS.find((meal) => meal.key === selectedMealKey) || MEALS[0];
  const existingPhoto = getMealPhoto(todayMeal?.ogunler?.[selectedMealKey]);
  const selectedMealPhoto = mealPhotos[selectedMealKey];
  const previewPhoto = selectedMealPhoto?.uri || existingPhoto;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message="Yemek listesi kaydedildi" onHide={() => setSuccessToast(false)} />
      <AppSuccessToast visible={monthlySuccessToast} message={`${monthLabel} yemek listesi yayınlandı`} onHide={() => setMonthlySuccessToast(false)} />
      <ScreenHeader navigation={navigation} title="Yemek Listesi" subtitle={currentClass?.ad || 'Sınıfım'} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, tab === 'today' && styles.tabActive]} onPress={() => setTab('today')} activeOpacity={0.85}>
              <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>Bugün</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'monthly' && styles.tabActive]} onPress={() => setTab('monthly')} activeOpacity={0.85}>
              <Text style={[styles.tabText, tab === 'monthly' && styles.tabTextActive]}>Aylık</Text>
            </TouchableOpacity>
          </View>

          {!currentClass ? (
            <EmptyState icon="🏫" title="Sınıf ataması yok" desc="Öğretmenin yemek listesi girebilmesi için yönetici tarafından bir sınıfa atanması gerekir." />
          ) : tab === 'today' ? (
            <>
              <MealTodayCard item={todayMeal} className={currentClass?.ad || ''} title="Günlük Yemek Listesi" />
              <View style={styles.editorCard}>
                <Text style={styles.editorTitle}>🍽️ Bugünün yemek listesini gir</Text>
                <Text style={styles.editorDesc}>Her öğün için ayrı fotoğraf seçebilirsin, hepsi "Kaydet"e basınca birlikte yüklenir ve veli ekranında sınıf listesi olarak görünür.</Text>

                {MEALS.map((meal) => {
                  const mealHasPhoto = !!(mealPhotos[meal.key]?.uri || getMealPhoto(todayMeal?.ogunler?.[meal.key]));
                  return (
                  <View key={meal.key} style={[styles.mealInputCard, selectedMealKey === meal.key && styles.mealInputCardActive]}>
                    <TouchableOpacity style={styles.mealInputHeader} onPress={() => setSelectedMealKey(meal.key)} activeOpacity={0.85}>
                      <Text style={styles.mealInputTitle}>{meal.icon} {meal.title}</Text>
                      <Text style={styles.mealInputHint}>
                        {mealHasPhoto ? '📷 Foto eklendi' : selectedMealKey === meal.key ? 'Fotoğraf buraya eklenir' : 'Fotoğraf için seç'}
                      </Text>
                    </TouchableOpacity>
                    <MealAutocompleteInput
                      ogun={meal.key}
                      style={styles.input}
                      value={mealTexts[meal.key]}
                      onFocus={() => setSelectedMealKey(meal.key)}
                      onChangeText={(value) => updateMealText(meal.key, value)}
                      placeholder={`${meal.title} yaz`}
                      theme={THEME}
                    />
                  </View>
                  );
                })}

                <View style={styles.photoInfoCard}>
                  <Text style={styles.photoInfoTitle}>{selectedMeal.icon} {selectedMeal.title} fotoğrafı</Text>
                  <Text style={styles.photoInfoText}>Galeri veya kameradan seçilen fotoğraf bu öğüne eklenir.</Text>
                </View>

                {previewPhoto ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: previewPhoto }} style={styles.photoPreview} />
                    {selectedMealPhoto ? (
                      <TouchableOpacity style={styles.photoRemoveBtn} onPress={removePickedPhoto} activeOpacity={0.85}>
                        <Text style={styles.photoRemoveBtnText}>Sil</Text>
                      </TouchableOpacity>
                    ) : existingPhoto ? (
                      <TouchableOpacity style={styles.photoRemoveBtn} onPress={removePublishedPhoto} activeOpacity={0.85}>
                        <Text style={styles.photoRemoveBtnText}>Yayından Kaldır</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.photoButtonRow}>
                  <TouchableOpacity style={styles.photoButton} onPress={() => pickMealPhoto('gallery')} activeOpacity={0.85}>
                    <Text style={styles.photoButtonText}>🖼️ Galeri</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={() => pickMealPhoto('camera')} activeOpacity={0.85}>
                    <Text style={styles.photoButtonText}>📷 Kamera</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={saveTodayMeals} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Bugünün Listesini Kaydet</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : tab === 'monthly' ? (
            <>
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

              {monthlyPublishedCount > 0 ? (
                <View style={styles.publishedCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.publishedTitle}>✅ {monthLabel} yayında</Text>
                    <Text style={styles.publishedText}>Veliler şu an bu ayın listesini görüyor.</Text>
                  </View>
                  <TouchableOpacity disabled={monthlyUnpublishing} style={[styles.unpublishButton, monthlyUnpublishing && { opacity: 0.6 }]} onPress={confirmUnpublishMonthly} activeOpacity={0.85}>
                    <Text style={styles.unpublishButtonText}>{monthlyUnpublishing ? 'Kaldırılıyor...' : 'Yayından Kaldır'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.utilityRow}>
                <TouchableOpacity disabled={monthlyCopying} style={[styles.copyButton, styles.utilityFlex, monthlyCopying && { opacity: 0.6 }]} onPress={handleCopyPreviousMonthlyMonth} activeOpacity={0.85}>
                  <Text style={styles.copyButtonText}>{monthlyCopying ? 'Kopyalanıyor...' : '📋 Geçen Ayı Kopyala'}</Text>
                </TouchableOpacity>
                <MonthlyArchivePicker
                  kresId={kresId}
                  nodePath={MONTHLY_NODE_PATH}
                  kaynak={MONTHLY_KAYNAK}
                  matchExtra={currentClass?.id ? forTeacherClass(currentClass.id) : undefined}
                  currentMonthKey={monthKey}
                  onSelectMonth={jumpToMonth}
                  theme={THEME}
                />
              </View>

              <MonthlyCalendarView
                days={monthlyDaysWithContent}
                view={monthlyView}
                onChangeView={setMonthlyView}
                selectedDateKey={monthlySelectedDateKey}
                onSelectDay={setMonthlySelectedDateKey}
                theme={THEME}
                renderDayPreview={(day) => {
                  const preview = monthlyMealPreview(monthlyValues[day.dateKey]);
                  return preview ? <Text style={styles.previewText} numberOfLines={1}>{preview}</Text> : <Text style={styles.previewEmpty}>Boş</Text>;
                }}
              />

              <TouchableOpacity disabled={monthlySaving} style={[styles.saveButton, { opacity: monthlySaving ? 0.6 : 1 }]} onPress={confirmPublishMonthly} activeOpacity={0.85}>
                {monthlySaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{monthLabel} Listesini Yayınla</Text>}
              </TouchableOpacity>

              <View style={{ marginTop: 14 }}>
                <MonthlyDocumentPdfBar
                  kresId={kresId}
                  nodePath={MONTHLY_NODE_PATH}
                  kaynak={MONTHLY_KAYNAK}
                  sinifId={currentClass?.id}
                  sinifAd={currentClass?.ad}
                  docType="yemek"
                  monthKey={monthKey}
                  monthLabel={monthLabel}
                  theme={THEME}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!monthlySelectedDay} transparent animationType="slide" onRequestClose={() => setMonthlySelectedDateKey('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{monthlySelectedDay?.label || ''}</Text>
              <TouchableOpacity onPress={() => setMonthlySelectedDateKey('')} activeOpacity={0.8}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Kahvaltı</Text>
            <MealChipListInput
              ogun="kahvalti"
              values={monthlySelectedValue.kahvalti}
              onChange={(list) => updateMonthlyList(monthlySelectedDateKey, 'kahvalti', list)}
              placeholder="Kahvaltı yemeği ekle"
              theme={THEME}
            />

            <Text style={styles.modalLabel}>Öğle Yemeği</Text>
            <MealChipListInput
              ogun="ogle"
              values={monthlySelectedValue.ogle}
              onChange={(list) => updateMonthlyList(monthlySelectedDateKey, 'ogle', list)}
              placeholder="Öğle yemeği ekle"
              theme={THEME}
            />

            <Text style={styles.modalLabel}>Ara Öğün</Text>
            <MealChipListInput
              ogun="araOgun"
              values={monthlySelectedValue.araOgun}
              onChange={(list) => updateMonthlyList(monthlySelectedDateKey, 'araOgun', list)}
              placeholder="Ara öğün ekle"
              theme={THEME}
            />

            {hasMonthlyMealContent(monthlySelectedValue) ? (
              <TouchableOpacity style={styles.modalClearButton} onPress={() => clearMonthlyDay(monthlySelectedDateKey)} activeOpacity={0.85}>
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
  content: { padding: 16, paddingBottom: 180 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  tabActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  tabText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#FFF' },
  editorCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  editorTitle: { color: THEME.primary, fontWeight: '900', fontSize: 17 },
  editorDesc: { color: THEME.muted, fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 },
  mealInputCard: { backgroundColor: THEME.bg, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 10, marginBottom: 10 },
  mealInputCardActive: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  mealInputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 7 },
  mealInputTitle: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  mealInputHint: { color: THEME.primary, fontWeight: '800', fontSize: 11, flexShrink: 1, textAlign: 'right' },
  input: { minHeight: 54, backgroundColor: THEME.card, borderRadius: 14, padding: 12, color: THEME.text, borderWidth: 1, borderColor: THEME.border, textAlignVertical: 'top', fontWeight: '700' },
  photoInfoCard: { backgroundColor: THEME.primarySoft, borderRadius: 16, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  photoInfoTitle: { color: THEME.primary, fontWeight: '900', fontSize: 13 },
  photoInfoText: { color: THEME.muted, fontWeight: '700', fontSize: 11, marginTop: 3 },
  photoPreview: { width: '100%', height: 160, borderRadius: 16, backgroundColor: THEME.bg, marginBottom: 10 },
  photoPreviewWrap: { position: 'relative', marginBottom: 10 },
  photoRemoveBtn: { position: 'absolute', right: 8, bottom: 18, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  photoRemoveBtnText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  photoButtonRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  photoButton: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  photoButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  monthInfoCard: { backgroundColor: THEME.primarySoft, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  monthInfoTitle: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  monthInfoText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 4 },
  monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.primary, borderRadius: 22, padding: 14, marginBottom: 12 },
  monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: -2 },
  monthCenter: { alignItems: 'center' },
  monthLabel: { color: '#fff', fontSize: 20, fontWeight: '900' },
  monthHint: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 3 },
  publishedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  modalClose: { color: THEME.primary, fontWeight: '900' },
  modalInput: { minHeight: 46, backgroundColor: THEME.bg, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, paddingVertical: 10, color: THEME.text, fontWeight: '700', marginBottom: 10, textAlignVertical: 'top' },
  modalLabel: { fontSize: 12, fontWeight: '900', color: THEME.muted, marginBottom: 8, textTransform: 'uppercase' },
  modalClearButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,77,109,0.12)' },
  modalClearButtonText: { color: '#FF4D6D', fontWeight: '900' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  type: { color: THEME.primary, fontWeight: '900', marginBottom: 7 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  date: { color: THEME.muted, marginTop: 5, fontWeight: '700' },
  mealItem: { marginTop: 8 },
  mealText: { color: THEME.text, fontWeight: '700', lineHeight: 19 },
  mealPhoto: { width: '100%', height: 170, borderRadius: 14, marginTop: 8, backgroundColor: THEME.bg },
});
