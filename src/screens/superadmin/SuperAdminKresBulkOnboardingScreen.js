// ============================================================
// YUMURCAK — SuperAdminKresBulkOnboardingScreen.js
// Bir kreşin sınıf + öğretmen + veli + öğrenci yapısını kutucuklu,
// "+ ekle" ile büyüyen bir formdan tek seferde oluşturur (serbest
// metin yok — web paneldeki BulkOnboardingPage.jsx ile aynı mantık).
//
// Yapı: her sınıf açılır/kapanır bir kart. Kart içinde sınıf bilgisi
// (ad, yaş grubu chip'leri, öğretmen) + öğrenci kartları listesi var.
// Her öğrenci kartında veli bilgisi de var. Formda daha önce girilen
// veliler öğrenci kartının altında "hızlı seç" chip'i olarak çıkar —
// kardeş öğrenci eklerken tek dokunuşla aynı veliyi bağlayabilirsin.
//
// "Kur"a basınca: aynı kullanıcı adına sahip öğretmen/veli DB'de
// zaten varsa yeniden hesap açmaz, mevcut hesabı bulup bağlar —
// ekranı 2 kez çalıştırmak güvenlidir.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { get, push, ref, update } from 'firebase/database';
import { database, firebaseConfig } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { normalizeUsername, usernameToEmail } from '../../utils/authHelpers';
import { YAS_GRUPLARI } from '../../constants';
import {
  addUserIndexUpdates,
  addChildIndexUpdates,
  addClassIndexUpdates,
} from '../../utils/firebaseIndexHelpers';
import { useRoute, useNavigation } from '@react-navigation/native';

const THEME = {
  bg: '#0F172A',
  panel: '#111827',
  card: '#1E293B',
  softCard: '#162033',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#38BDF8',
  green: '#22C55E',
  red: '#F87171',
};

let localKeyCounter = 0;
function localKey() {
  localKeyCounter += 1;
  return `k${Date.now()}${localKeyCounter}`;
}

function bosOgrenci() {
  return { key: localKey(), ad: '', dogumTarihi: '', veliAd: '', veliKullaniciAdi: '' };
}

function bosSinif() {
  return {
    key: localKey(),
    ad: '',
    yasGrubu: '',
    ogretmenAd: '',
    ogretmenKullaniciAdi: '',
    ogrenciler: [bosOgrenci()],
  };
}

// ------------------------------------------------------------
// AUTH — REST API (superadmin oturumunu bozmadan yeni hesap açar)
// ------------------------------------------------------------
async function createAuthUserViaRest(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || 'AUTH_REST_ERROR';
    const e = new Error(msg);
    e.code = msg.includes('EMAIL_EXISTS') ? 'auth/email-already-in-use' : msg;
    throw e;
  }
  return data.localId;
}

// Kullanıcı adı zaten varsa mevcut id'yi döner (yeni hesap açmaz).
async function bulOrOlusturKullanici({ ad, kullaniciAdi, rol, kresId, sifre, updates, index }) {
  const clean = normalizeUsername(kullaniciAdi);

  const mevcutSnap = await get(ref(database, `kullaniciAdiIndex/${clean}`));
  if (mevcutSnap.exists()) {
    return { id: mevcutSnap.val(), yeniMi: false };
  }
  if (index[clean]) {
    return { id: index[clean], yeniMi: false };
  }

  const email = usernameToEmail(clean);
  const authUid = await createAuthUserViaRest(email, sifre);

  const userRef = push(ref(database, 'kullanicilar'));
  const id = userRef.key;
  const now = Date.now();

  const userRecord = {
    uid: id,
    id,
    authUid,
    email,
    authProvider: 'firebase',
    authCreatedAt: now,
    authUpdatedAt: now,
    kresId,
    ad,
    kullaniciAdi: clean,
    sifre,
    rol,
    aktif: true,
    createdAt: now,
    updatedAt: now,
  };

  updates[`kullanicilar/${id}`] = userRecord;
  updates[`authKullaniciIndex/${authUid}`] = id;
  addUserIndexUpdates(updates, id, userRecord);

  index[clean] = id;
  return { id, yeniMi: true };
}

export default function SuperAdminKresBulkOnboardingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kresId, kresAdi } = route.params || {};

  const [siniflar, setSiniflar] = useState([bosSinif()]);
  const [acikSinif, setAcikSinif] = useState(siniflar[0].key);
  const [sifre, setSifre] = useState('123456');
  const [saving, setSaving] = useState(false);
  const [sonuc, setSonuc] = useState(null);

  const veliOnerileri = useMemo(() => {
    const map = new Map();
    siniflar.forEach((s) => {
      s.ogrenciler.forEach((o) => {
        const clean = (o.veliKullaniciAdi || '').trim();
        if (clean && o.veliAd) map.set(clean, o.veliAd);
      });
    });
    return Array.from(map.entries()).map(([kullaniciAdi, ad]) => ({ ad, kullaniciAdi }));
  }, [siniflar]);

  const toplamOgrenci = useMemo(
    () => siniflar.reduce((t, s) => t + s.ogrenciler.filter((o) => o.ad.trim()).length, 0),
    [siniflar]
  );

  const sinifEkle = () => {
    const yeni = bosSinif();
    setSiniflar((prev) => [...prev, yeni]);
    setAcikSinif(yeni.key);
  };

  const sinifSil = (sinifKey) => {
    setSiniflar((prev) => prev.filter((s) => s.key !== sinifKey));
  };

  const sinifAlanGuncelle = (sinifKey, alan, deger) => {
    setSiniflar((prev) => prev.map((s) => (s.key === sinifKey ? { ...s, [alan]: deger } : s)));
  };

  const ogrenciEkle = (sinifKey) => {
    setSiniflar((prev) =>
      prev.map((s) => (s.key === sinifKey ? { ...s, ogrenciler: [...s.ogrenciler, bosOgrenci()] } : s))
    );
  };

  const ogrenciSil = (sinifKey, ogrenciKey) => {
    setSiniflar((prev) =>
      prev.map((s) =>
        s.key === sinifKey ? { ...s, ogrenciler: s.ogrenciler.filter((o) => o.key !== ogrenciKey) } : s
      )
    );
  };

  const ogrenciAlanGuncelle = (sinifKey, ogrenciKey, alan, deger) => {
    setSiniflar((prev) =>
      prev.map((s) =>
        s.key === sinifKey
          ? { ...s, ogrenciler: s.ogrenciler.map((o) => (o.key === ogrenciKey ? { ...o, [alan]: deger } : o)) }
          : s
      )
    );
  };

  const veliHizliSec = (sinifKey, ogrenciKey, oneri) => {
    ogrenciAlanGuncelle(sinifKey, ogrenciKey, 'veliAd', oneri.ad);
    ogrenciAlanGuncelle(sinifKey, ogrenciKey, 'veliKullaniciAdi', oneri.kullaniciAdi);
  };

  const dogrula = () => {
    const hatalar = [];
    siniflar.forEach((s, si) => {
      if (!s.ad.trim()) hatalar.push(`${si + 1}. sınıf: sınıf adı boş.`);
      if (!s.yasGrubu) hatalar.push(`${s.ad || si + 1}. sınıf: yaş grubu seçilmedi.`);
      if ((s.ogretmenAd.trim() && !s.ogretmenKullaniciAdi.trim()) || (!s.ogretmenAd.trim() && s.ogretmenKullaniciAdi.trim())) {
        hatalar.push(`${s.ad || si + 1}. sınıf: öğretmen adı/kullanıcı adı birlikte doldurulmalı.`);
      }
      const dolular = s.ogrenciler.filter((o) => o.ad.trim() || o.veliAd.trim() || o.veliKullaniciAdi.trim());
      if (dolular.length === 0) hatalar.push(`${s.ad || si + 1}. sınıf: en az bir öğrenci girilmeli.`);
      dolular.forEach((o) => {
        if (!o.ad.trim()) hatalar.push(`${s.ad}: bir öğrencinin adı boş.`);
        if (!o.veliAd.trim() || !o.veliKullaniciAdi.trim()) {
          hatalar.push(`${s.ad} — ${o.ad || 'isimsiz öğrenci'}: veli adı/kullanıcı adı eksik.`);
        }
      });
    });
    return hatalar;
  };

  const olustur = () => {
    if (!kresId) {
      Alert.alert('Hata', 'kresId bulunamadı — bu ekrana kreş detayından geçmelisiniz.');
      return;
    }
    if (sifre.trim().length < 6) {
      Alert.alert('Eksik', 'Ortak şifre en az 6 karakter olmalı.');
      return;
    }
    const hatalar = dogrula();
    if (hatalar.length > 0) {
      Alert.alert('Eksik Bilgi', hatalar[0]);
      return;
    }
    Alert.alert(
      'Toplu Kurulum',
      `${siniflar.length} sınıf, ${toplamOgrenci} öğrenci oluşturulacak. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Oluştur', onPress: kaydet },
      ]
    );
  };

  const kaydet = async () => {
    setSaving(true);
    const kullaniciIndex = {};
    const ozet = { siniflar: 0, ogretmenler: [], veliler: [], ogrenciler: 0, hatalar: [] };
    const now = Date.now();
    const sifreTemiz = sifre.trim();

    try {
      for (const sinifData of siniflar) {
        const gecerliOgrenciler = sinifData.ogrenciler.filter((o) => o.ad.trim());
        if (gecerliOgrenciler.length === 0) continue;

        try {
          const updates = {};

          const sinifRef = push(ref(database, 'siniflar'));
          const sinifId = sinifRef.key;
          const sinifRecord = {
            id: sinifId,
            ad: sinifData.ad.trim(),
            yasGrubu: sinifData.yasGrubu,
            ogretmenIds: [],
            kresId,
            createdAt: now,
            updatedAt: now,
          };

          if (sinifData.ogretmenAd.trim() && sinifData.ogretmenKullaniciAdi.trim()) {
            const { id: ogretmenId, yeniMi } = await bulOrOlusturKullanici({
              ad: sinifData.ogretmenAd.trim(),
              kullaniciAdi: sinifData.ogretmenKullaniciAdi.trim(),
              rol: 'ogretmen',
              kresId,
              sifre: sifreTemiz,
              updates,
              index: kullaniciIndex,
            });
            sinifRecord.ogretmenIds = [ogretmenId];
            ozet.ogretmenler.push({
              ad: sinifData.ogretmenAd.trim(),
              kullaniciAdi: normalizeUsername(sinifData.ogretmenKullaniciAdi),
              yeniMi,
            });
          }

          updates[`siniflar/${sinifId}`] = sinifRecord;
          addClassIndexUpdates(updates, sinifId, sinifRecord);

          for (const ogrenci of gecerliOgrenciler) {
            const { id: veliId, yeniMi } = await bulOrOlusturKullanici({
              ad: ogrenci.veliAd.trim(),
              kullaniciAdi: ogrenci.veliKullaniciAdi.trim(),
              rol: 'veli',
              kresId,
              sifre: sifreTemiz,
              updates,
              index: kullaniciIndex,
            });
            ozet.veliler.push({
              ad: ogrenci.veliAd.trim(),
              kullaniciAdi: normalizeUsername(ogrenci.veliKullaniciAdi),
              yeniMi,
            });

            const cocukId = generateId();
            const cocukRecord = {
              id: cocukId,
              ad: ogrenci.ad.trim(),
              dogumTarihi: ogrenci.dogumTarihi.trim(),
              sinifId,
              kresId,
              veliIds: [veliId],
              yeniBaslayan: true,
              uyumTakibiAktif: true,
              uyumBaslangicTarihi: new Date().toISOString().slice(0, 10),
              uyumSureGun: 30,
              uyumDurumu: 'aktif',
              createdAt: now,
              updatedAt: now,
            };

            updates[`cocuklar/${cocukId}`] = cocukRecord;
            addChildIndexUpdates(updates, cocukId, cocukRecord);
            ozet.ogrenciler += 1;
          }

          await update(ref(database), updates);
          ozet.siniflar += 1;
        } catch (err) {
          ozet.hatalar.push(`${sinifData.ad}: ${err?.code || err?.message || 'Bilinmeyen hata'}`);
        }
      }

      ozet.ogretmenler = Array.from(new Map(ozet.ogretmenler.map((o) => [o.kullaniciAdi, o])).values());
      ozet.veliler = Array.from(new Map(ozet.veliler.map((v) => [v.kullaniciAdi, v])).values());
      setSonuc(ozet);
      setSiniflar([bosSinif()]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{kresAdi || 'Kreş'} — Toplu Kurulum</Text>
            <View style={{ width: 50 }} />
          </View>

          <Section title="Ortak Şifre">
            <TextInput
              style={styles.input}
              value={sifre}
              onChangeText={setSifre}
              placeholder="en az 6 karakter"
              autoCapitalize="none"
            />
          </Section>

          {siniflar.map((sinifData, si) => {
            const acik = acikSinif === sinifData.key;
            const ogrenciSayisi = sinifData.ogrenciler.filter((o) => o.ad.trim()).length;

            return (
              <View key={sinifData.key} style={styles.sinifCard}>
                <TouchableOpacity
                  style={styles.sinifHeader}
                  onPress={() => setAcikSinif(acik ? null : sinifData.key)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sinifHeaderText}>
                    {acik ? '▾' : '▸'} {sinifData.ad || `${si + 1}. Sınıf`} · {ogrenciSayisi} öğrenci
                  </Text>
                  {siniflar.length > 1 && (
                    <TouchableOpacity onPress={() => sinifSil(sinifData.key)} hitSlop={10}>
                      <Text style={styles.silText}>Sil</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {acik && (
                  <View style={styles.sinifBody}>
                    <Text style={styles.label}>Sınıf Adı</Text>
                    <TextInput
                      style={styles.input}
                      value={sinifData.ad}
                      onChangeText={(v) => sinifAlanGuncelle(sinifData.key, 'ad', v)}
                      placeholder="Örn: Kelebekler"
                      placeholderTextColor="#64748B"
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Yaş Grubu</Text>
                    <View style={styles.chipWrap}>
                      {YAS_GRUPLARI.map((item) => {
                        const active = sinifData.yasGrubu === item.label;
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={[styles.yasChip, active && styles.yasChipActive]}
                            onPress={() => sinifAlanGuncelle(sinifData.key, 'yasGrubu', item.label)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.yasChipText, active && styles.yasChipTextActive]}>{item.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={[styles.label, { marginTop: 12 }]}>Öğretmen (opsiyonel)</Text>
                    <View style={styles.row}>
                      <TextInput
                        style={[styles.input, styles.rowInput]}
                        value={sinifData.ogretmenAd}
                        onChangeText={(v) => sinifAlanGuncelle(sinifData.key, 'ogretmenAd', v)}
                        placeholder="Ad Soyad"
                        placeholderTextColor="#64748B"
                      />
                      <TextInput
                        style={[styles.input, styles.rowInput]}
                        value={sinifData.ogretmenKullaniciAdi}
                        onChangeText={(v) => sinifAlanGuncelle(sinifData.key, 'ogretmenKullaniciAdi', v)}
                        placeholder="kullanici_adi"
                        placeholderTextColor="#64748B"
                        autoCapitalize="none"
                      />
                    </View>

                    <Text style={[styles.label, { marginTop: 16 }]}>Öğrenciler</Text>
                    {sinifData.ogrenciler.map((ogrenci) => (
                      <View key={ogrenci.key} style={styles.ogrenciCard}>
                        <View style={styles.ogrenciCardHeader}>
                          <Text style={styles.ogrenciCardTitle}>Öğrenci</Text>
                          {sinifData.ogrenciler.length > 1 && (
                            <TouchableOpacity onPress={() => ogrenciSil(sinifData.key, ogrenci.key)} hitSlop={10}>
                              <Text style={styles.silText}>Sil</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <TextInput
                          style={styles.input}
                          value={ogrenci.ad}
                          onChangeText={(v) => ogrenciAlanGuncelle(sinifData.key, ogrenci.key, 'ad', v)}
                          placeholder="Öğrenci Adı"
                          placeholderTextColor="#64748B"
                        />
                        <TextInput
                          style={[styles.input, { marginTop: 8 }]}
                          value={ogrenci.dogumTarihi}
                          onChangeText={(v) => ogrenciAlanGuncelle(sinifData.key, ogrenci.key, 'dogumTarihi', v)}
                          placeholder="Doğum Tarihi (2022-05-15) — opsiyonel"
                          placeholderTextColor="#64748B"
                        />
                        <View style={[styles.row, { marginTop: 8 }]}>
                          <TextInput
                            style={[styles.input, styles.rowInput]}
                            value={ogrenci.veliAd}
                            onChangeText={(v) => ogrenciAlanGuncelle(sinifData.key, ogrenci.key, 'veliAd', v)}
                            placeholder="Veli Adı"
                            placeholderTextColor="#64748B"
                          />
                          <TextInput
                            style={[styles.input, styles.rowInput]}
                            value={ogrenci.veliKullaniciAdi}
                            onChangeText={(v) => ogrenciAlanGuncelle(sinifData.key, ogrenci.key, 'veliKullaniciAdi', v)}
                            placeholder="veli_kullanici_adi"
                            placeholderTextColor="#64748B"
                            autoCapitalize="none"
                          />
                        </View>

                        {veliOnerileri.length > 0 && (
                          <View style={styles.veliOneriWrap}>
                            {veliOnerileri.map((oneri) => (
                              <TouchableOpacity
                                key={oneri.kullaniciAdi}
                                style={styles.veliOneriChip}
                                onPress={() => veliHizliSec(sinifData.key, ogrenci.key, oneri)}
                              >
                                <Text style={styles.veliOneriChipText}>↩ {oneri.ad}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}

                    <TouchableOpacity style={styles.ekleButton} onPress={() => ogrenciEkle(sinifData.key)}>
                      <Text style={styles.ekleButtonText}>+ Öğrenci Ekle</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.sinifEkleButton} onPress={sinifEkle}>
            <Text style={styles.sinifEkleButtonText}>+ Yeni Sınıf</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={olustur} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Kur ({toplamOgrenci} öğrenci)</Text>}
          </TouchableOpacity>

          {sonuc && (
            <Section title="Sonuç">
              <Text style={styles.resultLine}>✅ {sonuc.siniflar} sınıf, {sonuc.ogrenciler} öğrenci oluşturuldu.</Text>
              {sonuc.ogretmenler.map((o, i) => (
                <Text key={`o${i}`} style={styles.resultLine}>
                  {o.yeniMi ? '🆕' : '↩︎'} Öğretmen: {o.kullaniciAdi} / {sifre}
                </Text>
              ))}
              {sonuc.veliler.map((v, i) => (
                <Text key={`v${i}`} style={styles.resultLine}>
                  {v.yeniMi ? '🆕' : '↩︎'} Veli: {v.kullaniciAdi} / {sifre}
                </Text>
              ))}
              {sonuc.hatalar.map((h, i) => (
                <Text key={`h${i}`} style={[styles.resultLine, { color: THEME.red }]}>
                  ❌ {h}
                </Text>
              ))}
              <Text style={styles.resultNote}>
                🆕 yeni açılan hesap, ↩︎ zaten var olan hesaba bağlandı (ör. kardeş öğrenci, aynı öğretmen).
              </Text>
            </Section>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backText: { color: THEME.blue, fontWeight: '900', fontSize: 16 },
  headerTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  section: { backgroundColor: THEME.panel, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: THEME.line, marginBottom: 14 },
  sectionTitle: { color: THEME.text, fontSize: 15, fontWeight: '900', marginBottom: 10 },
  input: { minHeight: 46, backgroundColor: '#0B1220', borderWidth: 1, borderColor: THEME.line, borderRadius: 14, paddingHorizontal: 13, color: THEME.text, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  rowInput: { flex: 1 },
  label: { color: THEME.muted, fontWeight: '800', fontSize: 12, marginBottom: 6 },

  sinifCard: { backgroundColor: THEME.panel, borderRadius: 20, borderWidth: 1, borderColor: THEME.line, marginBottom: 12, overflow: 'hidden' },
  sinifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  sinifHeaderText: { color: THEME.text, fontWeight: '900', fontSize: 14, flex: 1 },
  sinifBody: { paddingHorizontal: 15, paddingBottom: 15 },
  silText: { color: THEME.red, fontWeight: '900', fontSize: 13 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yasChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: THEME.line, backgroundColor: '#0B1220' },
  yasChipActive: { backgroundColor: THEME.blue, borderColor: THEME.blue },
  yasChipText: { color: THEME.muted, fontWeight: '800', fontSize: 12 },
  yasChipTextActive: { color: '#0B1220' },

  ogrenciCard: { backgroundColor: THEME.softCard, borderRadius: 16, padding: 12, marginTop: 10, borderWidth: 1, borderColor: THEME.line },
  ogrenciCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ogrenciCardTitle: { color: THEME.muted, fontWeight: '800', fontSize: 12 },

  veliOneriWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  veliOneriChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#0B1220', borderWidth: 1, borderColor: THEME.line },
  veliOneriChipText: { color: THEME.blue, fontWeight: '700', fontSize: 11 },

  ekleButton: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#0B1220', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: THEME.line },
  ekleButtonText: { color: THEME.blue, fontWeight: '900' },

  sinifEkleButton: { alignItems: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: THEME.line, borderStyle: 'dashed', marginBottom: 16 },
  sinifEkleButtonText: { color: THEME.text, fontWeight: '900' },

  saveButton: { backgroundColor: THEME.green, borderRadius: 18, padding: 17, alignItems: 'center', marginTop: 2, marginBottom: 4 },
  saveText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  resultLine: { color: THEME.text, fontWeight: '700', marginBottom: 4 },
  resultNote: { color: THEME.muted, fontWeight: '600', marginTop: 8, fontSize: 12, lineHeight: 17 },
});
