// ============================================================
// YUMURCAK — AdminInstitutionSettingsScreen.js
// FAZ 4: Yönetici kurum iletişim bilgilerini düzenler
// Firebase: kresler/{kresId}
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

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
  const { kullanici } = useAuth();

  const kresId = kullanici?.kresId || 'kres001';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      Alert.alert('Başarılı', 'Kurum bilgileri kaydedildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Kurum bilgileri kaydedilemedi.');
    } finally {
      setSaving(false);
    }
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>🏫</Text>
            <Text style={styles.heroTitle}>Kurum Bilgileri</Text>
            <Text style={styles.heroDesc}>Bu bilgiler veli iletişim ekranına direkt düşer.</Text>
          </View>
          <TouchableOpacity
           style={styles.legalButton}
           onPress={() => navigation.navigate('LegalDocuments')}
           activeOpacity={0.85}
       >
          <Text style={styles.legalButtonText}>⚖️ Yasal Metinleri Gör</Text>
       </TouchableOpacity>
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
  heroIcon: { fontSize: 42, marginBottom: 8 },
  heroTitle: { color: '#FFF', fontWeight: '900', fontSize: 22 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', marginTop: 5, fontWeight: '700', textAlign: 'center' },
  inputBlock: { marginBottom: 12 },
  label: { color: THEME.text, fontWeight: '900', marginBottom: 7 },
  input: { backgroundColor: THEME.card, borderRadius: 14, padding: 13, color: THEME.text, borderWidth: 1, borderColor: THEME.border, fontWeight: '700' },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
