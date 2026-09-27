// ============================================================
// YUMURCAK — ChildFormScreen.js
// FAZ 19: Sınıf/veli listesi artık index üzerinden, sadece kendi kreşinden çekilir
// ============================================================
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          setYeniBaslayan(data.yeniBaslayan === true || data.uyumTakibi{t('admin.childForm.active')} === true || data.uyumDurumu === 'aktif');
          setUyumBaslangicTarihi(data.uyumBaslangicTarihi || bugunKey());
          setUyumDurumu(data.uyumDurumu || (data.uyumTakibi{t('admin.childForm.active')} ? 'aktif' : 'pasif'));
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
      Alert.alert('Hata', t('admin.childForm.required'));
      return;
    }

    const normalizedBirthDate = normalizeChildBirthDate(dogumTarihi);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)) {
      Alert.alert('Hata', t('admin.childForm.birthFormat'));
      return;
    }

    if (yeniBaslayan && !/^\d{4}-\d{2}-\d{2}$/.test(uyumBaslangicTarihi)) {
      Alert.alert('Hata', t('admin.childForm.adaptationDateFormat'));
      return;
    }

    setLoading(true);
    try {
      const id = childId || generateId();
      const existingSnap = childId ? await get(ref(database, `cocuklar/${childId}`)) : null;
      const existing = existingSnap?.exists?.() ? existingSnap.val() : {};
      const uyum{t('admin.childForm.active')} = yeniBaslayan && uyumDurumu !== 'tamamlandi';
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
        uyumTakibi: 'aktif', uyum: 'aktif',
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
      Alert.alert('Hata', t('admin.childForm.saveFailed'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Çocuk kaydının Firebase Auth hesabı YOK (cocuklar/{id} sadece bir DB
  // kaydı), o yüzden Cloud Function'a gerek yok — yönetici zaten
  // database.rules.json'da cocuklar/$cocukId üzerinde doğrudan yazma
  // yetkisine sahip. Silerken kres/sınıf/veli index'lerini de temizliyoruz.
  const handleDelete = () => {
    if (!childId) return;
    Alert.alert(
      t('admin.childForm.delete'),
      `${ad || 'Bu çocuk'} kalıcı olarak silinecek. Bu işlem geri alınamaz: tüm rapor, yoklama ve galeri bağlantıları koparılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const existingSnap = await get(ref(database, `cocuklar/${childId}`));
              const existing = existingSnap.exists() ? existingSnap.val() : {};
              const kresId = existing?.kresId || kullanici?.kresId || '';
              const sinifIdEski = existing?.sinifId || '';
              const veliIdler = [...asArray(existing?.veliIds), existing?.veliId, existing?.parentId].filter(Boolean);

              const updates = { [`cocuklar/${childId}`]: null };
              if (kresId) updates[`kresCocuklari/${kresId}/${childId}`] = null;
              if (sinifIdEski) updates[`sinifCocuklari/${sinifIdEski}/${childId}`] = null;
              veliIdler.forEach((veliId) => { updates[`veliCocuklari/${veliId}/${childId}`] = null; });

              await update(ref(database), updates);
              navigation.goBack();
            } catch (error) {
              console.error(error);
              Alert.alert('Hata', `Çocuk silinemedi.\n\n${error?.message || ''}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
          <View style={styles.field}>
            <Text style={styles.label}>{t('admin.childForm.nameLabel')}</Text>
            <TextInput style={styles.input} value={ad} onChangeText={setAd} placeholder={t('admin.childForm.namePlaceholder')} placeholderTextColor="#999" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admin.childForm.birthLabel')}</Text>
            <TextInput style={styles.input} value={dogumTarihi} onChangeText={setDogumTarihi} placeholder="15.05.2022" placeholderTextColor="#999" />
            <Text style={styles.hint}>{t('admin.childForm.birthHint')}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admin.childForm.classLabel')}</Text>
            {siniflar.length === 0 ? <Text style={styles.bilgi}>{t('admin.childForm.createClassFirst')}</Text> : siniflar.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.seciBtn, sinifId === s.id && styles.seciBtn{t('admin.childForm.active')}]} onPress={() => setSinifId(s.id)}>
                <Text style={[styles.seciBtnYazi, sinifId === s.id && styles.seciBtnYazi{t('admin.childForm.active')}]}>{s.ad} — {s.yasGrubu}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.uyumCard}>
            <Text style={styles.uyumTitle}>{t('admin.childForm.adaptationTitle')}</Text>
            <Text style={styles.uyumDesc}>{t('admin.childForm.adaptationDesc')}</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity style={[styles.segment, !yeniBaslayan && styles.segmentActive]} onPress={() => { setYeniBaslayan(false); setUyumDurumu('pasif'); }}><Text style={[styles.segmentText, !yeniBaslayan && styles.segmentTextActive]}>{t('admin.childForm.existing')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segment, yeniBaslayan && styles.segmentActiveGreen]} onPress={() => { setYeniBaslayan(true); setUyumDurumu('aktif'); }}><Text style={[styles.segmentText, yeniBaslayan && styles.segmentTextActive]}>{t('admin.childForm.newStudent')}</Text></TouchableOpacity>
            </View>
            {yeniBaslayan ? (
              <View style={styles.uyumOpenBox}>
                <Text style={styles.label}>{t('admin.childForm.adaptationStart')}</Text>
                <TextInput style={styles.input} value={uyumBaslangicTarihi} onChangeText={setUyumBaslangicTarihi} placeholder="2026-06-26" placeholderTextColor="#999" />
                <Text style={styles.hint}>{t('admin.childForm.adaptationHint')}</Text>
                {childId ? <View style={styles.segmentRowSmall}><TouchableOpacity style={[styles.statusBtn, uyumDurumu !== 'tamamlandi' && styles.statusBtnOn]} onPress={() => setUyumDurumu('aktif')}><Text style={[styles.statusText, uyumDurumu !== 'tamamlandi' && styles.statusTextOn]}>{t('admin.childForm.active')}</Text></TouchableOpacity><TouchableOpacity style={[styles.statusBtn, uyumDurumu === 'tamamlandi' && styles.statusBtnDone]} onPress={() => setUyumDurumu('tamamlandi')}><Text style={[styles.statusText, uyumDurumu === 'tamamlandi' && styles.statusTextOn]}>{t('admin.childForm.completed')}</Text></TouchableOpacity></View> : null}
              </View>
            ) : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admin.childForm.serviceAddress')}</Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              value={adres}
              onChangeText={setAdres}
              placeholder="Örn: Muğla Mah. Deniz Sok. No:5 Bodrum"
              placeholderTextColor="#999"
              multiline
            />
            <Text style={styles.hint}>{t('admin.childForm.serviceHint')}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admin.childForm.parentLabel')}</Text>
            {veliler.length === 0 ? <Text style={styles.bilgi}>{t('admin.childForm.noParents')}</Text> : veliler.map((v) => (
              <TouchableOpacity key={v.id} style={[styles.seciBtn, seciliVeliIds.includes(v.id) && styles.seciBtn{t('admin.childForm.active')}]} onPress={() => veliToggle(v.id)}>
                <Text style={[styles.seciBtnYazi, seciliVeliIds.includes(v.id) && styles.seciBtnYazi{t('admin.childForm.active')}]}>{v.ad} ({v.kullaniciAdi})</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{childId ? t('admin.childForm.update') : t('admin.childForm.create')}</Text>}
          </TouchableOpacity>
          {childId && (
            <TouchableOpacity style={[styles.deleteButton, loading && styles.saveButtonDisabled]} onPress={handleDelete} disabled={loading}>
              <Text style={styles.deleteButtonText}>{t('admin.childForm.delete')}</Text>
            </TouchableOpacity>
          )}
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
  seciBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff' },
  seciBtn{t('admin.childForm.active')}: { borderColor: '#712B13', backgroundColor: '#fdf0ee' },
  seciBtnYazi: { fontSize: 15, color: '#333' },
  seciBtnYazi{t('admin.childForm.active')}: { fontWeight: '700', color: '#712B13' },
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
  deleteButton: { backgroundColor: '#FFE8EC', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FFC7D1' },
  deleteButtonText: { color: '#D6394F', fontSize: 16, fontWeight: '700' },
});
