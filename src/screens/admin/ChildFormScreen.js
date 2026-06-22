// ============================================================
// YUMURCAK — ChildFormScreen.js
// Çocuk ekleme/düzenleme formu
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
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function ChildFormScreen() {
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { childId } = route.params || {};

  const [ad, setAd] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [sinifId, setSinifId] = useState('');
  const [seciliVeliIds, setSeciliVeliIds] = useState([]);
  const [siniflar, setSiniflar] = useState([]);
  const [veliler, setVeliler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    const yukle = async () => {
      // Sınıfları çek
      const sinifSnap = await get(ref(database, 'siniflar'));
      if (sinifSnap.exists()) {
        const data = sinifSnap.val();
        setSiniflar(Object.entries(data).map(([id, v]) => ({ id, ...v })));
      }

      // Velileri çek
      const kullaniciSnap = await get(ref(database, 'kullanicilar'));
      if (kullaniciSnap.exists()) {
        const data = kullaniciSnap.val();
        const veliListesi = Object.entries(data)
          .filter(([_, v]) => v.rol === 'veli')
          .map(([id, v]) => ({ id, ...v }));
        setVeliler(veliListesi);
      }

      // Düzenleme modunda çocuk bilgilerini çek
      if (childId) {
        const snap = await get(ref(database, `cocuklar/${childId}`));
        if (snap.exists()) {
          const data = snap.val();
          setAd(data.ad || '');
          setDogumTarihi(data.dogumTarihi || '');
          setSinifId(data.sinifId || '');
          setSeciliVeliIds(data.veliIds || []);
        }
      }
      setFetching(false);
    };
    yukle();
  }, [childId]);

  const veliToggle = (id) => {
    setSeciliVeliIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!ad.trim() || !dogumTarihi.trim() || !sinifId) {
      Alert.alert('Hata', 'Ad, doğum tarihi ve sınıf zorunludur');
      return;
    }

    setLoading(true);
    try {
      const id = childId || generateId();

      await set(ref(database, `cocuklar/${id}`), {
        ad: ad.trim(),
        dogumTarihi: dogumTarihi.trim(),
        sinifId,
        kresId: kullanici?.kresId || 'default-kres',
        veliIds: seciliVeliIds,
        createdAt: Date.now(),
      });

      setSuccessToast(true);
      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error) {
      Alert.alert('Hata', 'Çocuk kaydedilemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#712B13" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppSuccessToast
        visible={successToast}
        message={childId ? 'Çocuk bilgileri güncellendi' : 'Çocuk kaydedildi'}
        onHide={() => setSuccessToast(false)}
      />

      <ScrollView style={styles.container}>
        <View style={styles.form}>

          <View style={styles.field}>
            <Text style={styles.label}>Çocuk Adı *</Text>
            <TextInput
              style={styles.input}
              value={ad}
              onChangeText={setAd}
              placeholder="Örn: Ali Yılmaz"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Doğum Tarihi *</Text>
            <TextInput
              style={styles.input}
              value={dogumTarihi}
              onChangeText={setDogumTarihi}
              placeholder="2022-05-15"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sınıf *</Text>
            {siniflar.length === 0 ? (
              <Text style={styles.bilgi}>Önce sınıf oluşturun</Text>
            ) : (
              siniflar.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.seciBtn, sinifId === s.id && styles.seciBtnAktif]}
                  onPress={() => setSinifId(s.id)}
                >
                  <Text style={[styles.seciBtnYazi, sinifId === s.id && styles.seciBtnYaziAktif]}>
                    {s.ad} — {s.yasGrubu}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Veli Bağla (opsiyonel)</Text>
            {veliler.length === 0 ? (
              <Text style={styles.bilgi}>Henüz veli yok</Text>
            ) : (
              veliler.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.seciBtn, seciliVeliIds.includes(v.id) && styles.seciBtnAktif]}
                  onPress={() => veliToggle(v.id)}
                >
                  <Text style={[styles.seciBtnYazi, seciliVeliIds.includes(v.id) && styles.seciBtnYaziAktif]}>
                    {v.ad} ({v.kullaniciAdi})
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
              : <Text style={styles.saveButtonText}>{childId ? 'Güncelle' : 'Oluştur'}</Text>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
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
  seciBtn: {
    padding: 12, borderRadius: 8, borderWidth: 1,
    borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff',
  },
  seciBtnAktif: { borderColor: '#712B13', backgroundColor: '#fdf0ee' },
  seciBtnYazi: { fontSize: 15, color: '#333' },
  seciBtnYaziAktif: { fontWeight: '700', color: '#712B13' },
  saveButton: {
    backgroundColor: '#712B13', borderRadius: 8,
    padding: 16, alignItems: 'center', marginTop: 10,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
