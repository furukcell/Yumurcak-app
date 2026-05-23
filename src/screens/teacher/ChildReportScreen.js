import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { ref, push, serverTimestamp } from 'firebase/database';
import { db, auth } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ChildReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params;

  const [mood, setMood] = useState('happy');
  const [yemek, setYemek] = useState({ breakfast: false, lunch: false, snack: false });
  const [sleepDuration, setSleepDuration] = useState('');
  const [toiletCount, setToiletCount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleYemek = (key) => setYemek((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    if (!sleepDuration || !toiletCount) {
      return Alert.alert('Eksik Bilgi', 'Uyku süresi ve tuvalet sayısı zorunludur.');
    }

    setSaving(true);
    try {
      const reportRef = ref(db, 'raporlar');
      await push(reportRef, {
        cocukId: child.id,
        sinifId: child.sinifId,
        teacherId: auth.currentUser.uid,
        date: new Date().toISOString().split('T')[0],
        mood,
        yemek,
        uyku: { duration: Number(sleepDuration), note: '' },
        tuvalet: { count: Number(toiletCount), note: '' },
        photos: [],
        note,
        createdAt: serverTimestamp() || Date.now(),
      });
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Ruh Hali 😊</Text>
        <View style={styles.moodRow}>
          {['happy', 'neutral', 'sad'].map((m) => (
            <TouchableOpacity key={m} style={[styles.moodBtn, mood === m && styles.moodBtnActive]} onPress={() => setMood(m)}>
              <Text style={styles.moodText}>{m === 'happy' ? '😊' : m === 'neutral' ? '😐' : '😢'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Yemek Durumu 🍽️</Text>
        <View style={styles.checkboxRow}>
          {Object.entries(yemek).map(([key, val]) => (
            <TouchableOpacity key={key} style={[styles.checkbox, val && styles.checkboxActive]} onPress={() => toggleYemek(key)}>
              <Text style={styles.checkboxText}>{key === 'breakfast' ? 'Kahvaltı' : key === 'lunch' ? 'Öğle' : 'İkindi'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Uyku & Tuvalet 💤</Text>
        <TextInput style={styles.input} placeholder="Uyku süresi (saat)" keyboardType="numeric" value={sleepDuration} onChangeText={setSleepDuration} />
        <TextInput style={styles.input} placeholder="Tuvalet sayısı" keyboardType="numeric" value={toiletCount} onChangeText={setToiletCount} />

        <Text style={styles.sectionTitle}>Günlük Not 📝</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Bugün neler yaptı?" multiline value={note} onChangeText={setNote} />

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Raporu Kaydet</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  form: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#333' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  moodBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  moodBtnActive: { backgroundColor: '#FFD166', borderWidth: 3, borderColor: '#633806' },
  moodText: { fontSize: 28 },
  checkboxRow: { flexDirection: 'row', justifyContent: 'space-between' },
  checkbox: { flex: 1, padding: 12, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  checkboxActive: { backgroundColor: '#633806' },
  checkboxText: { color: '#fff', fontWeight: '500' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#633806', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
