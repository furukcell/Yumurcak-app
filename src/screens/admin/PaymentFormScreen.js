// ============================================================
// YUMURCAK — PaymentFormScreen.js
// Ödeme ekleme / düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, SafeAreaView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { ref, onValue, set, push, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { createUserNotification } from '../../services/notificationCenter';
import AppSuccessToast from '../../components/AppSuccessToast';

const DURUMLAR = ['bekliyor', 'odendi', 'gecikti'];
const DURUM_ETIKET = { bekliyor: '⏳ Bekliyor', odendi: '✅ Ödendi', gecikti: '❗ Gecikti' };
const AY_ADLARI = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function toList(data) {
  return Object.entries(safeObject(data)).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function pad2(value) { return String(value).padStart(2, '0'); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthLabel(ay, yil) { return `${AY_ADLARI[Number(ay)] || ay} ${yil || ''}`.trim(); }
function clampMonth(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return new Date().getMonth() + 1;
  return Math.min(12, Math.max(1, n));
}
function normalizeDurum(value) {
  const v = String(value || '').toLowerCase().trim();
  if (['odendi', 'ödendi', 'paid', 'tamamlandi', 'tamamlandı'].includes(v)) return 'odendi';
  if (['gecikti', 'geçti', 'late', 'overdue'].includes(v)) return 'gecikti';
  return 'bekliyor';
}
function onlyNumberText(value) {
  return String(value || '').replace(',', '.').replace(/[^0-9.]/g, '');
}
function childName(c) {
  return `${c.ad || ''} ${c.soyad || ''}`.trim() || c.adSoyad || c.isim || c.id || 'Çocuk';
}
function formatMoney(value) {
  const number = Number(onlyNumberText(value));
  return Number.isFinite(number) && number > 0 ? `${number.toLocaleString('tr-TR')} ₺` : '-';
}
function dueDateForMonth(yil, ay) {
  return `${Number(yil) || new Date().getFullYear()}-${pad2(clampMonth(ay))}-10`;
}

export default function PaymentFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { kullanici } = useAuth();
  const paymentId = route.params?.paymentId || null;
  const duzenleme = !!paymentId;
  const kresId = kullanici?.kresId || kullanici?.kurumId || null;

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
  const [successToast, setSuccessToast] = useState(false);
  const [kaydediyor, setKaydediyor] = useState(false);

  useEffect(() => {
    let cocuklarLoaded = false;
    let odemeLoaded = !duzenleme;
    let alive = true;

    function finish() {
      if (alive && cocuklarLoaded && odemeLoaded) setLoading(false);
    }

    const cocuklarTarget = kresId
      ? query(ref(database, 'cocuklar'), orderByChild('kresId'), equalTo(kresId))
      : ref(database, 'cocuklar');

    const cocuklarUnsub = onValue(
      cocuklarTarget,
      (snap) => {
        const liste = toList(snap.val())
          .map((c) => ({ ...c, adSoyad: childName(c) }))
          .sort((a, b) => String(a.adSoyad || '').localeCompare(String(b.adSoyad || ''), 'tr'));
        setCocuklar(liste);
        setSeciliCocukId((prev) => prev || liste[0]?.id || '');
        cocuklarLoaded = true;
        finish();
      },
      () => {
        setCocuklar([]);
        cocuklarLoaded = true;
        finish();
      }
    );

    let odemeUnsub = null;
    if (duzenleme) {
      odemeUnsub = onValue(
        ref(database, `odemeler/${paymentId}`),
        (snap) => {
          const o = safeObject(snap.val());
          if (Object.keys(o).length > 0) {
            setSeciliCocukId(o.cocukId || o.childId || '');
            setAy(clampMonth(o.ay || String(o.tarih || '').split('-')[1]));
            setYil(Number(o.yil || String(o.tarih || '').split('-')[0]) || new Date().getFullYear());
            setBaslik(o.baslik || o.title || o.aciklama || 'Aylık Kreş Ücreti');
            setTutar(o.tutar || o.amount ? String(o.tutar || o.amount) : '');
            setDurum(normalizeDurum(o.durum || o.status));
            setSonOdemeTarihi(o.sonOdemeTarihi || o.dueDate || '');
            setOdemeTarihi(o.odemeTarihi || o.paymentDate || '');
            setAciklama(o.aciklama || o.description || '');
            setCreatedAt(o.createdAt || Date.now());
          }
          odemeLoaded = true;
          finish();
        },
        () => {
          odemeLoaded = true;
          finish();
        }
      );
    }

    return () => {
      alive = false;
      cocuklarUnsub();
      if (odemeUnsub) odemeUnsub();
    };
  }, [duzenleme, paymentId, kresId]);

  async function kaydet() {
    if (!seciliCocukId) return Alert.alert('Hata', 'Çocuk seçiniz.');
    const finalTutar = Number(onlyNumberText(tutar));
    if (!finalTutar || !Number.isFinite(finalTutar)) return Alert.alert('Hata', 'Geçerli bir tutar giriniz.');

    const finalAy = clampMonth(ay);
    const finalYil = Number(yil) || new Date().getFullYear();
    const cocuk = cocuklar.find((c) => c.id === seciliCocukId) || {};
    const veliIds = asArray(cocuk.veliIds || cocuk.parentIds || cocuk.veliler).filter(Boolean);
    const veliId = cocuk.veliId || cocuk.parentId || veliIds[0] || null;
    const finalVeliIds = veliIds.length ? veliIds : (veliId ? [veliId] : []);
    const finalOdemeTarihi = durum === 'odendi' ? (odemeTarihi || todayKey()) : (odemeTarihi || null);

    setKaydediyor(true);
    try {
      const veri = {
        kresId,
        cocukId: seciliCocukId,
        childId: seciliCocukId,
        veliId,
        parentId: veliId,
        veliIds: finalVeliIds,
        parentIds: finalVeliIds,
        baslik: baslik.trim() || 'Aylık Kreş Ücreti',
        title: baslik.trim() || 'Aylık Kreş Ücreti',
        aciklama: aciklama.trim() || baslik.trim() || 'Aylık Kreş Ücreti',
        ay: finalAy,
        yil: finalYil,
        donem: monthLabel(finalAy, finalYil),
        tarih: `${finalYil}-${pad2(finalAy)}`,
        tutar: finalTutar,
        amount: finalTutar,
        durum,
        status: durum,
        sonOdemeTarihi: sonOdemeTarihi || null,
        odemeTarihi: finalOdemeTarihi,
        createdAt,
        updatedAt: Date.now(),
      };

      if (duzenleme) {
  await set(ref(database, `odemeler/${paymentId}`), veri);
} else {
  await push(ref(database, 'odemeler'), veri);

  await createUserNotification({
    kresId,
    userIds: finalVeliIds,
    baslik: '💳 Yeni ödeme kaydı',
    mesaj: `${childName(cocuk)} için ${monthLabel(finalAy, finalYil)} dönemine ait ${formatMoney(finalTutar)} ödeme kaydı oluşturuldu.`,
    tip: 'odeme',
    routeName: 'ParentPayments',
    createdBy: kullanici?.uid || kullanici?.id || '',
  });
}

  setSuccessToast(true);
  setTimeout(() => {
  navigation.goBack();
  }, 900);
    } catch (e) {
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setKaydediyor(false);
    }
  }

  function buAyiSec() {
    const d = new Date();
    setAy(d.getMonth() + 1);
    setYil(d.getFullYear());
    setSonOdemeTarihi(dueDateForMonth(d.getFullYear(), d.getMonth() + 1));
  }

  function gelecekAyiSec() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setAy(d.getMonth() + 1);
    setYil(d.getFullYear());
    setSonOdemeTarihi(dueDateForMonth(d.getFullYear(), d.getMonth() + 1));
  }

  const seciliCocuk = cocuklar.find((c) => c.id === seciliCocukId) || {};

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3DEB" /><Text style={s.loadingText}>Form hazırlanıyor...</Text></View>;

  return (
     <SafeAreaView style={s.safe}>
        <AppSuccessToast
         visible={successToast}
         message={duzenleme ? 'Ödeme güncellendi' : 'Ödeme kaydı oluşturuldu'}
         onHide={() => setSuccessToast(false)}
       />
         <KeyboardAvoidingView
           style={{ flex: 1 }}
           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
           keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
         >
         <ScrollView
           style={s.screen}
           contentContainerStyle={s.content}
           keyboardShouldPersistTaps="handled"
           showsVerticalScrollIndicator={false}
        >
           <View style={s.heroCard}>
             <Text style={s.heroTitle}>{duzenleme ? 'Ödeme Kaydını Düzenle' : 'Yeni Ödeme Kaydı'}</Text>
             <Text style={s.heroSub} numberOfLines={1}>{seciliCocuk.adSoyad || 'Çocuk seçiniz'} • {monthLabel(ay, yil)}</Text>
            <View style={s.previewRow}>
              <View style={s.previewBox}><Text style={s.previewLabel}>Tutar</Text><Text style={s.previewValue}>{formatMoney(tutar)}</Text></View>
              <View style={s.previewBox}><Text style={s.previewLabel}>Durum</Text><Text style={s.previewValue}>{DURUM_ETIKET[durum]}</Text></View>
            </View>
          </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Çocuk Seçimi</Text>
          {cocuklar.length === 0 ? (
            <View style={s.emptyChildBox}><Text style={s.emptyChildText}>Bu kuruma bağlı çocuk bulunamadı.</Text></View>
          ) : (
            <View style={s.secimGrubu}>
              {cocuklar.map((c) => (
                <TouchableOpacity key={c.id} style={[s.childBtn, seciliCocukId === c.id && s.childBtnAktif]} onPress={() => setSeciliCocukId(c.id)} activeOpacity={0.8}>
                  <Text style={[s.childName, seciliCocukId === c.id && s.childNameAktif]} numberOfLines={1}>{c.adSoyad}</Text>
                  <Text style={[s.childSub, seciliCocukId === c.id && s.childSubAktif]} numberOfLines={1}>{c.sinifAdi || c.sinifAd || c.sinifId || 'Sınıf bilgisi yok'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Dönem ve Tutar</Text>
          <View style={s.quickRow}>
            <TouchableOpacity style={s.quickBtn} onPress={buAyiSec}><Text style={s.quickText}>Bu Ay</Text></TouchableOpacity>
            <TouchableOpacity style={s.quickBtn} onPress={gelecekAyiSec}><Text style={s.quickText}>Gelecek Ay</Text></TouchableOpacity>
          </View>

          <Text style={s.etiket}>Başlık *</Text>
          <TextInput style={s.input} value={baslik} onChangeText={setBaslik} placeholder="Aylık Kreş Ücreti" />

          <Text style={s.etiket}>Ay *</Text>
          <View style={s.monthGrid}>
            {AY_ADLARI.slice(1).map((ad, i) => {
              const ayNo = i + 1;
              return (
                <TouchableOpacity key={ayNo} style={[s.monthBtn, Number(ay) === ayNo && s.monthBtnAktif]} onPress={() => setAy(ayNo)} activeOpacity={0.8}>
                  <Text style={[s.monthYazi, Number(ay) === ayNo && s.monthYaziAktif]}>{ad.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.etiket}>Yıl *</Text>
          <TextInput style={s.input} value={String(yil)} onChangeText={(t) => setYil(Number(t) || new Date().getFullYear())} keyboardType="numeric" maxLength={4} placeholder="2026" />

          <Text style={s.etiket}>Tutar (₺) *</Text>
          <TextInput style={s.input} value={tutar} onChangeText={setTutar} keyboardType="numeric" placeholder="7500" />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Durum ve Tarihler</Text>
          <View style={s.secimGrubu}>
            {DURUMLAR.map((d) => (
              <TouchableOpacity key={d} style={[s.secimBtn, durum === d && s.secimBtnAktif]} onPress={() => setDurum(d)} activeOpacity={0.8}>
                <Text style={[s.secimBtnYazi, durum === d && s.secimBtnYaziAktif]}>{DURUM_ETIKET[d]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.etiket}>Son Ödeme Tarihi</Text>
          <TextInput style={s.input} value={sonOdemeTarihi} onChangeText={setSonOdemeTarihi} placeholder="YYYY-AA-GG" maxLength={10} />
          <Text style={s.helper}>Örnek: {dueDateForMonth(yil, ay)}</Text>

          <Text style={s.etiket}>Ödeme Tarihi</Text>
          <TextInput style={s.input} value={odemeTarihi} onChangeText={setOdemeTarihi} placeholder="YYYY-AA-GG" maxLength={10} />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Açıklama</Text>
          <TextInput style={[s.input, s.textArea]} value={aciklama} onChangeText={setAciklama} placeholder="Örn: Haziran aidatı" multiline />
        </View>

        <TouchableOpacity style={[s.kaydetBtn, (kaydediyor || cocuklar.length === 0) && { opacity: 0.6 }]} onPress={kaydet} disabled={kaydediyor || cocuklar.length === 0} activeOpacity={0.85}>
          {kaydediyor ? <ActivityIndicator color="#fff" /> : <Text style={s.kaydetYazi}>{duzenleme ? '💾 Güncelle' : '💾 Ödeme Kaydı Oluştur'}</Text>}
        </TouchableOpacity>
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F6FF' },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F6FF' },
  loadingText: { marginTop: 10, color: '#888', fontWeight: '800' },
  heroCard: { backgroundColor: '#6C3DEB', borderRadius: 24, padding: 18, marginBottom: 14, elevation: 5 },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700', marginTop: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  previewBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: 12 },
  previewLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800' },
  previewValue: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 15, marginBottom: 14, borderWidth: 1, borderColor: '#EEEAF8' },
  sectionTitle: { color: '#191A23', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  etiket: { fontSize: 13, fontWeight: '900', color: '#191A23', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#FAFAFF', borderRadius: 14, padding: 14, fontSize: 15, color: '#191A23', borderWidth: 1, borderColor: '#EEEAF8', fontWeight: '700' },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  secimGrubu: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secimBtn: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#FAFAFF', borderWidth: 1, borderColor: '#EEEAF8' },
  secimBtnAktif: { backgroundColor: '#6C3DEB', borderColor: '#6C3DEB' },
  secimBtnYazi: { fontSize: 13, color: '#555', fontWeight: '800' },
  secimBtnYaziAktif: { color: '#fff' },
  childBtn: { width: '100%', borderRadius: 18, padding: 13, backgroundColor: '#FAFAFF', borderWidth: 1, borderColor: '#EEEAF8' },
  childBtnAktif: { backgroundColor: '#6C3DEB', borderColor: '#6C3DEB' },
  childName: { fontSize: 14, color: '#191A23', fontWeight: '900' },
  childNameAktif: { color: '#fff' },
  childSub: { fontSize: 11, color: '#707386', fontWeight: '700', marginTop: 2 },
  childSubAktif: { color: 'rgba(255,255,255,0.78)' },
  emptyChildBox: { backgroundColor: '#FFF7E8', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FFE0A8' },
  emptyChildText: { color: '#FF9F1C', fontWeight: '900', textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickBtn: { flex: 1, backgroundColor: '#EFE8FF', borderRadius: 15, paddingVertical: 12, alignItems: 'center' },
  quickText: { color: '#6C3DEB', fontSize: 13, fontWeight: '900' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthBtn: { width: '22.8%', backgroundColor: '#FAFAFF', borderWidth: 1, borderColor: '#EEEAF8', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  monthBtnAktif: { backgroundColor: '#6C3DEB', borderColor: '#6C3DEB' },
  monthYazi: { color: '#191A23', fontSize: 12, fontWeight: '900' },
  monthYaziAktif: { color: '#fff' },
  helper: { color: '#707386', fontSize: 11, fontWeight: '700', marginTop: 6 },
  kaydetBtn: { backgroundColor: '#6C3DEB', borderRadius: 18, padding: 16, alignItems: 'center', marginTop: 4, elevation: 4 },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
