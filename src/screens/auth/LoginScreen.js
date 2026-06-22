// ============================================================
// YUMURCAK — LoginScreen.js
// FAZ 10: Firebase Auth + eski RTDB login fallback
// ============================================================
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
  StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { RENKLER } from '../../constants';
import { auth, database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  usernameToEmail,
  findUserIdByAuthUid,
  getKresForUser,
  findLegacyUserByUsernameAndPassword,
} from '../../utils/authHelpers';

export default function LoginScreen({ navigation }) {
  const { girisYap } = useAuth();

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre]               = useState('');
  const [yukleniyor, setYukleniyor]     = useState(false);
  const [sifreGoster, setSifreGoster]   = useState(false);

  const girisYapHandler = async () => {
    if (!kullaniciAdi.trim() || !sifre.trim()) {
      Alert.alert('Eksik Bilgi', 'Kullanıcı adı ve şifre giriniz!');
      return;
    }

    setYukleniyor(true);

    try {
      // 1) Önce Firebase Auth dene
      const email = usernameToEmail(kullaniciAdi);
      const authResult = await signInWithEmailAndPassword(auth, email, sifre.trim());

      const authUid = authResult.user.uid;
      const legacyUserId = await findUserIdByAuthUid(authUid);

      if (!legacyUserId) {
        Alert.alert(
          'Hesap Eşleşmedi',
          'Firebase Auth girişi başarılı ama uygulama kullanıcı kaydı bulunamadı. Yönetici panelinden Auth Geçiş ekranını tekrar çalıştır.'
        );
        return;
      }

      const userSnap = await get(ref(database, `kullanicilar/${legacyUserId}`));
      if (!userSnap.exists()) {
        Alert.alert('Hata', 'Kullanıcı kaydı bulunamadı.');
        return;
      }

      const userData = {
        uid: legacyUserId,
        id: legacyUserId,
        authUid,
        email: authResult.user.email,
        ...userSnap.val(),
      };

      if (userData.aktif === false) {
        Alert.alert('Hata', 'Bu kullanıcı pasif durumda!');
        return;
      }

      const kresObj = await getKresForUser(userData);
      await girisYap(userData, kresObj);
    } catch (authError) {
      // 2) Auth hesabı yoksa eski RTDB kullanıcı adı/şifre sistemiyle giriş yap
      try {
        const legacyResult = await findLegacyUserByUsernameAndPassword(kullaniciAdi, sifre);

        if (legacyResult.status === 'not_found') {
          Alert.alert('Hata', 'Kullanıcı bulunamadı!');
          return;
        }

        if (legacyResult.status === 'wrong_password') {
          Alert.alert(
            'Hata',
            `Şifre yanlış!\n\nBulunan kullanıcı alanları: ${(legacyResult.fields || []).join(', ')}`
          );
          return;
        }

        if (legacyResult.status === 'passive') {
          Alert.alert('Hata', 'Bu kullanıcı pasif durumda!');
          return;
        }

        const kullaniciObj = legacyResult.user;
        const kresObj = await getKresForUser(kullaniciObj);

        await girisYap(kullaniciObj, kresObj);

        Alert.alert(
          'Bilgi',
          'Eski giriş sistemiyle giriş yapıldı. Firebase Auth için yönetici panelinden Auth Geçiş ekranı çalıştırılmalı.'
        );
      } catch (legacyError) {
        console.error('Login hata:', authError, legacyError);
        Alert.alert('Hata', 'Bağlantı hatası, tekrar deneyin!');
      }
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.ic} keyboardShouldPersistTaps="handled">

          <View style={s.logoAlan}>
            <Text style={s.logoEmoji}>🌟</Text>
            <Text style={s.logoYazi}>YUMURCAK</Text>
            <Text style={s.slogan}>Miniklerinizle her an bağlantıda</Text>
          </View>

          <View style={s.kart}>
            <Text style={s.kartBaslik}>Giriş Yap</Text>

            <Text style={s.inputBaslik}>Kullanıcı Adı</Text>
            <View style={s.inputSarici}>
              <Text style={s.inputIkon}>👤</Text>
              <TextInput
                style={s.input}
                placeholder="kullanici_adi"
                value={kullaniciAdi}
                onChangeText={setKullaniciAdi}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={RENKLER.altMetin}
              />
            </View>

            <Text style={s.inputBaslik}>Şifre</Text>
            <View style={s.inputSarici}>
              <Text style={s.inputIkon}>🔒</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="••••••••"
                value={sifre}
                onChangeText={setSifre}
                secureTextEntry={!sifreGoster}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                placeholderTextColor={RENKLER.altMetin}
              />
              <TouchableOpacity onPress={() => setSifreGoster(!sifreGoster)}>
                <Text style={{ fontSize: 18 }}>{sifreGoster ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btn, yukleniyor && { opacity: 0.7 }]}
              onPress={girisYapHandler}
              disabled={yukleniyor}
            >
              {yukleniyor
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.btnYazi}>GİRİŞ YAP 🚀</Text>
              }
            </TouchableOpacity>

            <Text style={s.altBilgi}>
              Hesabınız yoksa okul yöneticinizle iletişime geçin.
            </Text>
          </View>
              <View style={s.legalLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('LegalDocuments', { docKey: 'terms' })}>
              <Text style={s.legalText}>Kullanım Şartları</Text>
          </TouchableOpacity>

         <Text style={s.legalSep}>•</Text>

         <TouchableOpacity onPress={() => navigation.navigate('LegalDocuments', { docKey: 'privacy' })}>
         <Text style={s.legalText}>Gizlilik</Text>
     </TouchableOpacity>

         <Text style={s.legalSep}>•</Text>

        <TouchableOpacity onPress={() => navigation.navigate('LegalDocuments', { docKey: 'kvkk' })}>
        <Text style={s.legalText}>KVKK</Text>
     </TouchableOpacity>
    </View>

          <Text style={s.versiyon}>© 2026 Yumurcak v1.0</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  con:        { flex: 1, backgroundColor: RENKLER.turuncu },
  ic:         { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoAlan:   { alignItems: 'center', marginBottom: 32 },
  logoEmoji:  { fontSize: 64, marginBottom: 8 },
  logoYazi:   { fontSize: 36, fontWeight: '900', color: '#FFF', letterSpacing: 4 },
  slogan:     { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6 },
  kart:       { backgroundColor: '#FFF', borderRadius: 24, padding: 24, elevation: 8 },
  kartBaslik: { fontSize: 22, fontWeight: '800', color: RENKLER.metin, marginBottom: 20, textAlign: 'center' },
  inputBaslik:{ fontSize: 13, fontWeight: '700', color: RENKLER.altMetin, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  inputSarici:{ flexDirection: 'row', alignItems: 'center', backgroundColor: RENKLER.arkaplan, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: RENKLER.sinir },
  inputIkon:  { fontSize: 18, marginRight: 10 },
  input:      { flex: 1, fontSize: 15, color: RENKLER.metin },
  btn:        { backgroundColor: RENKLER.turuncu, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, elevation: 4 },
  btnYazi:    { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  altBilgi:   { textAlign: 'center', color: RENKLER.altMetin, fontSize: 12, marginTop: 16, lineHeight: 18 },
  versiyon:   { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 24 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  legalText: { color: RENKLER.turuncu, fontSize: 12, fontWeight: '900' },
  legalSep: { color: RENKLER.altMetin, fontSize: 12, fontWeight: '900' },
});
