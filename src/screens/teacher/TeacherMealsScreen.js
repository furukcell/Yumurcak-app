// ============================================================
// YUMURCAK — TeacherMealsScreen.js
// Öğretmen günlük yemek girişi + aylık kurum listesi görünümü
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
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

export default function TeacherMealsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, meals } = useTeacherData();

  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('daily');
  const [tarih, setTarih] = useState(todayString());
  const [kahvalti, setKahvalti] = useState('');
  const [ogle, setOgle] = useState('');
  const [araOgun, setAraOgun] = useState('');
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

  const saveMeal = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!tarih.trim()) return Alert.alert('Eksik Bilgi', 'Tarih zorunludur.');
    if (!kahvalti.trim() && !ogle.trim() && !araOgun.trim()) {
      return Alert.alert('Eksik Bilgi', 'En az bir öğün girmelisin.');
    }

    setSaving(true);
    try {
      await push(ref(database, 'yemekListeleri'), {
        kresId: kresId || currentClass.kresId || '',
        sinifId: currentClass.id,
        olusturanId: teacherId || '',
        olusturanRol: 'ogretmen',
        tip: 'gunluk',
        tarih: tarih.trim(),
        baslik: `${currentClass.ad || 'Sınıf'} Günlük Yemek Listesi`,
        ogunler: {
          kahvalti: kahvalti.trim(),
          ogle: ogle.trim(),
          araOgun: araOgun.trim(),
        },
        aktif: true,
        createdAt: Date.now(),
      });

      setKahvalti('');
      setOgle('');
      setAraOgun('');
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
            <TextInput style={styles.input} value={kahvalti} onChangeText={setKahvalti} placeholder="Kahvaltı" placeholderTextColor="#999" />
            <TextInput style={styles.input} value={ogle} onChangeText={setOgle} placeholder="Öğle yemeği" placeholderTextColor="#999" />
            <TextInput style={styles.input} value={araOgun} onChangeText={setAraOgun} placeholder="Ara öğün" placeholderTextColor="#999" />
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

function renderMeals(item) {
  const ogunler = item.ogunler || {};
  return (
    <View style={{ marginTop: 10 }}>
      {ogunler.kahvalti ? <Text style={styles.mealText}>🥐 Kahvaltı: {ogunler.kahvalti}</Text> : null}
      {ogunler.ogle ? <Text style={styles.mealText}>🍲 Öğle: {ogunler.ogle}</Text> : null}
      {ogunler.araOgun ? <Text style={styles.mealText}>🍎 Ara Öğün: {ogunler.araOgun}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  formCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  formTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
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
  mealText: { color: THEME.text, marginTop: 5, fontWeight: '700', lineHeight: 19 },
});