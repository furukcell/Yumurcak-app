// ============================================================
// YUMURCAK — AdminInstitutionSettingsScreen.js
// FAZ 4: Yönetici kurum iletişim bilgilerini düzenler
// Firebase: kresler/{kresId}
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { get, ref, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function AdminInstitutionSettingsScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();

  const kresId = kullanici?.kresId || 'kres001';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    ad: '',
    adres: '',
    telefon: '',
    email: '',
    yoneticiAd: '',
    yoneticiTelefon: '',
    whatsapp: '',
    website: '',
    calismaSaatleri: '',
    not: '',
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const snap = await get(ref(database, `kresler/${kresId}`));
        const data = snap.val() || {};
        if (!mounted) return;

        setLogoUrl(data.logoUrl || '');
        setForm({
          ad: data.ad || '',
          adres: data.adres || '',
          telefon: data.telefon || '',
          email: data.email || '',
          yoneticiAd: data.yoneticiAd || buildAdminName(kullanici),
          yoneticiTelefon: data.yoneticiTelefon || kullanici?.telefon || '',
          whatsapp: data.whatsapp || data.telefon || '',
          website: data.website || '',
          calismaSaatleri: data.calismaSaatleri || '',
          not: data.not || '',
        });
      } catch (err) {
        console.error(err);
        Alert.alert('Hata', 'Kurum bilgileri yüklenemedi.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [kresId]);

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!form.ad.trim()) return Alert.alert('Eksik Bilgi', 'Kurum adı zorunludur.');

    setSaving(true);
    try {
      await update(ref(database, `kresler/${kresId}`), {
        ...form,
        ad: form.ad.trim(),
        adres: form.adres.trim(),
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        yoneticiAd: form.yoneticiAd.trim(),
        yoneticiTelefon: form.yoneticiTelefon.trim(),
        whatsapp: form.whatsapp.trim(),
        website: form.website.trim(),
        calismaSaatleri: form.calismaSaatleri.trim(),
        not: form.not.trim(),
        yoneticiId: kullanici?.uid || kullanici?.id || '',
        updatedAt: Date.now(),
      });

      setSuccessToast(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Kurum bilgileri kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadLogo = async () => {
    if (!kresId) return Alert.alert('Hata', 'Kurum bilgisi bulunamadı.');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin Gerekli', 'Kurum fotoğrafı seçmek için galeri izni vermen gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      setUploadingLogo(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileRef = storageRef(storage, `kurumLogolari/${kresId}.jpg`);
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });

      const downloadUrl = await getDownloadURL(fileRef);

      await update(ref(database, `kresler/${kresId}`), {
        logoUrl: downloadUrl,
        logoUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      });

      setLogoUrl(downloadUrl);
      setSuccessToast(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Kurum fotoğrafı yüklenemedi. Storage ayarlarını kontrol et.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    if (!kresId) return;
    Alert.alert('Kurum Fotoğrafı', 'Fotoğrafı kaldırmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          try {
            await update(ref(database, `kresler/${kresId}`), { logoUrl: '', updatedAt: Date.now() });
            setLogoUrl('');
          } catch (err) {
            console.error(err);
            Alert.alert('Hata', 'Fotoğraf kaldırılamadı.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Kurum bilgileri hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message="Kurum bilgileri kaydedildi"
        onHide={() => setSuccessToast(false)}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <TouchableOpacity style={styles.logoWrap} onPress={pickAndUploadLogo} activeOpacity={0.85} disabled={uploadingLogo}>
              {uploadingLogo ? (
                <ActivityIndicator color="#FFF" />
              ) : logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoImage} />
              ) : (
                <Text style={styles.heroIcon}>🏫</Text>
              )}
              <View style={styles.logoEditBadge}><Text style={styles.logoEditBadgeText}>📷</Text></View>
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Kurum Bilgileri</Text>
            <Text style={styles.heroDesc}>Bu bilgiler veli iletişim ekranına direkt düşer.</Text>
            <View style={styles.logoButtonsRow}>
              <TouchableOpacity onPress={pickAndUploadLogo} disabled={uploadingLogo}>
                <Text style={styles.logoActionText}>{logoUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}</Text>
              </TouchableOpacity>
              {logoUrl ? (
                <TouchableOpacity onPress={removeLogo} disabled={uploadingLogo}>
                  <Text style={[styles.logoActionText, styles.logoRemoveText]}>Kaldır</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.legalCard}>
            <Text style={styles.legalTitle}>⚖️ Yasal Bilgiler</Text>
            <Text style={styles.legalDesc}>Kullanım şartları, gizlilik politikası ve KVKK metinleri.</Text>
            <View style={styles.legalGrid}>
              <TouchableOpacity style={styles.legalButton} onPress={() => navigation.navigate('LegalDocuments', { docKey: 'terms' })} activeOpacity={0.85}>
                <Text style={styles.legalButtonText}>📄 Kullanım Şartları</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalButton} onPress={() => navigation.navigate('LegalDocuments', { docKey: 'privacy' })} activeOpacity={0.85}>
                <Text style={styles.legalButtonText}>🔐 Gizlilik Politikası</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalButton} onPress={() => navigation.navigate('LegalDocuments', { docKey: 'kvkk' })} activeOpacity={0.85}>
                <Text style={styles.legalButtonText}>🛡️ KVKK Metni</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FormInput label="Kurum Adı" value={form.ad} onChangeText={(v) => setValue('ad', v)} placeholder="Yumurcak Kreş" />
          <FormInput label="Adres" value={form.adres} onChangeText={(v) => setValue('adres', v)} placeholder="Mahalle, cadde, no..." multiline />
          <FormInput label="Kurum Telefonu" value={form.telefon} onChangeText={(v) => setValue('telefon', v)} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
          <FormInput label="E-posta" value={form.email} onChangeText={(v) => setValue('email', v)} placeholder="info@..." keyboardType="email-address" />
          <FormInput label="Yönetici Adı" value={form.yoneticiAd} onChangeText={(v) => setValue('yoneticiAd', v)} placeholder="Yönetici adı soyadı" />
          <FormInput label="Yönetici Telefonu" value={form.yoneticiTelefon} onChangeText={(v) => setValue('yoneticiTelefon', v)} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
          <FormInput label="WhatsApp" value={form.whatsapp} onChangeText={(v) => setValue('whatsapp', v)} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
          <FormInput label="Website" value={form.website} onChangeText={(v) => setValue('website', v)} placeholder="https://..." />
          <FormInput label="Çalışma Saatleri" value={form.calismaSaatleri} onChangeText={(v) => setValue('calismaSaatleri', v)} placeholder="08:00 - 18:00" />
          <FormInput label="Ek Not" value={form.not} onChangeText={(v) => setValue('not', v)} placeholder="Servis, kayıt, görüşme notu..." multiline />

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Kurum Bilgilerini Kaydet</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function buildAdminName(user) {
  return `${user?.ad || ''} ${user?.soyad || ''}`.trim() || user?.kullaniciAdi || '';
}

function FormInput({ label, multiline, ...props }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, multiline && styles.textArea]}
        placeholderTextColor="#999"
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 38 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 18 },
  logoWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative', overflow: 'visible' },
  logoImage: { width: 84, height: 84, borderRadius: 42 },
  logoEditBadge: { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: THEME.primary },
  logoEditBadgeText: { fontSize: 12 },
  logoButtonsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  logoActionText: { color: '#FFF', fontWeight: '900', fontSize: 12.5, textDecorationLine: 'underline' },
  logoRemoveText: { color: '#FFD9DF' },
  heroIcon: { fontSize: 36 },
  heroTitle: { color: '#FFF', fontWeight: '900', fontSize: 22 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', marginTop: 5, fontWeight: '700', textAlign: 'center' },
  legalCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: THEME.border, marginBottom: 16 },
  legalTitle: { color: THEME.text, fontWeight: '900', fontSize: 17 },
  legalDesc: { color: THEME.muted, fontWeight: '700', marginTop: 5, marginBottom: 10, lineHeight: 18 },
  legalGrid: { gap: 8 },
  legalButton: { backgroundColor: THEME.primarySoft, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: THEME.border },
  legalButtonText: { color: THEME.primaryDark, fontWeight: '900' },
  inputBlock: { marginBottom: 12 },
  label: { color: THEME.text, fontWeight: '900', marginBottom: 7 },
  input: { backgroundColor: THEME.card, borderRadius: 14, padding: 13, color: THEME.text, borderWidth: 1, borderColor: THEME.border, fontWeight: '700' },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
