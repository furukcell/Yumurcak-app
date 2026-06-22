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
import { useAuth } from '../../context/AuthContext';

const DURUMLAR = ['bekliyor', 'odendi', 'gecikti'];
const DURUM_ETIKET = { bekliyor: '⏳ Bekliyor', odendi: '✅ Ödendi', gecikti: '❗ Gecikti' };
const AY_ADLARI = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function pad2(value) { return String(value).padStart(2, '0'); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthLabel(ay, yil) { return `${AY_ADLARI[Number(ay)] || ay} ${yil || ''}`.trim(); }

export default function PaymentFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { kullanici } = useAuth();
  const paymentId = route.params?.paymentId || null;
  const duzenleme = !!paymentId;
  const kresId = kullanici?.kresId || 'default-kres';

  const [cocuklar, setCocuklar] = useState([]);
  const [seciliCocukId, setSeciliCocukId] = useState('');
  const [ay, setAy] = useState(new Date().getMonth() + 1);
  const [yil, setYil] = useState(new Date().getFullYear());
  const [baslik, setBaslik] = useState('Aylık Kreş Ücreti');
  const [tutar, setTutar] = useState('');
  const [durum, setDurum] = useState('bekliyor');
  const [sonOdemeTarihi, setSonOdemeTarihi] = useState('');
  const [odemeTarihi, setOdemeTarihi] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [createdAt, setCreatedAt] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);

  useEffect(() => {
    let cocuklarLoaded = false;
    let odemeLoaded = !duzenleme;

    function finish() {
      if (cocuklarLoaded && odemeLoaded) setLoading(false);
    }

    const cocuklarUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      const data = snap.val() || {};
      const liste = Object.entries(data)
        .filter(([, c]) => !c.kresId || c.kresId === kresId)
        .map(([id, c]) => ({
          id,
          ...c,
          adSoyad: `${c.ad || ''} ${c.soyad || ''}`.trim() || c.adSoyad || c.ad || id,
        }));
      setCocuklar(liste);
      if (!seciliCocukId && liste.length > 0) setSeciliCocukId(liste[0].id);
      cocuklarLoaded = true;
      finish();
    });

    if (duzenleme) {
      const odemeUnsub = onValue(ref(database, `odemeler/${paymentId}`), (snap) => {
        const o = snap.val();
        if (o) {
          setSeciliCocukId(o.cocukId || '');
          setAy(o.ay || 1);
          setYil(o.yil || new Date().getFullYear());
          setBaslik(o.baslik || o.aciklama || 'Aylık Kreş Ücreti');
          setTutar(o.tutar ? String(o.tutar) : '');
          setDurum(o.durum || 'bekliyor');
          setSonOdemeTarihi(o.sonOdemeTarihi || '');
          setOdemeTarihi(o.odemeTarihi || '');
          setAciklama(o.aciklama || '');
          setCreatedAt(o.createdAt || Date.now());
        }
        odemeLoaded = true;
        finish();
      });
      return () => { cocuklarUnsub(); odemeUnsub(); };
    }

    return () => cocuklarUnsub();
  }, []);

  async function kaydet() {
    if (!seciliCocukId) return Alert.alert('Hata', 'Çocuk seçiniz.');
    if (!tutar || isNaN(Number(tutar))) return Alert.alert('Hata', 'Geçerli bir tutar giriniz.');

    const cocuk = cocuklar.find((c) => c.id === seciliCocukId) || {};
    const veliId = cocuk.veliId || cocuk.veliIds?.[0] || null;
    const finalOdemeTarihi = durum === 'odendi' ? (odemeTarihi || todayKey()) : (odemeTarihi || null);

    setKaydediyor(true);
    try {
      const veri = {
        kresId,
        cocukId: seciliCocukId,
        veliId,
        veliIds: cocuk.veliIds || (veliId ? [veliId] : []),
        baslik: baslik.trim() || 'Aylık Kreş Ücreti',
        aciklama: aciklama.trim() || baslik.trim() || 'Aylık Kreş Ücreti',
        ay: Number(ay),
        yil: Number(yil),
        donem: monthLabel(ay, yil),
        tarih: `${yil}-${pad2(ay)}`,
        tutar: Number(tutar),
        durum,
        sonOdemeTarihi: sonOdemeTarihi || null,
        odemeTarihi: finalOdemeTarihi,
        createdAt,
        updatedAt: Date.now(),
      };

      if (duzenleme) await set(ref(database, `odemeler/${paymentId}`), veri);
      else await push(ref(database, 'odemeler'), veri);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setKaydediyor(false);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3C3489" /></View>;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.etiket}>Çocuk *</Text>
        <View style={s.secimGrubu}>
          {cocuklar.map((c) => (
            <TouchableOpacity key={c.id} style={[s.secimBtn, seciliCocukId === c.id && s.secimBtnAktif]} onPress={() => setSeciliCocukId(c.id)} activeOpacity={0.8}>
              <Text style={[s.secimBtnYazi, seciliCocukId === c.id && s.secimBtnYaziAktif]}>{c.adSoyad}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.etiket}>Başlık *</Text>
        <TextInput style={s.input} value={baslik} onChangeText={setBaslik} placeholder="Aylık Kreş Ücreti" />

        <Text style={s.etiket}>Ay *</Text>
        <View style={s.secimGrubu}>
          {AY_ADLARI.slice(1).map((ad, i) => {
            const ayNo = i + 1;
            return (
              <TouchableOpacity key={ayNo} style={[s.secimBtn, ay === ayNo && s.secimBtnAktif]} onPress={() => setAy(ayNo)} activeOpacity={0.8}>
                <Text style={[s.secimBtnYazi, ay === ayNo && s.secimBtnYaziAktif]}>{ad}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.etiket}>Yıl *</Text>
        <TextInput style={s.input} value={String(yil)} onChangeText={(t) => setYil(Number(t) || yil)} keyboardType="numeric" maxLength={4} placeholder="2026" />

        <Text style={s.etiket}>Tutar (₺) *</Text>
        <TextInput style={s.input} value={tutar} onChangeText={setTutar} keyboardType="numeric" placeholder="7500" />

        <Text style={s.etiket}>Durum *</Text>
        <View style={s.secimGrubu}>
          {DURUMLAR.map((d) => (
            <TouchableOpacity key={d} style={[s.secimBtn, durum === d && s.secimBtnAktif]} onPress={() => setDurum(d)} activeOpacity={0.8}>
              <Text style={[s.secimBtnYazi, durum === d && s.secimBtnYaziAktif]}>{DURUM_ETIKET[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.etiket}>Son Ödeme Tarihi</Text>
        <TextInput style={s.input} value={sonOdemeTarihi} onChangeText={setSonOdemeTarihi} placeholder="YYYY-AA-GG" maxLength={10} />

        <Text style={s.etiket}>Ödeme Tarihi</Text>
        <TextInput style={s.input} value={odemeTarihi} onChangeText={setOdemeTarihi} placeholder="YYYY-AA-GG" maxLength={10} />

        <Text style={s.etiket}>Açıklama</Text>
        <TextInput style={[s.input, s.textArea]} value={aciklama} onChangeText={setAciklama} placeholder="Örn: Haziran aidatı" multiline />

        <TouchableOpacity style={[s.kaydetBtn, kaydediyor && { opacity: 0.6 }]} onPress={kaydet} disabled={kaydediyor} activeOpacity={0.85}>
          {kaydediyor ? <ActivityIndicator color="#fff" /> : <Text style={s.kaydetYazi}>{duzenleme ? '💾 Güncelle' : '💾 Kaydet'}</Text>}
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
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#191A23', elevation: 1 },
  textArea: { minHeight: 82, textAlignVertical: 'top' },
  secimGrubu: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secimBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  secimBtnAktif: { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  secimBtnYazi: { fontSize: 13, color: '#555', fontWeight: '600' },
  secimBtnYaziAktif: { color: '#fff' },
  kaydetBtn: { backgroundColor: '#3C3489', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '800' },
});