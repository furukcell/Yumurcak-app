// ============================================================
// YUMURCAK — TeacherMealsScreen.js
// Öğretmen günlük yemek girişi + yemek fotoğrafı + aylık kurum listesi
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { ref, push, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { database, storage } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import MealTodayCard, { MEALS, getMealText, getMealPhoto } from '../../components/MealTodayCard';
import MealAutocompleteInput from '../../components/MealAutocompleteInput';

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
  const [mealPhoto, setMealPhoto] = useState(null);

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
    setMealPhoto(null);
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
      setMealPhoto(result.assets[0]);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Fotoğraf seçilemedi.');
    }
  };

  // Henüz kaydedilmemiş, sadece önizlemede duran fotoğrafı kaldırır — hiçbir şey paylaşılmaz.
  const removePickedPhoto = () => {
    setMealPhoto(null);
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
    const hasAnyPhoto = mealPhoto || MEALS.some((meal) => getMealPhoto(todayMeal?.ogunler?.[meal.key]));

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

      if (mealPhoto?.uri) {
        photoMap[selectedMealKey] = await uploadMealPhoto(mealPhoto, finalKresId, currentClass.id, selectedMealKey);
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

      setMealPhoto(null);
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
  const previewPhoto = mealPhoto?.uri || existingPhoto;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message="Yemek listesi kaydedildi" onHide={() => setSuccessToast(false)} />
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

          {!currentClass ? (
            <EmptyState icon="🏫" title="Sınıf ataması yok" desc="Öğretmenin yemek listesi girebilmesi için yönetici tarafından bir sınıfa atanması gerekir." />
          ) : tab === 'today' ? (
            <>
              <MealTodayCard item={todayMeal} className={currentClass?.ad || ''} title="Günlük Yemek Listesi" />
              <View style={styles.editorCard}>
                <Text style={styles.editorTitle}>🍽️ Bugünün yemek listesini gir</Text>
                <Text style={styles.editorDesc}>Yazılar ve seçili öğünün fotoğrafı kaydedilince veli ekranında sınıf listesi olarak görünür.</Text>

                {MEALS.map((meal) => (
                  <View key={meal.key} style={[styles.mealInputCard, selectedMealKey === meal.key && styles.mealInputCardActive]}>
                    <TouchableOpacity style={styles.mealInputHeader} onPress={() => setSelectedMealKey(meal.key)} activeOpacity={0.85}>
                      <Text style={styles.mealInputTitle}>{meal.icon} {meal.title}</Text>
                      <Text style={styles.mealInputHint}>{selectedMealKey === meal.key ? 'Fotoğraf buraya eklenir' : 'Fotoğraf için seç'}</Text>
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
                ))}

                <View style={styles.photoInfoCard}>
                  <Text style={styles.photoInfoTitle}>{selectedMeal.icon} {selectedMeal.title} fotoğrafı</Text>
                  <Text style={styles.photoInfoText}>Galeri veya kameradan seçilen fotoğraf bu öğüne eklenir.</Text>
                </View>

                {previewPhoto ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: previewPhoto }} style={styles.photoPreview} />
                    {mealPhoto ? (
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
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  type: { color: THEME.primary, fontWeight: '900', marginBottom: 7 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  date: { color: THEME.muted, marginTop: 5, fontWeight: '700' },
  mealItem: { marginTop: 8 },
  mealText: { color: THEME.text, fontWeight: '700', lineHeight: 19 },
  mealPhoto: { width: '100%', height: 170, borderRadius: 14, marginTop: 8, backgroundColor: THEME.bg },
});
