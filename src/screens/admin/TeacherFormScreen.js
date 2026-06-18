// ============================================================
// YUMURCAK — TeacherFormScreen.js
// Öğretmen ekleme/düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { ref, set, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function TeacherFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { teacherId } = route.params || {};
  
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [ad, setAd] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!teacherId);

  useEffect(() => {
    if (teacherId) {
      const teacherRef = ref(database, `kullanicilar/${teacherId}`);
      get(teacherRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setKullaniciAdi(data.kullaniciAdi);
          setAd(data.ad);
        }
        setFetching(false);
      });
    }
  }, [teacherId]);

  const handleSave = async () => {
    if (!kullaniciAdi.trim() || !ad.trim()) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const id = teacherId || generateId();
      const teacherData = {
        kullaniciAdi: kullaniciAdi.trim(),
        sifre: sifre.trim() || '123456',
        ad: ad.trim(),
        rol: 'ogretmen',
        kresId: 'default-kres',
        createdAt: Date.now(),
      };

      await set(ref(database, `kullanicilar/${id}`), teacherData);
      Alert.alert('Başarılı', 'Öğretmen kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Öğretmen kaydedilemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#633806" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Kullanıcı Adı *</Text>
          <TextInput
            style={styles.input}
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            placeholder="Örn: ogretmen1"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ad Soyad *</Text>
          <TextInput
            style={styles.input}
            value={ad}
            onChangeText={setAd}
            placeholder="Örn: Ayşe Yılmaz"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Şifre {!teacherId && '*'}</Text>
          <TextInput
            style={styles.input}
            value={sifre}
            onChangeText={setSifre}
            placeholder={teacherId ? "Boş bırakılırsa değişmez" : "123456"}
            secureTextEntry
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {teacherId ? 'Güncelle' : 'Oluştur'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#ddd',
  },
  saveButton: { backgroundColor: '#633806', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
