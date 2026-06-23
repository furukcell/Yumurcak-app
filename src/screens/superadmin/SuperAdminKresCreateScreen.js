```js
// ============================================================
// YUMURCAK — SuperAdminKresCreateScreen.js
// FAZ 17: Yeni kreş oluştururken index + Auth kayıtları yazılır
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { push, ref, update } from 'firebase/database';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { database, firebaseConfig } from '../../config/firebase';
import { addUserIndexUpdates } from '../../utils/firebaseIndexHelpers';
import { usernameToEmail } from '../../utils/authHelpers';

const THEME = {
  bg: '#0F172A',
  panel: '#111827',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#38BDF8',
  green: '#22C55E',
};

const DEFAULT_DEMO_DAYS = 30;

export default function SuperAdminKresCreateScreen({ navigation }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ad: '',
    il: '',
    ilce: '',
    adres: '',
    telefon: '',
    email: '',
    yoneticiAd: '',
    yoneticiSoyad: '',
    yoneticiTelefon: '',
    kullaniciAdi: '',
    sifre: '',
    demoGun: String(DEFAULT_DEMO_DAYS),
  });

  const generatedPreview = useMemo(() => {
    const username = form.kullaniciAdi.trim();
    const password = form.sifre.trim();

    return {
      username: username || 'otomatik girilecek',
      password: password || 'en az 6 karakter',
    };
  }, [form.kullaniciAdi, form.sifre]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.ad.trim()) return 'Kreş adı zorunlu.';
    if (!form.il.trim()) return 'İl zorunlu.';
    if (!form.ilce.trim()) return 'İlçe zorunlu.';
    if (!form.yoneticiAd.trim()) return 'Yönetici adı zorunlu.';
    if (!form.kullaniciAdi.trim()) return 'Yönetici kullanıcı adı zorunlu.';
    if (form.kullaniciAdi.trim().length < 3) return 'Kullanıcı adı en az 3 karakter olmalı.';
    if (!form.sifre.trim()) return 'Yönetici şifresi zorunlu.';
    if (form.sifre.trim().length < 6) return 'Şifre en az 6 karakter olmalı.';

    const demoGun = Number(form.demoGun);
    if (!demoGun || demoGun < 1) return 'Demo gün sayısı en az 1 olmalı.';

    return null;
  };

  const createKres = async () => {
    const error = validate();

    if (error) {
      Alert.alert('Eksik Bilgi', error);
      return;
    }

    Alert.alert(
      'Yeni Kreş Oluştur',
      `${form.ad.trim()} için kreş, Firebase Auth yönetici hesabı ve demo abonelik oluşturulacak. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Oluştur', onPress: saveKres },
      ]
    );
  };

  const saveKres = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const now = Date.now();
      const demoDays = Number(form.demoGun) || DEFAULT_DEMO_DAYS;
      const endDate = now + demoDays * 86400000;

      const kresRef = push(ref(database, 'kresler'));
      const kresId = kresRef.key;

      const userRef = push(ref(database, 'kullanicilar'));
      const yoneticiId = userRef.key;

      const cleanUsername = normalizeUsername(form.kullaniciAdi);
      const password = form.sifre.trim();
      const authEmail = usernameToEmail(cleanUsername);

      const secondaryAuth = getSecondaryAuth();
      const credential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
      const authUid = credential.user.uid;

      await signOut(secondaryAuth).catch(() => {});

      const kresRecord = {
        id: kresId,
        ad: form.ad.trim(),
        kresAdi: form.ad.trim(),
        il: form.il.trim(),
        ilce: form.ilce.trim(),
        adres: form.adres.trim(),
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        yoneticiId,
        yoneticiAd: `${form.yoneticiAd.trim()} ${form.yoneticiSoyad.trim()}`.trim(),
        yoneticiTelefon: form.yoneticiTelefon.trim(),
        aktif: true,
        createdAt: now,
        updatedAt: now,
      };

      const userRecord = {
        uid: yoneticiId,
        id: yoneticiId,
        authUid,
        email: authEmail,
        authProvider: 'firebase',
        authCreatedAt: now,
        authUpdatedAt: now,
        kresId,
        ad: form.yoneticiAd.trim(),
        soyad: form.yoneticiSoyad.trim(),
        telefon: form.yoneticiTelefon.trim(),
        kullaniciAdi: cleanUsername,
        sifre: password,
        rol: 'yonetici',
        aktif: true,
        createdAt: now,
        updatedAt: now,
      };

      const updates = {};

      updates[`kresler/${kresId}`] = kresRecord;
      updates[`kullanicilar/${yoneticiId}`] = userRecord;
      updates[`authKullaniciIndex/${authUid}`] = yoneticiId;
      updates[`abonelikler/${kresId}`] = {
        kresId,
        plan: 'demo',
        durum: 'demo',
        baslangicTarihi: now,
        bitisTarihi: endDate,
        demoGun: demoDays,
        fiyat: 0,
        paraBirimi: 'TRY',
        not: 'Süper admin tarafından oluşturulan demo abonelik.',
        createdAt: now,
        updatedAt: now,
      };

      addUserIndexUpdates(updates, yoneticiId, userRecord);

      await update(ref(database), updates);

      Alert.alert(
        'Kreş Oluşturuldu',
        `Kreş: ${form.ad.trim()}\nKullanıcı adı: ${cleanUsername}\nŞifre: ${password}\nAuth hesabı: oluşturuldu\nDemo: ${demoDays} gün`,
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('SuperAdminKresDetail', { kresId, kres: kresRecord }),
          },
        ]
      );
    } catch (err) {
      console.error(err);

      if (err?.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Auth Hatası',
          'Bu yönetici kullanıcı adı için Firebase Auth hesabı zaten var. Farklı kullanıcı adı dene.'
        );
        return;
      }

      Alert.alert('Hata', `Kreş oluşturulamadı.\n\n${err?.code || err?.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Yeni Kreş</Text>
            <View style={{ width: 70 }} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.kicker}>KREŞ ONBOARDING</Text>
            <Text style={styles.heroTitle}>Kurum + Yönetici Hesabı</Text>
            <Text style={styles.heroDesc}>
              Yeni kreşi sisteme ekle, Firebase Auth yönetici hesabını oluştur ve demo aboneliği başlat.
            </Text>
          </View>

          <Section title="Kreş Bilgileri">
            <Input label="Kreş Adı *" value={form.ad} onChangeText={(v) => setValue('ad', v)} placeholder="Örn: Minik Kalpler Kreşi" />
            <Input label="İl *" value={form.il} onChangeText={(v) => setValue('il', v)} placeholder="Muğla" />
            <Input label="İlçe *" value={form.ilce} onChangeText={(v) => setValue('ilce', v)} placeholder="Milas" />
            <Input label="Adres" value={form.adres} onChangeText={(v) => setValue('adres', v)} placeholder="Mahalle / cadde / no" multiline />
            <Input label="Telefon" value={form.telefon} onChangeText={(v) => setValue('telefon', v)} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
            <Input label="E-posta" value={form.email} onChangeText={(v) => setValue('email', v)} placeholder="info@kres.com" keyboardType="email-address" autoCapitalize="none" />
          </Section>

          <Section title="Kurum Yöneticisi">
            <Input label="Ad *" value={form.yoneticiAd} onChangeText={(v) => setValue('yoneticiAd', v)} placeholder="Yönetici adı" />
            <Input label="Soyad" value={form.yoneticiSoyad} onChangeText={(v) => setValue('yoneticiSoyad', v)} placeholder="Yönetici soyadı" />
            <Input label="Telefon" value={form.yoneticiTelefon} onChangeText={(v) => setValue('yoneticiTelefon', v)} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
            <Input label="Kullanıcı Adı *" value={form.kullaniciAdi} onChangeText={(v) => setValue('kullaniciAdi', v)} placeholder="minikkalpler" autoCapitalize="none" />
            <Input label="Geçici Şifre *" value={form.sifre} onChangeText={(v) => setValue('sifre', v)} placeholder="en az 6 karakter" autoCapitalize="none" />
          </Section>

          <Section title="Demo Abonelik">
            <Input label="Demo Gün Sayısı *" value={form.demoGun} onChangeText={(v) => setValue('demoGun', v.replace(/[^0-9]/g, ''))} placeholder="30" keyboardType="number-pad" />

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Yönetici Giriş Bilgileri</Text>
              <Text style={styles.previewLine}>Kullanıcı adı: {generatedPreview.username}</Text>
              <Text style={styles.previewLine}>Şifre: {generatedPreview.password}</Text>
            </View>
          </Section>

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={createKres} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Kreşi Oluştur</Text>}
          </TouchableOpacity>

          <Text style={styles.note}>
            Yeni kayıt oluşturulunca Firebase Auth hesabı, authKullaniciIndex ve kreş indexleri otomatik yazılır.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getSecondaryAuth() {
  const name = 'yumurcak-superadmin-create';
  const existing
```
