// ============================================================
// YUMURCAK — TeacherFormScreen.js
// Öğretmen ekleme/düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ref, get, update, query, orderByChild, equalTo } from 'firebase/database';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { database, firebaseConfig } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { usernameToEmail, normalizeUsername } from '../../utils/authHelpers';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function TeacherFormScreen() {
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { teacherId } = route.params || {};

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [ad, setAd] = useState('');
  const [sinifId, setSinifId] = useState('');
  const [siniflar, setSiniflar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successToast, setSuccessToast] = useState(false);
  const [oldKullaniciAdi, setOldKullaniciAdi] = useState('');

  useEffect(() => {
    const yukle = async () => {
      const kresId = kullanici?.kresId;

      // Artık tüm 'siniflar' node'u çekilmiyor, sadece bu kreşe ait sınıflar sorgulanıyor.
      if (kresId) {
        const sinifQ = query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId));
        const sinifSnap = await get(sinifQ);
        if (sinifSnap.exists()) {
          const data = sinifSnap.val();
          const liste = Object.entries(data).map(([id, v]) => ({ id, ...v }));
          setSiniflar(liste);
        }
      }

      if (teacherId) {
        const snap = await get(ref(database, `kullanicilar/${teacherId}`));
        if (snap.exists()) {
          const data = snap.val();
          setKullaniciAdi(data.kullaniciAdi || '');
          setOldKullaniciAdi(data.kullaniciAdi || '');
          setAd(data.ad || '');
          setSinifId(data.sinifId || '');
        }
      }
      setFetching(false);
    };
    yukle();
  }, [teacherId, kullanici?.kresId]);

  const handleSave = async () => {
    if (!kullaniciAdi.trim() || !ad.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve ad soyad zorunludur');
      return;
    }

    setLoading(true);
    try {
      const id = teacherId || generateId();
      const now = Date.now();
      const nextSinifId = sinifId || '';
      const teacherSnap = await get(ref(database, `kullanicilar/${id}`));
      const oldTeacher = teacherSnap.exists() ? (teacherSnap.val() || {}) : {};
      const kaydedilenSifre = sifre.trim() || oldTeacher.sifre || '123456';

      if (kaydedilenSifre.length < 6) {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
        setLoading(false);
        return;
      }

      const email = oldTeacher.email || usernameToEmail(kullaniciAdi.trim());
      let authUid = oldTeacher.authUid || null;

      if (!authUid) {
        const secondaryAuth = getSecondaryAuth();
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, kaydedilenSifre);
        authUid = credential.user.uid;
        await signOut(secondaryAuth).catch(() => {});
      }

      const nextKresId = oldTeacher.kresId || kullanici?.kresId || 'default-kres';

      // Artık tüm 'siniflar' node'u çekilmiyor, sadece bu kreşe ait sınıflar sorgulanıyor.
      const siniflarQ = query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(nextKresId));
      const siniflarSnap = await get(siniflarQ);
      const siniflarData = siniflarSnap.exists() ? (siniflarSnap.val() || {}) : {};

      const nextUsername = kullaniciAdi.trim();
      const cleanNewUsername = normalizeUsername(nextUsername);
      const cleanOldUsername = oldTeacher.kullaniciAdi ? normalizeUsername(oldTeacher.kullaniciAdi) : null;

      const updates = {};

      updates[`kullanicilar/${id}`] = {
        ...oldTeacher,
        kullaniciAdi: nextUsername,
        sifre: kaydedilenSifre,
        ad: ad.trim(),
        rol: 'ogretmen',
        sinifId: nextSinifId,
        kresId: nextKresId,
        authUid,
        email,
        authProvider: 'firebase',
        authCreatedAt: oldTeacher.authCreatedAt || now,
        authUpdatedAt: now,
        createdAt: oldTeacher.createdAt || now,
        updatedAt: now,
      };

      updates[`authKullaniciIndex/${authUid}`] = id;
      updates[`kresKullanicilari/${nextKresId}/ogretmenler/${id}`] = true;
      updates[`kullaniciKresleri/${id}/${nextKresId}`] = true;
      if (oldTeacher.kresId && oldTeacher.kresId !== nextKresId) updates[`kresKullanicilari/${oldTeacher.kresId}/ogretmenler/${id}`] = null;

      // Login'de tüm kullanicilar node'u çekilmeden username -> uid bulunabilsin diye
      if (cleanNewUsername) {
        updates[`kullaniciAdiIndex/${cleanNewUsername}`] = id;
      }
      if (cleanOldUsername && cleanOldUsername !== cleanNewUsername) {
        updates[`kullaniciAdiIndex/${cleanOldUsername}`] = null;
      }

      Object.entries(siniflarData).forEach(([classId, classData]) => {
        const mevcutIds = Array.isArray(classData?.ogretmenIds) ? classData.ogretmenIds.map(String) : [];
        if (mevcutIds.includes(String(id)) && classId !== nextSinifId) {
          updates[`siniflar/${classId}/ogretmenIds`] = mevcutIds.filter((teacherItemId) => teacherItemId !== String(id));
          updates[`siniflar/${classId}/updatedAt`] = now;
          updates[`ogretmenSiniflari/${id}/${classId}`] = null;
        }
      });

      if (nextSinifId) {
        const targetClass = siniflarData[nextSinifId] || {};
        const targetIds = Array.isArray(targetClass.ogretmenIds) ? targetClass.ogretmenIds.map(String) : [];
        const classKresId = targetClass.kresId || nextKresId;
        updates[`siniflar/${nextSinifId}/ogretmenIds`] = Array.from(new Set([...targetIds, String(id)]));
        updates[`siniflar/${nextSinifId}/kresId`] = classKresId;
        updates[`siniflar/${nextSinifId}/updatedAt`] = now;
        updates[`ogretmenSiniflari/${id}/${nextSinifId}`] = true;
        updates[`kresSiniflari/${classKresId}/${nextSinifId}`] = true;
      }

      await update(ref(database), updates);
      setSuccessToast(true);
      setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      console.error(error);
      if (error?.code === 'auth/email-already-in-use') {
        Alert.alert('Auth Hatası', 'Bu kullanıcı adı için Firebase Auth hesabı zaten var. Farklı kullanıcı adı dene veya Auth Geçiş ekranından eşleştirme kontrolü yap.');
        return;
      }
      Alert.alert('Hata', `Öğretmen kaydedilemedi.\n\n${error?.code || error?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <View style={styles.center}><ActivityIndicator size="large" color="#633806" /></View>;

  return (
    <View style={styles.screen}>
      <AppSuccessToast visible={successToast} message={teacherId ? 'Öğretmen güncellendi' : 'Öğretmen kaydedildi'} onHide={() => setSuccessToast(false)} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Kullanıcı Adı *</Text>
            <TextInput style={styles.input} value={kullaniciAdi} onChangeText={setKullaniciAdi} placeholder="Örn: ogretmen1" placeholderTextColor="#999" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Ad Soyad *</Text>
            <TextInput style={styles.input} value={ad} onChangeText={setAd} placeholder="Örn: Ayşe Yılmaz" placeholderTextColor="#999" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Şifre {!teacherId && '*'}</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={sifre} onChangeText={setSifre} placeholder={teacherId ? 'Boş bırakılırsa değişmez' : 'Boş bırakılırsa: 123456'} secureTextEntry={!sifreGoster} placeholderTextColor="#999" autoCapitalize="none" autoCorrect={false} />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setSifreGoster(!sifreGoster)} activeOpacity={0.75}><Text style={styles.passwordToggleText}>{sifreGoster ? 'Gizle' : 'Göster'}</Text></TouchableOpacity>
            </View>
            <Text style={styles.sifreNotu}>{teacherId ? 'Boş bırakılırsa mevcut şifre korunur.' : 'Boş bırakılırsa varsayılan şifre 123456 olur.'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Sınıf Ata (opsiyonel)</Text>
            {siniflar.length === 0 ? <Text style={styles.bilgi}>Önce sınıf oluşturun</Text> : siniflar.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.sinifBtn, sinifId === s.id && styles.sinifBtnAktif]} onPress={() => setSinifId(sinifId === s.id ? '' : s.id)}>
                <Text style={[styles.sinifBtnYazi, sinifId === s.id && styles.sinifBtnYaziAktif]}>{s.ad} — {s.yasGrubu}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{teacherId ? 'Güncelle' : 'Oluştur'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
     </KeyboardAvoidingView>
    </View>
  );
}

function getSecondaryAuth() {
  const name = 'yumurcak-teacher-create';
  const existing = getApps().find((app) => app.name === name);
  const app = existing || initializeApp(firebaseConfig, name);
  return getAuth(app);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  passwordInput: { flex: 1, minWidth: 0, padding: 12, fontSize: 16, color: '#333' },
  passwordToggle: { paddingHorizontal: 14, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: '#fff3e0', borderLeftWidth: 1, borderLeftColor: '#ddd' },
  passwordToggleText: { color: '#633806', fontWeight: '700' },
  sifreNotu: { marginTop: 6, color: '#777', fontSize: 13 },
  bilgi: { color: '#999', fontStyle: 'italic' },
  sinifBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff' },
  sinifBtnAktif: { borderColor: '#633806', backgroundColor: '#fff3e0' },
  sinifBtnYazi: { fontSize: 15, color: '#333' },
  sinifBtnYaziAktif: { fontWeight: '700', color: '#633806' },
  saveButton: { backgroundColor: '#633806', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
