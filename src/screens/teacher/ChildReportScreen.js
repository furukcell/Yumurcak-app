// ============================================================
// YUMURCAK — ChildReportScreen.js
// FAZ 2: Öğün detayları eklendi
// Kahvaltı / Öğle / Ara Öğün: yemedi, az_yedi, bitirdi
// FAZ 3: Bugün için zaten rapor girilmişse uyarı banner'ı
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { MOOD_LISTESI } from '../../constants';
import { THEME, ScreenHeader, getChildName, todayString, useTeacherData } from './teacherShared';
import { translateMood } from '../../utils/moodLabel';
import AppSuccessToast from '../../components/AppSuccessToast';
import { computeTodayMenuItems } from '../../utils/todayMenu';

// Not: MEAL_OPTIONS/MEALS içindeki "key" alanları DB'ye yazılan ham
// değerler (yemek.durum, öğün adları) — bunlara dokunulmuyor, sadece
// ekranda gösterilen "label" metinleri t() ile çevriliyor.
const MEAL_OPTIONS = ['yemedi', 'az_yedi', 'bitirdi'];
const MEALS = [
  { key: 'kahvalti', emoji: '🥐' },
  { key: 'ogle', emoji: '🍲' },
  { key: 'araOgun', emoji: '🍎' },
];

