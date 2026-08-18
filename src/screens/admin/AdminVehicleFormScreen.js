// ============================================================
// YUMURCAK — AdminVehicleFormScreen.js
// Servis aracı (plaka) ekleme/düzenleme + o araca atanmış
// "servisci" (servis görevlisi / abla) hesabının oluşturulması.
// TeacherFormScreen.js ile aynı hesap-oluşturma kalıbını kullanır
// (ikincil Firebase Auth app instance'ı ile admin oturumu bozulmadan
// yeni bir Auth kullanıcısı açılır).
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, get, update } from 'firebase/database';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { database, firebaseConfig } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { usernameToEmail, normalizeUsername } from '../../utils/authHelpers';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ROLLER } from '../../constants';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function AdminVehicleFormScreen() {
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { vehicleId } = route.params || {};

  const [plaka, setPlaka] = useState('');
  const [ad, setAd] = useState('');
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [servisciAd, setServisciAd] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successToast, setSuccessToast] = useState(false);

  const [oldVehicle, setOldVehicle] = useState(null);
  const [oldServisci, setOldServisci] = useState(null);
  const [oldServisciId, setOldServisciId] = useState(null);

  useEffect(() => {
    const yukle = async () => {
      if (vehicleId) {
        const snap = await get(ref(database, `servisler/${vehicleId}`));
        if (snap.exists()) {
          const data = snap.val();
          setOldVehicle(data);
          setPlaka(data.plaka || '');
          setAd(data.ad || '');

          if (data.servisciId) {
            setOldServisciId(data.servisciId);
            const servisciSnap = await get(ref(database, `kullanicilar/${data.servisciId}`));
            if (servisciSnap.exists()) {
              const servisciData = servisciSnap.val();
              setOldServisci(servisciData);
              setKullaniciAdi(servisciData.kullaniciAdi || '');
              setServisciAd(servisciData.ad || '');
            }
          }
        }
      }
      setFetching(false);
    };
    yukle();
  }, [vehicleId]);

  const handleSave = async () => {
    if (!plaka.trim() || !ad.trim()) {
      Alert.alert('Hata', 'Plaka ve servis adı zorunludur');
      return;
    }
    if (!kullaniciAdi.trim() || !servisciAd.trim()) {
      Alert.alert('Hata', 'Servis görevlisinin kullanıcı adı ve ad soyadı zorunludur');
      return;
    }

    setLoading(true);
    try {
      const id = vehicleId || generateId();
      const servisciId = oldServisciId || generateId();
      const now = Date.now();

      const kaydedilenSifre = sifre.trim() || oldServisci?.sifre || '123456';
      if (kaydedilenSifre.length < 6) {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
        setLoading(false);
        return;
      }

      const email = oldServisci?.email || usernameToEmail(kullaniciAdi.trim());
      let authUid = oldServisci?.authUid || null;

      if (!authUid) {
        const secondaryAuth = getSecondaryAuth();
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, kaydedilenSifre);
        authUid = credential.user.uid;
        await signOut(secondaryAuth).catch(() => {});
      }

      const kresId = oldVehicle?.kresId || kullanici?.kresId || 'default-kres';

      const nextUsername = kullaniciAdi.trim();
      const cleanNewUsername = normalizeUsername(nextUsername);
      const cleanOldUsername = oldServisci?.kullaniciAdi ? normalizeUsername(oldServisci.kullaniciAdi) : null;

      const updates = {};

      updates[`kullanicilar/${servisciId}`] = {
        ...oldServisci,
        kullaniciAdi: nextUsername,
        sifre: kaydedilenSifre,
        ad: servisciAd.trim(),
        rol: ROLLER.SERVISCI,
        kresId,
        authUid,
        email,
        authProvider: 'firebase',
        authCreatedAt: oldServisci?.authCreatedAt || now,
        authUpdatedAt: now,
        createdAt: oldServisci?.createdAt || now,
        updatedAt: now,
      };

      updates[`authKullaniciIndex/${authUid}`] = servisciId;
      updates[`kresKullanicilari/${kresId}/servisciler/${servisciId}`] = true;
      updates[`kullaniciKresleri/${servisciId}/${kresId}`] = true;

      if (cleanNewUsername) {
        updates[`kullaniciAdiIndex/${cleanNewUsername}`] = servisciId;
      }
      if (cleanOldUsername && cleanOldUsername !== cleanNewUsername) {
        updates[`kullaniciAdiIndex/${cleanOldUsername}`] = null;
      }

      updates[`servisler/${id}`] = {
        ...oldVehicle,
        plaka: plaka.trim(),
        ad: ad.trim(),
        servisciId,
        kresId,
        createdAt: oldVehicle?.createdAt || now,
        updatedAt: now,
      };

      await update(ref(database), updates);
      setSuccessToast(true);
      setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      console.error(error);
      if (error?.code === 'auth/email-already-in-use') {
        Alert.alert('Auth Hatası', 'Bu kullanıcı adı için Firebase Auth hesabı zaten var. Farklı kullanıcı adı deneyin.');
        return;
      }
      Alert.alert('Hata', `Servis aracı kaydedilemedi.\n\n${error?.code || error?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <View style={styles.center}><ActivityIndicator size="large" color="#633806" /></View>;

  return (
    <View style={styles.screen}>
      <AppSuccessToast visible={successToast} message={vehicleId ? 'Servis aracı güncellendi' : 'Servis aracı oluşturuldu'} onHide={() => setSuccessToast(false)} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Servis Adı *</Text>
            <TextInput style={styles.input} value={ad} onChangeText={setAd} placeholder="Örn: 1 Nolu Servis / Sabah Turu" placeholderTextColor="#999" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Plaka *</Text>
            <TextInput style={styles.input} value={plaka} onChangeText={setPlaka} placeholder="Örn: 48 AB 123" placeholderTextColor="#999" autoCapitalize="characters" />
          </View>

          <Text style={styles.sectionTitle}>Servis Görevlisi</Text>
          <Text style={styles.sectionNotu}>Bu araca atanan görevli, kendi hesabıyla giriş yapıp çocukları alındı/bırakıldı olarak işaretleyebilir. Şoför için ayrı hesap açmanıza gerek yok.</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Kullanıcı Adı *</Text>
            <TextInput style={styles.input} value={kullaniciAdi} onChangeText={setKullaniciAdi} placeholder="Örn: servis1" placeholderTextColor="#999" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Ad Soyad *</Text>
            <TextInput style={styles.input} value={servisciAd} onChangeText={setServisciAd} placeholder="Örn: Ayşe Yılmaz" placeholderTextColor="#999" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Şifre {!oldServisciId && '*'}</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={sifre} onChangeText={setSifre} placeholder={oldServisciId ? 'Boş bırakılırsa değişmez' : 'Boş bırakılırsa: 123456'} secureTextEntry={!sifreGoster} placeholderTextColor="#999" autoCapitalize="none" autoCorrect={false} />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setSifreGoster(!sifreGoster)} activeOpacity={0.75}><Text style={styles.passwordToggleText}>{sifreGoster ? 'Gizle' : 'Göster'}</Text></TouchableOpacity>
            </View>
            <Text style={styles.sifreNotu}>{oldServisciId ? 'Boş bırakılırsa mevcut şifre korunur.' : 'Boş bırakılırsa varsayılan şifre 123456 olur.'}</Text>
          </View>

          <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{vehicleId ? 'Güncelle' : 'Oluştur'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
     </KeyboardAvoidingView>
    </View>
  );
}

function getSecondaryAuth() {
  const name = 'yumurcak-servisci-create';
  const existing = getApps().find((app) => app.name === name);
  const app = existing || initializeApp(firebaseConfig, name);
  return getAuth(app);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#633806', marginTop: 6, marginBottom: 4 },
  sectionNotu: { fontSize: 13, color: '#777', marginBottom: 14 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  passwordInput: { flex: 1, minWidth: 0, padding: 12, fontSize: 16, color: '#333' },
  passwordToggle: { paddingHorizontal: 14, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: '#fff3e0', borderLeftWidth: 1, borderLeftColor: '#ddd' },
  passwordToggleText: { color: '#633806', fontWeight: '700' },
  sifreNotu: { marginTop: 6, color: '#777', fontSize: 13 },
  saveButton: { backgroundColor: '#633806', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
