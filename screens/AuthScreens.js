// ============================================================
// YUMURCAK — AuthScreens.js
// Giriş ekranı
// Yönetici kendi hesabıyla, öğretmen ve veliler
// yöneticinin oluşturduğu hesaplarla girer
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
  StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { RENKLER, DB_URL, ROLLER } from '../constants';

export function GirisEkrani({ onGiris }) {
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre]               = useState('');
  const [yukleniyor, setYukleniyor]     = useState(false);
  const [sifreGoster, setSifreGoster]   = useState(false);

  const girisYap = async () => {
    if (!kullaniciAdi.trim() || !sifre.trim()) {
      Alert.alert('Eksik Bilgi', 'Kullanıcı adı ve şifre giriniz!');
      return;
    }

    setYukleniyor(true);

    try {
      // Firebase'de kullaniciAdi'na göre kullanıcı ara
      const res  = await fetch(
        `${DB_URL}/kullanicilar.json?orderBy="kullaniciAdi"&equalTo="${kullaniciAdi.trim().toLowerCase()}"`
      );
      const data = await res.json();

      if (!data || Object.keys(data).length === 0) {
        Alert.alert('Hata', 'Kullanıcı bulunamadı!');
        setYukleniyor(false);
        return;
      }

      const uid          = Object.keys(data)[0];
      const kullaniciObj = { uid, ...data[uid] };

      // Şifre kontrolü
      if (kullaniciObj.sifre !== sifre.trim()) {
        Alert.alert('Hata', 'Şifre yanlış!');
        setYukleniyor(false);
        return;
      }

      // Kreş bilgisini çek
      let kresObj = null;
      if (kullaniciObj.kresId) {
        const kresRes  = await fetch(`${DB_URL}/kresler/${kullaniciObj.kresId}.json`);
        const kresData = await kresRes.json();
        if (kresData) kresObj = { id: kullaniciObj.kresId, ...kresData };
      }

      onGiris(kullaniciObj, uid, kresObj);

    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası, tekrar deneyin!');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.ic} keyboardShouldPersistTaps="handled">

          {/* LOGO */}
          <View style={s.logoAlan}>
            <Text style={s.logoEmoji}>🌟</Text>
            <Text style={s.logoYazi}>YUMURCAK</Text>
            <Text style={s.slogan}>Miniklerinizle her an bağlantıda</Text>
          </View>

          {/* GİRİŞ KARTI */}
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
                placeholderTextColor={RENKLER.altMetin}
              />
              <TouchableOpacity onPress={() => setSifreGoster(!sifreGoster)}>
                <Text style={{ fontSize: 18 }}>{sifreGoster ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btn, yukleniyor && { opacity: 0.7 }]}
              onPress={girisYap}
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

          <Text style={s.versiyon}>© 2026 Yumurcak v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// STİLLER
// ============================================================
const s = StyleSheet.create({
  con: {
    flex: 1,
    backgroundColor: RENKLER.turuncu,
  },
  ic: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoAlan: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  logoYazi: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
  },
  slogan: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  kart: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  kartBaslik: {
    fontSize: 22,
    fontWeight: '800',
    color: RENKLER.metin,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputBaslik: {
    fontSize: 13,
    fontWeight: '700',
    color: RENKLER.altMetin,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputSarici: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.arkaplan,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: RENKLER.sinir,
  },
  inputIkon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: RENKLER.metin,
  },
  btn: {
    backgroundColor: RENKLER.turuncu,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    elevation: 4,
    shadowColor: RENKLER.turuncu,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  btnYazi: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  altBilgi: {
    textAlign: 'center',
    color: RENKLER.altMetin,
    fontSize: 12,
    marginTop: 16,
    lineHeight: 18,
  },
  versiyon: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 24,
  },
});
