// ============================================================
// YUMURCAK — VeliFormScreen.js
// Veli ekleme/düzenleme formu
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

export default function VeliFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const { veliId } = route.params || {};

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [ad, setAd] = useState('');
  const [telefon, setTelefon] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!veliId);

  useEffect(() => {
    if (veliId) {
      get(ref(database, `kullanicilar/${veliId}`)).then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setKullaniciAdi(data.kullaniciAdi || '');
          setAd(data.ad || '');
          setTelefon(data.telefon || '');
        }
        setFetching(false);
      });
    }
  }, [veliId]);

  const handleSave = async () => {
    if (!kullaniciAdi.trim() || !ad.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve ad soyad zorunludur');
      return;
    }

    setLoading(true);
    try {
      const id = veliId || generateId();
      await set(ref(database, `kullanicilar/${id}`), {
        kullaniciAdi: kullaniciAdi.trim(),
        sifre: sifre.trim() || '123456',
        ad: ad.trim(),
        telefon: telefon.trim(),
        rol: 'veli',
        kresId: kullanici?.kresId || 'default-kres',
        createdAt: Date.now(),
      });

      Alert.alert('Başarılı', 'Veli kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Veli kaydedilemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <View style={s.center}><ActivityIndicator size="large" color="#3C3489" /></View>;
  }

  return (
    <ScrollView style={s.container}>
      <View style={s.form}>

        <View style={s.field}>
          <Text style={s.label}>Kullanıcı Adı *</Text>
          <TextInput
            style={s.input}
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            placeholder="Örn: veli1"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Ad Soyad *</Text>
          <TextInput
            style={s.input}
            value={ad}
            onChangeText={setAd}
            placeholder="Örn: Mehmet Yılmaz"
            placeholderTextColor="#999"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Telefon</Text>
          <TextInput
            style={s.input}
            value={telefon}
            onChangeText={setTelefon}
            placeholder="05xx xxx xx xx"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Şifre {!veliId && '*'}</Text>
          <TextInput
            style={s.input}
            value={sifre}
            onChangeText={setSifre}
            placeholder={veliId ? 'Boş bırakılırsa değişmez' : '123456'}
            secureTextEntry
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnYazi}>{veliId ? 'Güncelle' : 'Oluştur'}</Text>
          }
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: '#3C3489', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  btnDisabled: { opacity: 0.6 },
  btnYazi: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
