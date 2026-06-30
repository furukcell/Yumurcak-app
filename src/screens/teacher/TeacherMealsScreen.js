// ============================================================
// YUMURCAK — TeacherMealsScreen.js
// Öğretmen parça parça günlük yemek girişi + aylık kurum listesi görünümü
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { ref, push, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { database, storage } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import MealTodayCard, { MEALS, getMealText, getMealPhoto } from '../../components/MealTodayCard';

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

function parseDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return null;
  const date = new Date(`${dateKey}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
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

function isRecentDailyMeal(item) {
  return item?.kaynak !== 'admin_aylik' && item?.kaynak !== 'aylik_plan' && isDateInLast7Days(getMealDateKey(item));
}

function isExpiredDailyMeal(item) {
  return item?.kaynak !== 'admin_aylik' && item?.kaynak !== 'aylik_plan' && isDateExpired(getMealDateKey(item));
}

function getMealPhotoPath(value) {
  if (!value || typeof value === 'string') return '';
  return value.fotoPath || value.photoPath || value.imagePath || value.storagePath || '';
}

function getPhotoFileInfo(asset, mealKey) {
  const contentType = asset?.mimeType || 'image/jpeg';
  const uriPart = String(asset?.uri || '').split('?')[0];
  const rawExt = uriPart.includes('.') ? uriPart.split('.').pop() : '';
  let extension = String(rawExt || '').toLowerCase();

  if (!extension || extension.length > 5) {
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('heic') || contentType.includes('heif')) extension = 'heic';
    else extension = 'jpg';
  }

  const fileName = `${Date.now()}_${mealKey}.${extension}`;
  return { contentType, fileName };
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
  const safeKresId = kresId || 'kres';
  const safeSinifId = sinifId || 'sinif';
  const paths = [
    `yemekFotograflari/${safeKresId}/${safeSinifId}/${fileName}`,
    `galeri/${safeKresId}/yemekFotograflari/${safeSinifId}/${fileName}`,
  ];

  let lastError = null;

  for (const path of paths) {
    try {
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob, { contentType });
      const url = await getDownloadURL(fileRef);
      return { url, path };
    } catch (err) {
      lastError = err;
      console.warn('Yemek fotoğrafı yükleme denemesi başarısız:', path, err?.code || err?.message || err);
    }
  }

  throw lastError || new Error('Yemek fotoğrafı yüklenemedi.');
}

async function deleteMealPhoto(value) {
  const path = getMealPhotoPath(value);
  if (!path) return;

  try {
    await deleteObject(storageRef(storage, path));
  } catch (err) {
    console.warn('Yemek fotoğrafı silinemedi:', err?.message || err);
  }
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

function getMealConfig(key) {
  return MEALS.find((item) => item.key === key) || MEALS[0];
}

export default function TeacherMealsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, meals } = useTeacherData();

  const [tab, setTab] = useState('today');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [selectedMealKey, setSelectedMealKey] = useState('kahvalti');
  const [mealText, setMealText] = useState('');
  const [mealPhoto, setMealPhoto] = useState(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const visibleMeals = useMemo(() => {
    return meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === currentClass?.id)
      .sort((a, b) => String(b.tarih || b.baslangicTarihi || b.createdAt || '').localeCompare(String(a.tarih || a.baslangicTarihi || a.createdAt || '')));
  }, [meals, kresId, currentClass?.id]);

  const dailyMeals = useMemo(() => visibleMeals.filter((item) => isRecentDailyMeal(item)), [visibleMeals]);

  const monthlyMeals = useMemo(() => {
    return visibleMeals
      .filter((item) => item.kaynak === 'admin_aylik')
      .filter((item) => item.ayKey === currentMonthKey)
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [visibleMeals, currentMonthKey]);

  const today = todayString();
  const todayDailyMeal = visibleMeals.find((item) => item.tarih === today && item.kaynak !== 'admin_aylik') || null;
  const todayMonthlyMeal = visibleMeals.find((item) => item.tarih === today && item.kaynak === 'admin_aylik') || null;
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
          const ogunler = item.ogunler || {};
          await Promise.all([
            deleteMealPhoto(ogunler.kahvalti),
            deleteMealPhoto(ogunler.ogle),
            deleteMealPhoto(ogunler.araOgun),
          ]);
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
    const value = todayMeal?.ogunler?.[selectedMealKey];
    setMealText(getMealText(value));
    setMealPhoto(null);
    setRemoveExistingPhoto(false);
  }, [selectedMealKey, todayMeal?.dailySourceId, todayMeal?.monthlySourceId, todayMeal?.updatedAt, todayMeal?.createdAt]);

  if (loading) return <LoadingState text="Yemek listesi hazırlanıyor..." />;

  const pickMealPhoto = async (source) => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert('İzin Gerekli', 'Kamera kullanımı için izin vermelisin.');
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return Alert.alert('İzin Gerekli', 'Galeriden fotoğraf seçmek için izin vermelisin.');
      }

      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      setMealPhoto(result.assets[0]);
      setRemoveExistingPhoto(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Fotoğraf seçilemedi.');
    }
  };

  const openMealEditor = (mealKey) => {
    const value = todayMeal?.ogunler?.[mealKey];
    setSelectedMealKey(mealKey);
    setMealText(getMealText(value));
    setMealPhoto(null);
    setRemoveExistingPhoto(false);
    setTab('today');
  };

  const saveSelectedMeal = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!mealText.trim() && !mealPhoto && !getMealPhoto(todayMeal?.ogunler?.[selectedMealKey])) {
      return Alert.alert('Eksik Bilgi', 'Bu öğün için yazı veya fotoğraf eklemelisin.');
    }

    setSaving(true);
    try {
      const finalKresId = kresId || currentClass.kresId || '';
      const currentValue = todayMeal?.ogunler?.[selectedMealKey] || {};
      let photoData = {
        url: removeExistingPhoto ? '' : getMealPhoto(currentValue),
        path: removeExistingPhoto ? '' : getMealPhotoPath(currentValue),
      };

      if (mealPhoto?.uri) {
        photoData = await uploadMealPhoto(mealPhoto, finalKresId, currentClass.id, selectedMealKey);
      }

      const mealPayload = {
        text: mealText.trim(),
        fotoUrl: photoData.url,
        fotoPath: photoData.path,
        updatedAt: Date.now(),
      };

      const now = Date.now();
      const dailyId = todayMeal?.dailySourceId || todayMeal?.id;
      if (dailyId) {
        await update(ref(database, `yemekListeleri/${dailyId}`), {
          [`ogunler/${selectedMealKey}`]: mealPayload,
          updatedAt: now,
        });
      } else {
        const newRef = push(ref(database, 'yemekListeleri'));
        await update(newRef, {
          kresId: finalKresId,
          sinifId: currentClass.id,
          olusturanId: teacherId || '',
          olusturanRol: 'ogretmen',
          tip: 'gunluk',
          kaynak: 'ogretmen_gunluk',
          tarih: todayString(),
          baslik: `${currentClass.ad || 'Sınıf'} Günlük Yemek Listesi`,
          ogunler: { [selectedMealKey]: mealPayload },
          monthlySourceId: todayMeal?.monthlySourceId || '',
          aktif: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      setMealPhoto(null);
      setRemoveExistingPhoto(false);
      setSuccessToast(true);
    } catch (err) {
      console.error('Öğün kaydedilemedi:', err?.code || err?.message || err);
      Alert.alert('Hata', `Öğün kaydedilemedi. ${err?.code || err?.message || 'Fotoğraf yükleme izni veya internet bağlantısını kontrol et.'}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedMeal = getMealConfig(selectedMealKey);
  const existingPhoto = getMealPhoto(todayMeal?.ogunler?.[selectedMealKey]);
  const previewPhoto = mealPhoto?.uri || (!removeExistingPhoto ? existingPhoto : '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={`${selectedMeal.title} kaydedildi`} onHide={() => setSuccessToast(false)} />
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
            <TouchableOpacity style={[styles.tab, tab === 'daily' && styles.tabActive]} onPress={() => setTab('daily')} activeOpacity={0.85}>
              <Text style={[styles.tabText, tab === 'daily' && styles.tabTextActive]}>Liste</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'monthly' && styles.tabActive]} onPress={() => setTab('monthly')} activeOpacity={0.85}>
              <Text style={[styles.tabText, tab === 'monthly' && styles.tabTextActive]}>Aylık</Text>
            </TouchableOpacity>
          </View>

          {tab === 'today' ? (
            <>
              <MealTodayCard item={todayMeal} className={currentClass?.ad || ''} title="Günlük Yemek Listesi" editable onMealPress={openMealEditor} />
              <View style={styles.editorCard}>
                <Text style={styles.editorTitle}>{selectedMeal.icon} {selectedMeal.title} ekle / güncelle</Text>
                <Text style={styles.editorDesc}>Aylık menü varsa bilgiler otomatik gelir. Değişiklik veya fotoğraf eklediğinde sadece seçili öğün güncellenir ve veli ekranında görünür.</Text>

                <View style={styles.mealSelectorRow}>
                  {MEALS.map((meal) => (
                    <TouchableOpacity key={meal.key} style={[styles.mealSelector, selectedMealKey === meal.key && styles.mealSelectorActive]} onPress={() => openMealEditor(meal.key)} activeOpacity={0.85}>
                      <Text style={[styles.mealSelectorText, selectedMealKey === meal.key && styles.mealSelectorTextActive]}>{meal.icon} {meal.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput style={styles.input} value={mealText} onChangeText={setMealText} placeholder={`${selectedMeal.title} açıklaması`} placeholderTextColor="#999" multiline />

                {previewPhoto ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: previewPhoto }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => { setMealPhoto(null); setRemoveExistingPhoto(true); }} activeOpacity={0.85}>
                      <Text style={styles.removePhotoText}>Fotoğrafı kaldır</Text>
                    </TouchableOpacity>
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

                <TouchableOpacity style={styles.saveButton} onPress={saveSelectedMeal} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{selectedMeal.title} Kaydet</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : tab === 'monthly' ? (
            monthlyMeals.length === 0 ? (
              <EmptyState icon="📅" title="Aylık yemek listesi yok" desc={`${formatMonthLabel(currentMonthKey)} için yönetici aylık liste yayınladığında burada görünür.`} />
            ) : (
              <>
                <View style={styles.monthInfoCard}>
                  <Text style={styles.monthInfoTitle}>📅 {formatMonthLabel(currentMonthKey)} Aylık Yemek Listesi</Text>
                  <Text style={styles.monthInfoText}>Yönetici tarafından yayınlanan kurum geneli aylık menü.</Text>
                </View>
                {monthlyMeals.map((item) => <MealCard key={item.id} item={item} />)}
              </>
            )
          ) : dailyMeals.length === 0 ? (
            <EmptyState icon="🍽️" title="Son 7 günlük yemek listesi yok" desc="Yemek listesi eklediğinde burada görünür." />
          ) : (
            dailyMeals.map((item) => <MealCard key={item.id} item={item} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MealCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{item.kaynak === 'admin_aylik' ? '📅 Aylık Liste' : item.sinifId ? '👩‍🏫 Sınıf Listesi' : '🏫 Kurum Listesi'}</Text>
      <Text style={styles.title}>{item.baslik || 'Yemek Listesi'}</Text>
      <Text style={styles.date}>{formatDate(item.tarih || item.baslangicTarihi)} {item.bitisTarihi ? `- ${formatDate(item.bitisTarihi)}` : ''}</Text>
      {renderMeals(item)}
    </View>
  );
}

function renderMeal(label, icon, value) {
  const text = getMealText(value);
  const fotoUrl = getMealPhoto(value);
  if (!text && !fotoUrl) return null;
  return (
    <View style={styles.mealItem}>
      {text ? <Text style={styles.mealText}>{icon} {label}: {text}</Text> : <Text style={styles.mealText}>{icon} {label}</Text>}
      {fotoUrl ? <Image source={{ uri: fotoUrl }} style={styles.mealPhoto} /> : null}
    </View>
  );
}

function renderMeals(item) {
  const ogunler = item.ogunler || {};
  return (
    <View style={{ marginTop: 10 }}>
      {renderMeal('Kahvaltı', '🥐', ogunler.kahvalti)}
      {renderMeal('Öğle', '🍲', ogunler.ogle)}
      {renderMeal('Ara Öğün', '🍎', ogunler.araOgun)}
    </View>
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
  mealSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  mealSelector: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 99, backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.border },
  mealSelectorActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  mealSelectorText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  mealSelectorTextActive: { color: '#FFF' },
  input: { minHeight: 54, backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border, textAlignVertical: 'top', fontWeight: '700' },
  photoButtonRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  photoButton: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  photoButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  photoPreviewWrap: { marginBottom: 10 },
  photoPreview: { width: '100%', height: 160, borderRadius: 16, backgroundColor: THEME.bg },
  removePhotoButton: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#FFE4E8', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 },
  removePhotoText: { color: THEME.red, fontWeight: '900', fontSize: 12 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  monthInfoCard: { backgroundColor: THEME.primarySoft, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  monthInfoTitle: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  monthInfoText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  type: { color: THEME.primary, fontWeight: '900', marginBottom: 7 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  date: { color: THEME.muted, marginTop: 5, fontWeight: '700' },
  mealItem: { marginTop: 8 },
  mealText: { color: THEME.text, fontWeight: '700', lineHeight: 19 },
  mealPhoto: { width: '100%', height: 170, borderRadius: 14, marginTop: 8, backgroundColor: THEME.bg },
});