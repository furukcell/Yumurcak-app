// ============================================================
// YUMURCAK — ChildReportScreen.js
// Öğretmen günlük rapor girişi
// ============================================================
import React, { useState } from 'react';
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
import { ref, push, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { MOOD_LISTESI, OGUN_LISTESI } from '../../constants';
import { THEME, ScreenHeader, getChildName, todayString } from './teacherShared';

export default function ChildReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params || {};
  const { kullanici } = useAuth();
  const teacherId = kullanici?.uid || kullanici?.id;

  const [mood, setMood] = useState('');
  const [yemek, setYemek] = useState({ kahvalti: false, ogle: false, araOgun: false });
  const [sleepDuration, setSleepDuration] = useState('');
  const [toiletCount, setToiletCount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!child?.id) return Alert.alert('Hata', 'Çocuk bilgisi bulunamadı.');
    if (!sleepDuration || !toiletCount) {
      return Alert.alert('Eksik Bilgi', 'Uyku süresi ve tuvalet sayısı zorunludur.');
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

      Alert.alert('Başarılı', 'Rapor kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Rapor kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const toggleYemek = (key) => {
    setYemek((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Günlük Rapor" subtitle={getChildName(child)} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <Text style={styles.sectionTitle}>Yemek</Text>
        <View style={styles.row}>
          {OGUN_LISTESI.map((ogun) => (
            <TouchableOpacity
              key={ogun.key}
              style={[styles.choiceButton, yemek[ogun.key] && styles.choiceActive]}
              onPress={() => toggleYemek(ogun.key)}
            >
              <Text style={styles.choiceEmoji}>{ogun.emoji}</Text>
              <Text style={styles.choiceText}>{ogun.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Raporu Kaydet</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 38 },
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
  row: { flexDirection: 'row', gap: 10 },
  choiceButton: {
    flex: 1,
    backgroundColor: THEME.card,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
  },
  choiceActive: { borderColor: THEME.green, backgroundColor: '#EAF8EF' },
  choiceEmoji: { fontSize: 24, marginBottom: 4 },
  choiceText: { fontSize: 12, fontWeight: '800', color: THEME.text, textAlign: 'center' },
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
