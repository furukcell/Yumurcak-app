// ============================================================
// YUMURCAK — ChildReportScreen.js (TEACHER)
// Öğretmen günlük rapor girişi
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { ref, push, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { MOOD_LISTESI, OGUN_LISTESI } from '../../constants';

export default function ChildReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params;
  const { kullanici } = useAuth();
  const teacherId = kullanici?.uid;

  const [mood, setMood] = useState('');
  const [yemek, setYemek] = useState({ kahvalti: false, ogle: false, araOgun: false });
  const [sleepDuration, setSleepDuration] = useState('');
  const [toiletCount, setToiletCount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!sleepDuration || !toiletCount) {
      return Alert.alert('Eksik Bilgi', 'Uyku süresi ve tuvalet sayısı zorunludur.');
    }

    setSaving(true);

    try {
      // Çocuğun veli bilgilerini al
      const childRef = ref(database, `cocuklar/${child.id}`);
      const childSnap = await get(childRef);
      const childData = childSnap.val();

      // Raporu kaydet
      const reportRef = ref(database, 'gunlukRaporlar');
      const newReportRef = await push(reportRef);
      await push(reportRef, {
        cocukId: child.id,
        sinifId: child.sinifId,
        teacherId: teacherId,
        tarih: new Date().toISOString().split('T')[0],
        mood,
        yemek,
        uyku: { sure: Number(sleepDuration), not: '' },
        tuvalet: { sayi: Number(toiletCount), not: '' },
        not: note,
        createdAt: Date.now(),
      });

      // Velilere bildirim gönder (şimdilik pasif)
      // TODO: Expo Project ID eklendiğinde aktif et
      if (childData.veliIds && childData.veliIds.length > 0) {
        console.log('Bildirim gönderilecek veliler:', childData.veliIds);
      }

      Alert.alert('Başarılı', 'Rapor kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Rapor kaydedilemedi.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleYemek = (key) => {
    setYemek(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{child.ad} - Günlük Rapor</Text>

        {/* Ruh Hali */}
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

        {/* Yemek */}
        <Text style={styles.sectionTitle}>Yemek</Text>
        <View style={styles.yemekContainer}>
          {OGUN_LISTESI.map((ogun) => (
            <TouchableOpacity
              key={ogun.key}
              style={[
                styles.yemekButton,
                yemek[ogun.key] && styles.yemekButtonActive
              ]}
              onPress={() => toggleYemek(ogun.key)}
            >
              <Text style={styles.yemekEmoji}>{ogun.emoji}</Text>
              <Text style={styles.yemekLabel}>{ogun.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Uyku */}
        <Text style={styles.sectionTitle}>Uyku Süresi (saat)</Text>
        <TextInput
          style={styles.input}
          value={sleepDuration}
          onChangeText={setSleepDuration}
          placeholder="Örn: 2"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        {/* Tuvalet */}
        <Text style={styles.sectionTitle}>Tuvalet Sayısı</Text>
        <TextInput
          style={styles.input}
          value={toiletCount}
          onChangeText={setToiletCount}
          placeholder="Örn: 3"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        {/* Not */}
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

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Raporu Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 20, marginBottom: 10 },
  moodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  moodButtonActive: { borderColor: '#633806', backgroundColor: '#fff8e1' },
  moodEmoji: { fontSize: 24, marginBottom: 4 },
  moodLabel: { fontSize: 12, color: '#333' },
  yemekContainer: { flexDirection: 'row', gap: 10 },
  yemekButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  yemekButtonActive: { borderColor: '#27500A', backgroundColor: '#e8f5e9' },
  yemekEmoji: { fontSize: 24, marginBottom: 4 },
  yemekLabel: { fontSize: 12, color: '#333', textAlign: 'center' },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#633806',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
