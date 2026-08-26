// ============================================================
// YUMURCAK — ChildFormScreen.js
// FAZ 19: Sınıf/veli listesi artık index üzerinden, sadece kendi kreşinden çekilir
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';
import { formatChildBirthDate, getChildBirthDate, normalizeChildBirthDate } from '../../utils/childDates';
import { bugunKey } from '../../utils/uyum';

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

export default function ChildFormScreen() {
  const headerHeight = useHeaderHeight();
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { childId } = route.params || {};

  const [ad, setAd] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [sinifId, setSinifId] = useState('');
  const [adres, setAdres] = useState('');
  const [seciliVeliIds, setSeciliVeliIds] = useState([]);
  const [siniflar, setSiniflar] = useState([]);
  const [veliler, setVeliler] = useState([]);
  const [yeniBaslayan, setYeniBaslayan] = useState(false);
  const [uyumBaslangicTarihi, setUyumBaslangicTarihi] = useState(bugunKey());
  const [uyumDurumu, setUyumDurumu] = useState('pasif');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successToast, setSuccessToast] = useState(false);
  // Abonelik öğrenci limiti kontrolü (sadece YENİ çocuk eklerken devreye girer).
  const [ogrenciLimiti, setOgrenciLimiti] = useState(null);
  const [mevcutOgrenciSayisi, setMevcutOgrenciSayisi] = useState(0);

  useEffect(() => {
    const yukle = async () => {
      const kresId = kullanici?.kresId;

      try {
        if (kresId) {
          // ── Sınıflar: kresSiniflari index'i üzerinden ────────
          const sinifIndexSnap = await get(ref(database, `kresSiniflari/${kresId}`));
          if (sinifIndexSnap.exists()) {
            const sinifIds = Object.keys(sinifIndexSnap.val());
            const sinifResults = await Promise.all(
              sinifIds.map((id) =>
                get(ref(database, `siniflar/${id}`)).then((s) => (s.exists() ? { id, ...s.val() } : null))
              )
            );
            setSiniflar(sinifResults.filter(Boolean));
          } else {
            setSiniflar([]);
          }

          // ── Veliler: kresKullanicilari index'i üzerinden ─────
          const veliIndexSnap = await get(ref(database, `kresKullanicilari/${kresId}/veliler`));
          if (veliIndexSnap.exists()) {
            const veliIds = Object.keys(veliIndexSnap.val());
            const veliResults = await Promise.all(
              veliIds.map((id) =>
                get(ref(database, `kullanicilar/${id}`)).then((v) => (v.exists() ? { id, ...v.val() } : null))
              )
            );
            setVeliler(veliResults.filter(Boolean));
          } else {
            setVeliler([]);
          }
          // ── Abonelik limiti (sadece yeni kayıt eklerken kontrol edilir) ─
          if (!childId) {
            const [abonelikSnap, cocukIndexSnap] = await Promise.all([
              get(ref(database, `abonelikler/${kresId}`)),
              get(ref(database, `kresCocuklari/${kresId}`)),
            ]);
            const abonelik = abonelikSnap.val();
            setOgrenciLimiti(abonelik?.ogrenciLimiti ? Number(abonelik.ogrenciLimiti) : null);
            setMevcutOgrenciSayisi(cocukIndexSnap.exists() ? Object.keys(cocukIndexSnap.val()).length : 0);
          }
        } else {
          setSiniflar([]);
          setVeliler([]);
        }
      } catch (error) {
        console.warn('Sınıf/veli listesi çekme hatası:', error);
        setSiniflar([]);
        setVeliler([]);
      }

      if (childId) {
        const snap = await get(ref(database, `cocuklar/${childId}`));
        if (snap.exists()) {
          const data = snap.val();
          setAd(`${data.ad || ''} ${data.soyad || ''}`.trim() || data.ad || '');
          setDogumTarihi(formatChildBirthDate(getChildBirthDate(data)) === 'Belirtilmemiş' ? '' : formatChildBirthDate(getChildBirthDate(data)));
          setSinifId(data.sinifId || '');
          setAdres(data.adres || '');
          setSeciliVeliIds(data.veliIds || []);
          setYeniBaslayan(data.yeniBaslayan === true || data.uyumTakibiAktif === true || data.uyumDurumu === 'aktif');
          setUyumBaslangicTarihi(data.uyumBaslangicTarihi || bugunKey());
          setUyumDurumu(data.uyumDurumu || (data.uyumTakibiAktif ? 'aktif' : 'pasif'));
        }
      }
      setFetching(false);
    };
    yukle();
  }, [childId, kullanici?.kresId]);

  const veliToggle = (id) => {
    setSeciliVeliIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!ad.trim() || !dogumTarihi.trim() || !sinifId) {
      Alert.alert('Hata', 'Ad, doğum tarihi ve sınıf zorunludur');
      return;
    }

    const normalizedBirthDate = normalizeChildBirthDate(dogumTarihi);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)) {
      Alert.alert('Hata', 'Doğum tarihini 15.05.2022 veya 2022-05-15 formatında gir.');
      return;
    }

    if (yeniBaslayan && !/^\d{4}-\d{2}-\d{2}$/.test(uyumBaslangicTarihi)) {
      Alert.alert('Hata', 'Uyum başlangıç tarihini 2026-06-26 formatında gir.');
      return;
    }

    // Yeni çocuk eklerken abonelik öğrenci limiti aşılıyorsa engelle.
    // Düzenleme (childId var) bu kontrolden muaf — mevcut kaydı güncellemek limiti artırmıyor.
    if (!childId && ogrenciLimiti != null && mevcutOgrenciSayisi >= ogrenciLimiti) {
      Alert.alert(
        'Öğrenci Limiti Doldu',
        `Aboneliğinizin öğrenci limiti ${ogrenciLimiti}. Şu an ${mevcutOgrenciSayisi} öğrenci kayıtlı — yeni öğrenci eklemek için abonelik / paket yükseltme talebi göndermeniz gerekiyor.`
      );
      return;
    }

    setLoading(true);
    try {
      const id = childId || generateId();
      const existingSnap = childId ? await get(ref(database, `cocuklar/${childId}`)) : null;
      const existing = existingSnap?.exists?.() ? existingSnap.val() : {};
      const uyumAktif = yeniBaslayan && uyumDurumu !== 'tamamlandi';
      const kresId = kullanici?.kresId || existing?.kresId || 'default-kres';

      const childPayload = {
        ...existing,
        ad: ad.trim(),
        dogumTarihi: normalizedBirthDate,
        sinifId,
        kresId,
        adres: adres.trim(),
        adresKonum: adres.trim() !== (existing?.adres || '') ? null : (existing?.adresKonum || null),
        veliIds: seciliVeliIds,
        yeniBaslayan,
        uyumTakibiAktif: uyumAktif,
        uyumBaslangicTarihi: yeniBaslayan ? uyumBaslangicTarihi : (existing?.uyumBaslangicTarihi || ''),
        uyumSureGun: 30,
        uyumDurumu: yeniBaslayan ? (uyumDurumu === 'tamamlandi' ? 'tamamlandi' : 'aktif') : 'pasif',
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      const updates = {
        [`cocuklar/${id}`]: childPayload,
        [`kresCocuklari/${kresId}/${id}`]: true,
        [`sinifCocuklari/${sinifId}/${id}`]: true,
      };

      if (existing?.kresId && existing.kresId !== kresId) updates[`kresCocuklari/${existing.kresId}/${id}`] = null;
      if (existing?.sinifId && existing.sinifId !== sinifId) updates[`sinifCocuklari/${existing.sinifId}/${id}`] = null;

      const oldParents = [...asArray(existing?.veliIds), existing?.veliId, existing?.parentId].filter(Boolean);
      oldParents.forEach((veliId) => {
        if (!seciliVeliIds.includes(veliId)) updates[`veliCocuklari/${veliId}/${id}`] = null;
      });
      seciliVeliIds.forEach((veliId) => {
        if (veliId) updates[`veliCocuklari/${veliId}/${id}`] = true;
      });

      await update(ref(database), updates);

      setSuccessToast(true);
      setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      Alert.alert('Hata', 'Çocuk kaydedilemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#712B13" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <AppSuccessToast visible={successToast} message={childId ? 'Çocuk bilgileri güncellendi' : 'Çocuk kaydedildi'} onHide={() => setSuccessToast(false)} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {!childId && ogrenciLimiti != null && mevcutOgrenciSayisi >= ogrenciLimiti ? (
            <View style={styles.limitWarning}>
              <Text style={styles.limitWarningText}>
                ⚠️ Öğrenci limitiniz doldu ({mevcutOgrenciSayisi}/{ogrenciLimiti}). Yeni öğrenci eklemeden önce abonelik / paket yükseltme talebi göndermeniz gerekiyor.
              </Text>
            </View>
          ) : null}
          <View style={styles.field}>
            <Text style={styles.label}>Çocuk Adı *</Text>
            <TextInput style={styles.input} value={ad} onChangeText={setAd} placeholder="Örn: Ali Yılmaz" placeholderTextColor="#999" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Doğum Tarihi *</Text>
            <TextInput style={styles.input} value={dogumTarihi} onChangeText={setDogumTarihi} placeholder="15.05.2022" placeholderTextColor="#999" />
            <Text style={styles.hint}>Kaydedilince sistem 2022-05-15 olarak saklar, ekranlarda 15.05.2022 gösterir.</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Sınıf *</Text>
            {siniflar.length === 0 ? <Text style={styles.bilgi}>Önce sınıf oluşturun</Text> : siniflar.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.seciBtn, sinifId === s.id && styles.seciBtnAktif]} onPress={() => setSinifId(s.id)}>
                <Text style={[styles.seciBtnYazi, sinifId === s.id && styles.seciBtnYaziAktif]}>{s.ad} — {s.yasGrubu}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.uyumCard}>
            <Text style={styles.uyumTitle}>🌱 Uyum Modülü</Text>
            <Text style={styles.uyumDesc}>Bu çocuk kreşe yeni başlayan öğrenci mi? Seçilirse 30 günlük uyum takibi öğretmen ve veli tarafında açılır.</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity style={[styles.segment, !yeniBaslayan && styles.segmentActive]} onPress={() => { setYeniBaslayan(false); setUyumDurumu('pasif'); }}><Text style={[styles.segmentText, !yeniBaslayan && styles.segmentTextActive]}>Mevcut öğrenci</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segment, yeniBaslayan && styles.segmentActiveGreen]} onPress={() => { setYeniBaslayan(true); setUyumDurumu('aktif'); }}><Text style={[styles.segmentText, yeniBaslayan && styles.segmentTextActive]}>Yeni başlayan</Text></TouchableOpacity>
            </View>
            {yeniBaslayan ? (
              <View style={styles.uyumOpenBox}>
                <Text style={styles.label}>Uyum başlangıç tarihi</Text>
                <TextInput style={styles.input} value={uyumBaslangicTarihi} onChangeText={setUyumBaslangicTarihi} placeholder="2026-06-26" placeholderTextColor="#999" />
                <Text style={styles.hint}>30 gün sonunda aktif takip kapanır, kayıtlar veli geçmişinde kalır.</Text>
                {childId ? <View style={styles.segmentRowSmall}><TouchableOpacity style={[styles.statusBtn, uyumDurumu !== 'tamamlandi' && styles.statusBtnOn]} onPress={() => setUyumDurumu('aktif')}><Text style={[styles.statusText, uyumDurumu !== 'tamamlandi' && styles.statusTextOn]}>Aktif</Text></TouchableOpacity><TouchableOpacity style={[styles.statusBtn, uyumDurumu === 'tamamlandi' && styles.statusBtnDone]} onPress={() => setUyumDurumu('tamamlandi')}><Text style={[styles.statusText, uyumDurumu === 'tamamlandi' && styles.statusTextOn]}>Tamamlandı</Text></TouchableOpacity></View> : null}
              </View>
            ) : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Servis / Ev Adresi</Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              value={adres}
              onChangeText={setAdres}
              placeholder="Örn: Muğla Mah. Deniz Sok. No:5 Bodrum"
              placeholderTextColor="#999"
              multiline
            />
            <Text style={styles.hint}>Servis kullanıyorsa buraya girilen adres, servisçinin rota ekranında konum/yol tarifi için kullanılır.</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Veli Bağla (opsiyonel)</Text>
            {veliler.length === 0 ? <Text style={styles.bilgi}>Henüz veli yok</Text> : veliler.map((v) => (
              <TouchableOpacity key={v.id} style={[styles.seciBtn, seciliVeliIds.includes(v.id) && styles.seciBtnAktif]} onPress={() => veliToggle(v.id)}>
                <Text style={[styles.seciBtnYazi, seciliVeliIds.includes(v.id) && styles.seciBtnYaziAktif]}>{v.ad} ({v.kullaniciAdi})</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.saveButton, (loading || (!childId && ogrenciLimiti != null && mevcutOgrenciSayisi >= ogrenciLimiti)) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || (!childId && ogrenciLimiti != null && mevcutOgrenciSayisi >= ogrenciLimiti)}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{childId ? 'Güncelle' : 'Oluştur'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  hint: { color: '#777', fontSize: 12, marginTop: 6, lineHeight: 17 },
  bilgi: { color: '#999', fontStyle: 'italic' },
  limitWarning: { backgroundColor: '#FFE8EE', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFC2D1' },
  limitWarningText: { color: '#B3123A', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  seciBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff' },
  seciBtnAktif: { borderColor: '#712B13', backgroundColor: '#fdf0ee' },
  seciBtnYazi: { fontSize: 15, color: '#333' },
  seciBtnYaziAktif: { fontWeight: '700', color: '#712B13' },
  uyumCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#DDEFE3', marginBottom: 20 },
  uyumTitle: { color: '#12301E', fontSize: 18, fontWeight: '900' },
  uyumDesc: { color: '#667A70', fontWeight: '700', lineHeight: 18, marginTop: 6 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#F1F4F2', padding: 4, borderRadius: 14, marginTop: 12 },
  segment: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  segmentActive: { backgroundColor: '#712B13' },
  segmentActiveGreen: { backgroundColor: '#20B45B' },
  segmentText: { color: '#555', fontWeight: '900', fontSize: 12 },
  segmentTextActive: { color: '#fff' },
  uyumOpenBox: { backgroundColor: '#F4FBF5', borderRadius: 14, padding: 12, marginTop: 12 },
  segmentRowSmall: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  statusBtnOn: { backgroundColor: '#20B45B', borderColor: '#20B45B' },
  statusBtnDone: { backgroundColor: '#6C3DEB', borderColor: '#6C3DEB' },
  statusText: { color: '#555', fontWeight: '900' },
  statusTextOn: { color: '#fff' },
  saveButton: { backgroundColor: '#712B13', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