export default function ChildReportScreen() {
  const { t } = useTranslation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params || {};
  const { kullanici } = useAuth();
  const teacherId = kullanici?.uid || kullanici?.id;
  const { kresId, currentClass, meals } = useTeacherData();

  // FAZ — Ürün Bazlı Yemek Takibi: bugünün menüsündeki her ürün için ayrı
  // Yedi/Yemedi tıklaması. Menü boşsa hiçbir şey gösterilmiyor, genel
  // Yemedi/Az yedi/Bitirdi seçimi tek başına çalışmaya devam ediyor.
  const todayMenuItems = useMemo(
    () => computeTodayMenuItems({ meals, kresId, currentClass }),
    [meals, kresId, currentClass]
  );
  // Her öğün için { [ürünAdı]: true (yedi) | false (yemedi) } — üründe hiç
  // giriş yoksa işaretlenmemiş sayılır, kaydete zorunlu değil.
  const [itemStatus, setItemStatus] = useState({ kahvalti: {}, ogle: {}, araOgun: {} });

  const cycleItemStatus = (mealKey, itemName) => {
    setItemStatus((prev) => {
      const current = prev[mealKey]?.[itemName];
      const next = { ...(prev[mealKey] || {}) };
      if (current === undefined) next[itemName] = true; // işaretsiz -> yedi
      else if (current === true) next[itemName] = false; // yedi -> yemedi
      else delete next[itemName]; // yemedi -> işaretsiz
      return { ...prev, [mealKey]: next };
    });
  };

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
        const kresId = child?.kresId || kullanici?.kresId;
        const reportsRef = query(
          ref(database, 'gunlukRaporlar'),
          orderByChild('kresId'),
          equalTo(kresId)
        );
        const snap = await get(reportsRef);
        const data = snap.val() || {};

        const hasToday = Object.values(data).some((item) => item.cocukId === child.id && item.tarih === today);

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
    if (!child?.id) return Alert.alert(t('teacher.childReport.errorTitle'), t('teacher.childReport.childNotFoundDesc'));

    if (!sleepDuration || !toiletCount) {
      return Alert.alert(t('teacher.childReport.missingInfoTitle'), t('teacher.childReport.missingSleepToiletDesc'));
    }

    const anyMealSelected = MEALS.some((meal) => yemek[meal.key]?.durum);
    if (!anyMealSelected) {
      return Alert.alert(t('teacher.childReport.missingInfoTitle'), t('teacher.childReport.missingMealDesc'));
    }

    setSaving(true);

    try {
      const childRef = ref(database, `cocuklar/${child.id}`);
      const childSnap = await get(childRef);
      const childData = childSnap.val() || child;

      const finalYemek = MEALS.reduce((acc, meal) => {
        const urunler = itemStatus[meal.key] || {};
        acc[meal.key] = {
          ...yemek[meal.key],
          ...(Object.keys(urunler).length > 0 ? { urunler } : {}),
        };
        return acc;
      }, {});

      await push(ref(database, 'gunlukRaporlar'), {
        kresId: childData.kresId || kullanici?.kresId || '',
        cocukId: child.id,
        sinifId: childData.sinifId || child.sinifId || '',
        ogretmenId: teacherId,
        teacherId,
        tarih: todayString(),
        ruhHali: mood,
        mood,
        yemek: finalYemek,
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
      Alert.alert(t('teacher.childReport.errorTitle'), t('teacher.childReport.saveErrorDesc'));
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
        message={t('teacher.childReport.successMessage')}
        onHide={() => setSuccessToast(false)}
      />

      <View onLayout={onHeaderLayout}>
        <ScreenHeader navigation={navigation} title={t('teacher.childReport.title')} subtitle={getChildName(child)} />
      </View>

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        {!checkingExisting && alreadyReportedToday ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              {t('teacher.childReport.alreadyReportedWarning')}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t('teacher.childReport.moodSectionTitle')}</Text>
        <View style={styles.moodContainer}>
          {MOOD_LISTESI.map((m) => (
            <TouchableOpacity
              key={m.label}
              style={[styles.moodButton, mood === m.label && styles.moodButtonActive]}
              onPress={() => setMood(m.label)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{translateMood(m.label, t)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('teacher.childReport.mealSectionTitle')}</Text>
        {MEALS.map((meal) => (
          <View key={meal.key} style={styles.mealCard}>
            <Text style={styles.mealTitle}>{meal.emoji} {t(`teacher.childReport.meals.${meal.key}`)}</Text>
            <View style={styles.mealOptions}>
              {MEAL_OPTIONS.map((optionKey) => {
                const active = yemek[meal.key]?.durum === optionKey;

                return (
                  <TouchableOpacity
                    key={optionKey}
                    style={[styles.mealOptionButton, active && styles.mealOptionActive]}
                    onPress={() => setMealStatus(meal.key, optionKey)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.mealOptionText, active && styles.mealOptionTextActive]}>
                      {t(`teacher.childReport.mealOptions.${optionKey}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {todayMenuItems[meal.key]?.length > 0 ? (
              <View style={styles.itemChipRow}>
                {todayMenuItems[meal.key].map((itemName) => {
                  const status = itemStatus[meal.key]?.[itemName];
                  const chipStyle = status === true
                    ? styles.itemChipYedi
                    : status === false
                      ? styles.itemChipYemedi
                      : styles.itemChipNeutral;
                  const chipTextStyle = status === undefined ? styles.itemChipTextNeutral : styles.itemChipTextActive;

                  return (
                    <TouchableOpacity
                      key={itemName}
                      style={[styles.itemChip, chipStyle]}
                      onPress={() => cycleItemStatus(meal.key, itemName)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.itemChipText, chipTextStyle]}>
                        {status === true ? '✓ ' : status === false ? '✗ ' : ''}{itemName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}

        <Text style={styles.sectionTitle}>{t('teacher.childReport.sleepSectionTitle')}</Text>
        <TextInput
          style={styles.input}
          value={sleepDuration}
          onChangeText={setSleepDuration}
          placeholder={t('teacher.childReport.sleepPlaceholder')}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>{t('teacher.childReport.toiletSectionTitle')}</Text>
        <TextInput
          style={styles.input}
          value={toiletCount}
          onChangeText={setToiletCount}
          placeholder={t('teacher.childReport.toiletPlaceholder')}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>{t('teacher.childReport.noteSectionTitle')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder={t('teacher.childReport.notePlaceholder')}
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
            <Text style={styles.saveButtonText}>{t('teacher.childReport.saveButton')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
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
  itemChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  itemChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  itemChipNeutral: { backgroundColor: THEME.bg, borderColor: THEME.border },
  itemChipYedi: { backgroundColor: '#E4F9EE', borderColor: '#00B894' },
  itemChipYemedi: { backgroundColor: '#FFE9E9', borderColor: '#FF4444' },
  itemChipText: { fontSize: 12, fontWeight: '800' },
  itemChipTextNeutral: { color: THEME.subtext || THEME.text },
  itemChipTextActive: { color: THEME.text },
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
