import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onValue, push, ref, update } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import { createNotification } from '../../services/notificationCenter';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function getMonthLabel(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function getDaysOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const total = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: total }, function (_, index) {
    const day = index + 1;
    return {
      day,
      dateKey: `${year}-${pad2(month + 1)}-${pad2(day)}`,
      label: `${pad2(day)} ${MONTHS[month]}`,
    };
  });
}

function createInitialMeals(days) {
  return days.reduce(function (acc, item) {
    acc[item.dateKey] = { kahvalti: '', ogle: '', araOgun: '' };
    return acc;
  }, {});
}

export default function AdminMonthlyMealScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(function () { return createStyles(theme); }, [theme]);

  const [monthDate, setMonthDate] = useState(new Date());
  const days = useMemo(function () { return getDaysOfMonth(monthDate); }, [monthDate]);
  const monthKey = useMemo(function () { return getMonthKey(monthDate); }, [monthDate]);
  const monthLabel = useMemo(function () { return getMonthLabel(monthDate); }, [monthDate]);
  const [meals, setMeals] = useState(function () { return createInitialMeals(days); });
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [unpublishing, setUnpublishing] = useState(false);

  const kresId = kullanici?.kresId;
  const adminId = kullanici?.uid || kullanici?.id || null;

  useEffect(function () {
    if (!kresId) {
      setPublishedCount(0);
      return undefined;
    }

    const unsub = onValue(ref(database, 'yemekListeleri'), function (snap) {
      const data = snap.val() || {};
      const count = Object.values(data).filter(function (item) {
        return item?.kresId === kresId && item?.ayKey === monthKey && item?.kaynak === 'admin_aylik' && item?.aktif !== false;
      }).length;
      setPublishedCount(count);
    }, function () {
      setPublishedCount(0);
    });

    return function () { unsub(); };
  }, [kresId, monthKey]);

  function changeMonth(direction) {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + direction, 1);
    const nextDays = getDaysOfMonth(next);

    setMonthDate(next);
    setMeals(createInitialMeals(nextDays));
  }

  function updateMeal(dateKey, field, value) {
    setMeals(function (prev) {
      return {
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || { kahvalti: '', ogle: '', araOgun: '' }),
          [field]: value,
        },
      };
    });
  }

  function clearDay(dateKey) {
    setMeals(function (prev) {
      return {
        ...prev,
        [dateKey]: { kahvalti: '', ogle: '', araOgun: '' },
      };
    });
  }

  function hasAnyMeal() {
    return Object.values(meals).some(function (item) {
      return String(item.kahvalti || '').trim() || String(item.ogle || '').trim() || String(item.araOgun || '').trim();
    });
  }

  function publishMonth() {
    if (!kresId) {
      Alert.alert('Hata', 'Kreş bilgisi bulunamadı.');
      return;
    }

    if (!hasAnyMeal()) {
      Alert.alert('Eksik Bilgi', 'Yayınlamak için en az bir güne yemek bilgisi gir.');
      return;
    }

    Alert.alert(
      'Ayı Paylaş',
      `${monthLabel} yemek listesi paylaşılsın mı? Aynı ay için eski aylık kayıtlar pasif yapılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Paylaş', onPress: doPublishMonth },
      ]
    );
  }

  async function doPublishMonth() {
    try {
      setSaving(true);

      const snapshotValue = await new Promise(function (resolve) {
        let unsub = null;

        unsub = onValue(
          ref(database, 'yemekListeleri'),
          function (snap) {
            if (unsub) unsub();
            resolve(snap.val() || {});
          },
          function () {
            if (unsub) unsub();
            resolve({});
          }
        );
      });

      const updates = {};
      const now = Date.now();

      Object.entries(snapshotValue).forEach(function (entry) {
        const id = entry[0];
        const item = entry[1] || {};
        const sameMonth = item.kresId === kresId && item.ayKey === monthKey && item.kaynak === 'admin_aylik' && item.aktif !== false;

        if (sameMonth) {
          updates[`yemekListeleri/${id}/aktif`] = false;
          updates[`yemekListeleri/${id}/updatedAt`] = now;
        }
      });

      days.forEach(function (day) {
        const item = meals[day.dateKey] || {};
        const kahvalti = String(item.kahvalti || '').trim();
        const ogle = String(item.ogle || '').trim();
        const araOgun = String(item.araOgun || '').trim();

        if (!kahvalti && !ogle && !araOgun) return;

        const key = push(ref(database, 'yemekListeleri')).key;

        updates[`yemekListeleri/${key}`] = {
          kresId,
          sinifId: null,
          olusturanId: adminId,
          olusturanRol: 'yonetici',
          tip: 'aylik',
          kaynak: 'admin_aylik',
          ayKey: monthKey,
          tarih: day.dateKey,
          baslik: `${monthLabel} Yemek Listesi`,
          ogunler: { kahvalti, ogle, araOgun },
          aktif: true,
          createdAt: now,
          updatedAt: now,
        };
      });

      await update(ref(database), updates);

      await createNotification({
        kresId,
        hedefRoller: ['veli'],
        baslik: '🍽️ Yemek listesi güncellendi',
        mesaj: `${monthLabel} yemek listesi yayınlandı.`,
        tip: 'yemek',
        routeName: 'ParentMeals',
        createdBy: adminId || '',
      });

      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Aylık yemek listesi yayınlanamadı.');
    } finally {
      setSaving(false);
    }
  }

  function unpublishMonth() {
    if (!kresId || publishedCount === 0) return;

    Alert.alert(
      'Yayından Kaldır',
      `${monthLabel} için yayınlanmış yemek listesi kaldırılsın mı? Veliler artık bu ayın listesini göremeyecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kaldır', style: 'destructive', onPress: doUnpublishMonth },
      ]
    );
  }

  async function doUnpublishMonth() {
    try {
      setUnpublishing(true);

      const snapshotValue = await new Promise(function (resolve) {
        let unsub = null;

        unsub = onValue(
          ref(database, 'yemekListeleri'),
          function (snap) {
            if (unsub) unsub();
            resolve(snap.val() || {});
          },
          function () {
            if (unsub) unsub();
            resolve({});
          }
        );
      });

      const updates = {};
      const now = Date.now();

      Object.entries(snapshotValue).forEach(function (entry) {
        const id = entry[0];
        const item = entry[1] || {};
        const sameMonth = item.kresId === kresId && item.ayKey === monthKey && item.kaynak === 'admin_aylik' && item.aktif !== false;

        if (sameMonth) {
          updates[`yemekListeleri/${id}/aktif`] = false;
          updates[`yemekListeleri/${id}/updatedAt`] = now;
        }
      });

      if (Object.keys(updates).length === 0) return;
      await update(ref(database), updates);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Yayından kaldırılamadı.');
    } finally {
      setUnpublishing(false);
    }
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast
          visible={successToast}
          message={`${monthLabel} yemek listesi yayınlandı`}
          onHide={() => setSuccessToast(false)}
        />

        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>

            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Aylık Yemek Listesi</Text>
              <Text style={styles.subtitle}>Kurum geneli ay bazlı yemek planı</Text>
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

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Nasıl çalışır?</Text>
            <Text style={styles.infoText}>Dolu günler yayınlanır. Aynı ay için eski aylık kayıtlar pasif yapılır, yeni liste aktif olur.</Text>
          </View>

          {publishedCount > 0 ? (
            <View style={styles.publishedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.publishedTitle}>✅ {monthLabel} yayında</Text>
                <Text style={styles.publishedText}>Veliler şu an bu ayın listesini görüyor.</Text>
              </View>
              <TouchableOpacity disabled={unpublishing} style={[styles.unpublishButton, unpublishing && { opacity: 0.6 }]} onPress={unpublishMonth} activeOpacity={0.85}>
                <Text style={styles.unpublishButtonText}>{unpublishing ? 'Kaldırılıyor...' : 'Yayından Kaldır'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {days.map(function (day) {
            const item = meals[day.dateKey] || { kahvalti: '', ogle: '', araOgun: '' };
            const dayHasContent = !!(String(item.kahvalti || '').trim() || String(item.ogle || '').trim() || String(item.araOgun || '').trim());

            return (
              <View key={day.dateKey} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayTitle}>{day.label}</Text>
                    <Text style={styles.dayDate}>{day.dateKey}</Text>
                  </View>
                  {dayHasContent ? (
                    <TouchableOpacity style={styles.dayClearButton} onPress={() => clearDay(day.dateKey)} activeOpacity={0.8}>
                      <Text style={styles.dayClearButtonText}>Sil</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TextInput
                  value={item.kahvalti}
                  onChangeText={(value) => updateMeal(day.dateKey, 'kahvalti', value)}
                  placeholder="Kahvaltı"
                  placeholderTextColor={theme.muted}
                  style={styles.input}
                  multiline
                />

                <TextInput
                  value={item.ogle}
                  onChangeText={(value) => updateMeal(day.dateKey, 'ogle', value)}
                  placeholder="Öğle yemeği"
                  placeholderTextColor={theme.muted}
                  style={styles.input}
                  multiline
                />

                <TextInput
                  value={item.araOgun}
                  onChangeText={(value) => updateMeal(day.dateKey, 'araOgun', value)}
                  placeholder="Ara öğün"
                  placeholderTextColor={theme.muted}
                  style={styles.input}
                  multiline
                />
              </View>
            );
          })}

          <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={publishMonth} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? 'Paylaşılıyor...' : 'Ayı Paylaş'}</Text>
          </TouchableOpacity>
        </ScrollView>
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
    infoCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    infoTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
    infoText: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 4 },
    dayCard: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 },
    dayTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
    dayDate: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    dayClearButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,77,109,0.12)' },
    dayClearButtonText: { color: '#FF4D6D', fontWeight: '900', fontSize: 12 },
    publishedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    publishedTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
    publishedText: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    unpublishButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FF4D6D' },
    unpublishButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    input: { minHeight: 42, backgroundColor: theme.bg, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 9, color: theme.text, fontWeight: '700', marginTop: 8, textAlignVertical: 'top' },
    saveButton: { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
}