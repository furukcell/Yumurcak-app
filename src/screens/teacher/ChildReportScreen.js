// ============================================================
// YUMURCAK — ChildReportScreen.js
// FAZ 2: Öğün detayları eklendi
// Kahvaltı / Öğle / Ara Öğün: yemedi, az_yedi, bitirdi
// FAZ 3: Bugün için zaten rapor girilmişse uyarı banner'ı
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ref, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { MOOD_LISTESI } from '../../constants';
import { THEME, ScreenHeader, getChildName, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

const MEAL_OPTIONS = [
  { key: 'yemedi', label: 'Yemedi' },
  { key: 'az_yedi', label: 'Az yedi' },
  { key: 'bitirdi', label: 'Bitirdi' },
];

const MEALS = [
  { key: 'kahvalti', label: 'Kahvaltı', emoji: '🥐' },
  { key: 'ogle', label: 'Öğle Yemeği', emoji: '🍲' },
  { key: 'araOgun', label: 'Ara Öğün', emoji: '🍎' },
];

export default function ChildReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params || {};
  const { kullanici } = useAuth();
  const teacherId = kullanici?.uid || kullanici?.id;

  const [mood, setMood] = useState('');
  const [yemek, setYemek] = useState({
    kahvalti: { durum: '', not: '' },
    ogle: { durum: '', not: '' },
    araOgun: { durum: '', not: '' },
  });
  const [sleepDuration, setSleepDuration] = useState('');
  const [toiletCount, setToiletCount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadyReportedToday, setAlreadyReportedToday] = useState(false);

  // Ekrana girince bugün için bu çocuğa ait rapor var mı kontrol ediyoruz.
  useEffect(() => {
    let cancelled = false;

    const checkExistingReport = async () => {
      if (!child?.id) {
        setCheckingExisting(false);
        return;
      }

      try {
        const today = todayString();
        const reportsRef = query(
          ref(database, 'gunlukRaporlar'),
          orderByChild('cocukId'),
          equalTo(child.id)
        );
        const snap = await get(reportsRef);
        const data = snap.val() || {};

        const hasToday = Object.values(data).some((item) => item.tarih === today);

        if (!cancelled) {
          setAlreadyReportedToday(hasToday);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    };

    checkExistingReport();

    return () => {
      cancelled = true;
    };
  }, [child?.id]);

  const handleSave = async () => {
    if (!child?.id) return Alert.alert('Hata', 'Çocuk bilgisi bulunamadı.');

    if (!sleepDuration || !toiletCount) {
      return Alert.alert('Eksik Bilgi', 'Uyku süresi ve tuvalet sayısı zorunludur.');
    }

    const anyMealSelected = MEALS.some((meal) => yemek[meal.key]?.durum);
    if (!anyMealSelected) {
      return Alert.alert('Eksik Bilgi', 'En az bir öğün için yemek durumu seçmelisin.');
    }

    setSaving(true);

    try {
      const childRef = ref(database, `cocuklar/${child.id}`);
      const childSnap = await get(childRef);
      const childData = childSnap.val() || child;

      await push(ref(database, 'gunlukRaporlar'), {
        kresId: childData.kresId || kullanici?.kresId || '',
        cocukId: child.id,
        sinifId: childData.sinifId || child.sinifId || '',
        ogretmenId: teacherId,
        teacherId,
        tarih: todayString(),
        ruhHali: mood,
        mood,
        yemek,
        uyku: { sure: Number(sleepDuration), not: '' },
        tuvalet: { sayi: Number(toiletCount), not: '' },
        not: note,
        createdAt: Date.now(),
      });

      setSuccessToast(true);
      setAlreadyReportedToday(true);

      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Rapor kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const setMealStatus = (mealKey, status) => {
    setYemek((prev) => ({
      ...prev,
      [mealKey]: {
        ...(prev[mealKey] || {}),
        durum: status,
      },
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message="Rapor kaydedildi"
        onHide={() => setSuccessToast(false)}
      />

      <ScreenHeader navigation={navigation} title="Günlük Rapor" subtitle={getChildName(child)} />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!checkingExisting && alreadyReportedToday ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Bugün bu çocuk için zaten bir rapor girilmiş. Yine de yeni bir rapor kaydedebilirsin.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Ruh Hali</Text>
        <View style={styles.moodContainer}>
          {MOOD_LISTESI.map((m) => (
            <TouchableOpacity
              key={m.label}
              style={[styles.moodButton, mood === m.label && styles.moodButtonActive]}
              onPress={() => setMood(m.label)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Yemek Detayları</Text>
        {MEALS.map((meal) => (
          <View key={meal.key} style={styles.mealCard}>
            <Text style={styles.mealTitle}>{meal.emoji} {meal.label}</Text>
            <View style={styles.mealOptions}>
              {MEAL_OPTIONS.map((option) => {
                const active = yemek[meal.key]?.durum === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.mealOptionButton, active && styles.mealOptionActive]}
                    onPress={() => setMealStatus(meal.key, option.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.mealOptionText, active && styles.mealOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Uyku Süresi (saat)</Text>
        <TextInput
          style={styles.input}
          value={sleepDuration}
          onChangeText={setSleepDuration}
          placeholder="Örn: 2"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>Tuvalet Sayısı</Text>
        <TextInput
          style={styles.input}
          value={toiletCount}
          onChangeText={setToiletCount}
          placeholder="Örn: 3"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>Öğretmen Notu</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder="Çocuk hakkında ek bilgiler..."
          multiline
          numberOfLines={4}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Raporu Kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 38 },
  warningBanner: {
    backgroundColor: '#FFF6CF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8C94F',
  },
  warningText: { color: '#7A6418', fontWeight: '800', fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: THEME.text, marginTop: 18, marginBottom: 10 },
  moodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodButton: {
    backgroundColor: THEME.card,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 82,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  moodButtonActive: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  moodEmoji: { fontSize: 24, marginBottom: 4 },
  moodLabel: { fontSize: 12, color: THEME.text, fontWeight: '800' },
  mealCard: { backgroundColor: THEME.card, borderRadius: 16, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  mealTitle: { fontSize: 15, fontWeight: '900', color: THEME.text, marginBottom: 10 },
  mealOptions: { flexDirection: 'row', gap: 8 },
  mealOptionButton: { flex: 1, backgroundColor: THEME.bg, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  mealOptionActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  mealOptionText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  mealOptionTextActive: { color: '#FFF' },
  input: {
    backgroundColor: THEME.card,
    padding: 13,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: THEME.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
