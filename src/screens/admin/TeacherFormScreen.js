// ============================================================
// YUMURCAK — TeacherFormScreen.js
// Öğretmen ekleme/düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { ref, set, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function TeacherFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const { teacherId } = route.params || {};

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [ad, setAd] = useState('');
  const [sinifId, setSinifId] = useState('');
  const [siniflar, setSiniflar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const yukle = async () => {
      // Sınıfları çek
      const sinifSnap = await get(ref(database, 'siniflar'));
      if (sinifSnap.exists()) {
        const data = sinifSnap.val();
        const liste = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        setSiniflar(liste);
      }

      // Düzenleme modunda öğretmen bilgilerini çek
      if (teacherId) {
        const snap = await get(ref(database, `kullanicilar/${teacherId}`));
        if (snap.exists()) {
          const data = snap.val();
          setKullaniciAdi(data.kullaniciAdi || '');
          setAd(data.ad || '');
          setSinifId(data.sinifId || '');
        }
      }
      setFetching(false);
    };
    yukle();
  }, [teacherId]);

  const handleSave = async () => {
    if (!kullaniciAdi.trim() || !ad.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve ad soyad zorunludur');
      return;
    }

    setLoading(true);
    try {
      const id = teacherId || generateId();

      // Kullanıcıyı kaydet
      await set(ref(database, `kullanicilar/${id}`), {
        kullaniciAdi: kullaniciAdi.trim(),
        sifre: sifre.trim() || '123456',
        ad: ad.trim(),
        rol: 'ogretmen',
        sinifId: sinifId || '',
        kresId: kullanici?.kresId || 'default-kres',
        createdAt: Date.now(),
      });

      // Seçilen sınıfın ogretmenIds listesine ekle
      if (sinifId) {
        const sinifSnap = await get(ref(database, `siniflar/${sinifId}`));
        if (sinifSnap.exists()) {
          const sinifData = sinifSnap.val();
          const mevcutIds = sinifData.ogretmenIds || [];
          if (!mevcutIds.includes(id)) {
            await update(ref(database, `siniflar/${sinifId}`), {
              ogretmenIds: [...mevcutIds, id],
            });
          }
        }
      }

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
            autoCapitalize="none"
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
            placeholder={teacherId ? 'Boş bırakılırsa değişmez' : '123456'}
            secureTextEntry
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sınıf Ata (opsiyonel)</Text>
          {siniflar.length === 0 ? (
            <Text style={styles.bilgi}>Önce sınıf oluşturun</Text>
          ) : (
            siniflar.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sinifBtn, sinifId === s.id && styles.sinifBtnAktif]}
                onPress={() => setSinifId(sinifId === s.id ? '' : s.id)}
              >
                <Text style={[styles.sinifBtnYazi, sinifId === s.id && styles.sinifBtnYaziAktif]}>
                  {s.ad} — {s.yasGrubu}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>{teacherId ? 'Güncelle' : 'Oluştur'}</Text>
          }
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
  bilgi: { color: '#999', fontStyle: 'italic' },
  sinifBtn: {
    padding: 12, borderRadius: 8, borderWidth: 1,
    borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff',
  },
  sinifBtnAktif: { borderColor: '#633806', backgroundColor: '#fff3e0' },
  sinifBtnYazi: { fontSize: 15, color: '#333' },
  sinifBtnYaziAktif: { fontWeight: '700', color: '#633806' },
  saveButton: {
    backgroundColor: '#633806', borderRadius: 8,
    padding: 16, alignItems: 'center', marginTop: 10,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
