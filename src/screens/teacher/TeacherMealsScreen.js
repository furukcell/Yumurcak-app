// ============================================================
// YUMURCAK — TeacherMealsScreen.js
// Öğretmen günlük yemek girişi + aylık kurum listesi görünümü
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { ref, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { database, storage } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

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

function getMealText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.text || value.aciklama || '';
}

function getMealPhoto(value) {
  if (!value || typeof value === 'string') return '';
  return value.fotoUrl || value.photoUrl || value.imageUrl || '';
}

async function uploadMealPhoto(uri, kresId, sinifId, mealKey) {
  if (!uri) return '';
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `yemekFotograflari/${kresId || 'kres'}/${sinifId || 'sinif'}/${Date.now()}_${mealKey}.jpg`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}

export default function TeacherMealsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, meals } = useTeacherData();

  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('daily');
  const [tarih, setTarih] = useState(todayString());
  const [kahvalti, setKahvalti] = useState('');
  const [ogle, setOgle] = useState('');
  const [araOgun, setAraOgun] = useState('');
  const [kahvaltiFoto, setKahvaltiFoto] = useState(null);
  const [ogleFoto, setOgleFoto] = useState(null);
  const [araOgunFoto, setAraOgunFoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const visibleMeals = useMemo(() => {
    return meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === currentClass?.id)
      .sort((a, b) => String(b.tarih || b.baslangicTarihi || b.createdAt || '').localeCompare(String(a.tarih || a.baslangicTarihi || a.createdAt || '')));
  }, [meals, kresId, currentClass?.id]);

  const dailyMeals = useMemo(() => {
    return visibleMeals.filter((item) => item.kaynak !== 'admin_aylik');
  }, [visibleMeals]);

  const monthlyMeals = useMemo(() => {
    return visibleMeals
      .filter((item) => item.kaynak === 'admin_aylik')
      .filter((item) => item.ayKey === currentMonthKey)
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [visibleMeals, currentMonthKey]);

  if (loading) return <LoadingState text="Yemek listesi hazırlanıyor..." />;

  const pickMealPhoto = async (mealKey, source) => {
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
      const photo = result.assets[0];

      if (mealKey === 'kahvalti') setKahvaltiFoto(photo);
      if (mealKey === 'ogle') setOgleFoto(photo);
      if (mealKey === 'araOgun') setAraOgunFoto(photo);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Fotoğraf seçilemedi.');
    }
  };

  const removeMealPhoto = (mealKey) => {
    if (mealKey === 'kahvalti') setKahvaltiFoto(null);
    if (mealKey === 'ogle') setOgleFoto(null);
    if (mealKey === 'araOgun') setAraOgunFoto(null);
  };

  const saveMeal = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!tarih.trim()) return Alert.alert('Eksik Bilgi', 'Tarih zorunludur.');
    if (!kahvalti.trim() && !ogle.trim() && !araOgun.trim() && !kahvaltiFoto && !ogleFoto && !araOgunFoto) {
      return Alert.alert('Eksik Bilgi', 'En az bir öğün veya fotoğraf eklemelisin.');
    }

    setSaving(true);
    try {
      const finalKresId = kresId || currentClass.kresId || '';
      const kahvaltiFotoUrl = await uploadMealPhoto(kahvaltiFoto?.uri, finalKresId, currentClass.id, 'kahvalti');
      const ogleFotoUrl = await uploadMealPhoto(ogleFoto?.uri, finalKresId, currentClass.id, 'ogle');
      const araOgunFotoUrl = await uploadMealPhoto(araOgunFoto?.uri, finalKresId, currentClass.id, 'araOgun');

      await push(ref(database, 'yemekListeleri'), {
        kresId: finalKresId,
        sinifId: currentClass.id,
        olusturanId: teacherId || '',
        olusturanRol: 'ogretmen',
        tip: 'gunluk',
        tarih: tarih.trim(),
        baslik: `${currentClass.ad || 'Sınıf'} Günlük Yemek Listesi`,
        ogunler: {
          kahvalti: { text: kahvalti.trim(), fotoUrl: kahvaltiFotoUrl },
          ogle: { text: ogle.trim(), fotoUrl: ogleFotoUrl },
          araOgun: { text: araOgun.trim(), fotoUrl: araOgunFotoUrl },
        },
        aktif: true,
        createdAt: Date.now(),
      });

      setKahvalti('');
      setOgle('');
      setAraOgun('');
      setKahvaltiFoto(null);
      setOgleFoto(null);
      setAraOgunFoto(null);
      setTarih(todayString());
      setShowForm(false);
      setSuccessToast(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Yemek listesi kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message="Yemek listesi kaydedildi"
        onHide={() => setSuccessToast(false)}
      />

      <ScreenHeader
        navigation={navigation}
        title="Yemek Listesi"
        subtitle={currentClass?.ad || 'Sınıfım'}
        rightText={showForm ? 'Kapat' : '+ Ekle'}
        onRightPress={() => setShowForm((v) => !v)}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sınıf İçin Günlük Yemek</Text>
            <TextInput style={styles.input} value={tarih} onChangeText={setTarih} placeholder="2026-06-20" placeholderTextColor="#999" />
            <MealInput
              label="Kahvaltı"
              value={kahvalti}
              onChangeText={setKahvalti}
              photo={kahvaltiFoto}
              onGallery={() => pickMealPhoto('kahvalti', 'gallery')}
              onCamera={() => pickMealPhoto('kahvalti', 'camera')}
              onRemovePhoto={() => removeMealPhoto('kahvalti')}
            />
            <MealInput
              label="Öğle yemeği"
              value={ogle}
              onChangeText={setOgle}
              photo={ogleFoto}
              onGallery={() => pickMealPhoto('ogle', 'gallery')}
              onCamera={() => pickMealPhoto('ogle', 'camera')}
              onRemovePhoto={() => removeMealPhoto('ogle')}
            />
            <MealInput
              label="Ara öğün"
              value={araOgun}
              onChangeText={setAraOgun}
              photo={araOgunFoto}
              onGallery={() => pickMealPhoto('araOgun', 'gallery')}
              onCamera={() => pickMealPhoto('araOgun', 'camera')}
              onRemovePhoto={() => removeMealPhoto('araOgun')}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveMeal} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Yemek Listesini Kaydet</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'daily' && styles.tabActive]} onPress={() => setTab('daily')} activeOpacity={0.85}>
            <Text style={[styles.tabText, tab === 'daily' && styles.tabTextActive]}>Günlük Liste</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'monthly' && styles.tabActive]} onPress={() => setTab('monthly')} activeOpacity={0.85}>
            <Text style={[styles.tabText, tab === 'monthly' && styles.tabTextActive]}>Aylık Liste</Text>
          </TouchableOpacity>
        </View>

        {tab === 'monthly' ? (
          monthlyMeals.length === 0 ? (
            <EmptyState icon="📅" title="Aylık yemek listesi yok" desc={`${formatMonthLabel(currentMonthKey)} için yönetici aylık liste yayınladığında burada görünür.`} />
          ) : (
            <>
              <View style={styles.monthInfoCard}>
                <Text style={styles.monthInfoTitle}>📅 {formatMonthLabel(currentMonthKey)} Aylık Yemek Listesi</Text>
                <Text style={styles.monthInfoText}>Yönetici tarafından yayınlanan kurum geneli aylık menü.</Text>
              </View>
              {monthlyMeals.map((item) => (
                <MealCard key={item.id} item={item} />
              ))}
            </>
          )
        ) : dailyMeals.length === 0 ? (
          <EmptyState icon="🍽️" title="Yemek listesi yok" desc="Yemek listesi eklediğinde burada görünür." />
        ) : (
          dailyMeals.map((item) => (
            <MealCard key={item.id} item={item} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MealInput({ label, value, onChangeText, photo, onGallery, onCamera, onRemovePhoto }) {
  return (
    <View style={styles.mealInputBox}>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor="#999" />
      {photo?.uri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <TouchableOpacity style={styles.removePhotoButton} onPress={onRemovePhoto} activeOpacity={0.85}>
            <Text style={styles.removePhotoText}>Fotoğrafı kaldır</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.photoButtonRow}>
        <TouchableOpacity style={styles.photoButton} onPress={onGallery} activeOpacity={0.85}>
          <Text style={styles.photoButtonText}>🖼️ Galeri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={onCamera} activeOpacity={0.85}>
          <Text style={styles.photoButtonText}>📷 Kamera</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  content: { padding: 16, paddingBottom: 32 },
  formCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  formTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  mealInputBox: { marginBottom: 10 },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
  photoButtonRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  photoButton: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  photoButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  photoPreviewWrap: { marginBottom: 10 },
  photoPreview: { width: '100%', height: 150, borderRadius: 14, backgroundColor: THEME.bg },
  removePhotoButton: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#FFE4E8', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 },
  removePhotoText: { color: THEME.red, fontWeight: '900', fontSize: 12 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  tabActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  tabText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#FFF' },
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