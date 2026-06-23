
// ============================================================
// YUMURCAK — VeliFormScreen.js
// Veli ekleme/düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { ref, get, update } from 'firebase/database';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { database, firebaseConfig } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { usernameToEmail } from '../../utils/authHelpers';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function VeliFormScreen() {
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { veliId } = route.params || {};

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [ad, setAd] = useState('');
  const [telefon, setTelefon] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!veliId);

  useEffect(() => {
    if (!veliId) return;

    get(ref(database, `kullanicilar/${veliId}`))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setKullaniciAdi(data.kullaniciAdi || '');
          setAd(data.ad || '');
          setTelefon(data.telefon || '');
        }

        setFetching(false);
      })
      .catch((error) => {
        console.error(error);
        setFetching(false);
        Alert.alert('Hata', 'Veli bilgileri yüklenemedi');
      });
  }, [veliId]);

  const handleSave = async () => {
    if (!kullaniciAdi.trim() || !ad.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve ad soyad zorunludur');
      return;
    }

    setLoading(true);

    try {
      const id = veliId || generateId();
      const now = Date.now();

      const veliSnap = await get(ref(database, `kullanicilar/${id}`));
      const oldVeli = veliSnap.exists() ? (veliSnap.val() || {}) : {};
      const kaydedilenSifre = sifre.trim() || oldVeli.sifre || '123456';

      if (kaydedilenSifre.length < 6) {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
        setLoading(false);
        return;
      }

      if (veliId && oldVeli.authUid && sifre.trim()) {
        Alert.alert(
          'Şifre Değiştirilemez',
          'Bu veli Firebase Auth hesabına bağlı. Mevcut kullanıcı şifresi bu ekrandan değiştirilemez.'
        );
        setLoading(false);
        return;
      }

      const email = oldVeli.email || usernameToEmail(kullaniciAdi.trim());
      let authUid = oldVeli.authUid || null;
      let authYeniOlustu = false;

      if (!authUid) {
        const secondaryAuth = getSecondaryAuth();
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, kaydedilenSifre);
        authUid = credential.user.uid;
        authYeniOlustu = true;
        await signOut(secondaryAuth).catch(() => {});
      }

      const updates = {};

      updates[`kullanicilar/${id}`] = {
        ...oldVeli,
        kullaniciAdi: kullaniciAdi.trim(),
        sifre: kaydedilenSifre,
        ad: ad.trim(),
        telefon: telefon.trim(),
        rol: 'veli',
        kresId: oldVeli.kresId || kullanici?.kresId || 'default-kres',
        authUid,
        email,
        authProvider: 'firebase',
        authCreatedAt: oldVeli.authCreatedAt || now,
        authUpdatedAt: now,
        createdAt: oldVeli.createdAt || now,
        updatedAt: now,
      };

      updates[`authKullaniciIndex/${authUid}`] = id;

      await update(ref(database), updates);

      const mesaj = veliId
        ? `Veli güncellendi.\n\nKullanıcı adı: ${kullaniciAdi.trim()}\nŞifre: Değişmedi\nAuth: ${authYeniOlustu ? 'Yeni oluşturuldu' : 'Mevcut'}`
        : `Veli kaydedildi.\n\nKullanıcı adı: ${kullaniciAdi.trim()}\nŞifre: ${kaydedilenSifre}\nAuth hesabı oluşturuldu.`;

      Alert.alert('Başarılı', mesaj, [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error(error);

      if (error?.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Auth Hatası',
          'Bu kullanıcı adı için Firebase Auth hesabı zaten var. Farklı kullanıcı adı dene veya Auth Geçiş ekranından eşleştirme kontrolü yap.'
        );
        return;
      }

      Alert.alert('Hata', `Veli kaydedilemedi.\n\n${error?.code || error?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3C3489" />
      </View>
    );
  }

  return (
    <View style={s.screen}>
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

            <View style={s.passwordRow}>
              <TextInput
                style={s.passwordInput}
                value={sifre}
                onChangeText={setSifre}
                placeholder={veliId ? 'Boş bırakılırsa değişmez' : 'Boş bırakılırsa: 123456'}
                secureTextEntry={!sifreGoster}
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={s.passwordToggle}
                onPress={() => setSifreGoster(!sifreGoster)}
                activeOpacity={0.75}
              >
                <Text style={s.passwordToggleText}>
                  {sifreGoster ? 'Gizle' : 'Göster'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sifreNotu}>
              {veliId
                ? 'Boş bırakırsan mevcut şifre korunur.'
                : 'Boş bırakırsan varsayılan şifre 123456 olur.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnYazi}>
                {veliId ? 'Güncelle' : 'Oluştur'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

function getSecondaryAuth() {
  const name = 'yumurcak-parent-create';
  const existing = getApps().find((app) => app.name === name);
  const app = existing || initializeApp(firebaseConfig, name);
  return getAuth(app);
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: '#eeeaff',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
  },
  passwordToggleText: { color: '#3C3489', fontWeight: '700' },
  sifreNotu: { marginTop: 6, color: '#777', fontSize: 13 },
  btn: {
    backgroundColor: '#3C3489',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnYazi: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
