// ============================================================
// YUMURCAK — PaymentFormScreen.js
// Ödeme ekleme / düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation, useRoute } from '@react-navigation/native';

const DURUMLAR = ['bekliyor', 'odendi', 'gecikti'];
const DURUM_ETIKET = { bekliyor: '⏳ Bekliyor', odendi: '✅ Ödendi', gecikti: '❗ Gecikti' };
const AY_ADLARI = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function PaymentFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const paymentId = route.params?.paymentId || null;
  const duzenleme = !!paymentId;

  const [cocuklar, setCocuklar] = useState([]);
  const [seciliCocukId, setSeciliCocukId] = useState('');
  const [ay, setAy] = useState(new Date().getMonth() + 1);
  const [yil, setYil] = useState(new Date().getFullYear());
  const [tutar, setTutar] = useState('');
  const [durum, setDurum] = useState('bekliyor');
  const [odemeTarihi, setOdemeTarihi] = useState('');
  const [loading, setLoading] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);

  useEffect(() => {
    let cocuklarData = {};
    let cocuklarLoaded = false;
    let odemeLoaded = !duzenleme;

    function tryFinish() {
      if (cocuklarLoaded && odemeLoaded) setLoading(false);
    }

    const cocuklarUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      cocuklarData = snap.val() || {};
      const liste = Object.entries(cocuklarData).map(([id, c]) => ({
        id,
        ad: `${c.ad || ''} ${c.soyad || ''}`.trim() || c.ad || id,
      }));
      setCocuklar(liste);
      if (!seciliCocukId && liste.length > 0) setSeciliCocukId(liste[0].id);
      cocuklarLoaded = true;
      tryFinish();
    });

    if (duzenleme) {
      const odemeUnsub = onValue(ref(database, `odemeler/${paymentId}`), (snap) => {
        const o = snap.val();
        if (o) {
          setSeciliCocukId(o.cocukId || '');
          setAy(o.ay || 1);
          setYil(o.yil || new Date().getFullYear());
          setTutar(o.tutar ? String(o.tutar) : '');
          setDurum(o.durum || 'bekliyor');
          setOdemeTarihi(o.odemeTarihi || '');
        }
        odemeLoaded = true;
        tryFinish();
      });
      return () => { cocuklarUnsub(); odemeUnsub(); };
    }

    return () => cocuklarUnsub();
  }, []);

  async function kaydet() {
    if (!seciliCocukId) return Alert.alert('Hata', 'Çocuk seçiniz.');
    if (!tutar || isNaN(Number(tutar))) return Alert.alert('Hata', 'Geçerli bir tutar giriniz.');

    setKaydediyor(true);
    try {
      const veri = {
        cocukId: seciliCocukId,
        ay: Number(ay),
        yil: Number(yil),
        tutar: Number(tutar),
        durum,
        odemeTarihi: odemeTarihi || null,
        createdAt: Date.now(),
      };

      if (duzenleme) {
        await set(ref(database, `odemeler/${paymentId}`), veri);
      } else {
        await push(ref(database, 'odemeler'), veri);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setKaydediyor(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#3C3489" /></View>;
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Çocuk Seçimi */}
        <Text style={s.etiket}>Çocuk *</Text>
        <View style={s.secimGrubu}>
          {cocuklar.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[s.secimBtn, seciliCocukId === c.id && s.secimBtnAktif]}
              onPress={() => setSeciliCocukId(c.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.secimBtnYazi, seciliCocukId === c.id && s.secimBtnYaziAktif]}>
                {c.ad}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ay Seçimi */}
        <Text style={s.etiket}>Ay *</Text>
        <View style={s.secimGrubu}>
          {AY_ADLARI.slice(1).map((ad, i) => {
            const ayNo = i + 1;
            return (
              <TouchableOpacity
                key={ayNo}
                style={[s.secimBtn, ay === ayNo && s.secimBtnAktif]}
                onPress={() => setAy(ayNo)}
                activeOpacity={0.8}
              >
                <Text style={[s.secimBtnYazi, ay === ayNo && s.secimBtnYaziAktif]}>{ad}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Yıl */}
        <Text style={s.etiket}>Yıl *</Text>
        <TextInput
          style={s.input}
          value={String(yil)}
          onChangeText={(t) => setYil(Number(t) || yil)}
          keyboardType="numeric"
          maxLength={4}
          placeholder="2026"
        />

        {/* Tutar */}
        <Text style={s.etiket}>Tutar (₺) *</Text>
        <TextInput
          style={s.input}
          value={tutar}
          onChangeText={setTutar}
          keyboardType="numeric"
          placeholder="7500"
        />

        {/* Durum */}
        <Text style={s.etiket}>Durum *</Text>
        <View style={s.secimGrubu}>
          {DURUMLAR.map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.secimBtn, durum === d && s.secimBtnAktif]}
              onPress={() => setDurum(d)}
              activeOpacity={0.8}
            >
              <Text style={[s.secimBtnYazi, durum === d && s.secimBtnYaziAktif]}>
                {DURUM_ETIKET[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ödeme Tarihi */}
        <Text style={s.etiket}>Ödeme Tarihi</Text>
        <TextInput
          style={s.input}
          value={odemeTarihi}
          onChangeText={setOdemeTarihi}
          placeholder="YYYY-AA-GG"
          maxLength={10}
        />

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[s.kaydetBtn, kaydediyor && { opacity: 0.6 }]}
          onPress={kaydet}
          disabled={kaydediyor}
          activeOpacity={0.85}
        >
          {kaydediyor
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.kaydetYazi}>{duzenleme ? '💾 Güncelle' : '💾 Kaydet'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  screen: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  etiket: { fontSize: 13, fontWeight: '800', color: '#3C3489', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#191A23', elevation: 1,
  },

  secimGrubu: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secimBtn: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
  },
  secimBtnAktif: { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  secimBtnYazi: { fontSize: 13, color: '#555', fontWeight: '600' },
  secimBtnYaziAktif: { color: '#fff' },

  kaydetBtn: {
    backgroundColor: '#3C3489', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 28,
  },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
