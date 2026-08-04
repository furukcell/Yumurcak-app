// ============================================================
// YUMURCAK — AdminGeziFormEditScreen.js
// FAZ 8: "Gezi Formu" — tek bir gezi kaydını oluşturur/düzenler, ve
// (kayıtlıysa) Yazdır/Paylaş/Sil imkanı sunar. Ay/gün-bazlı kavram yok —
// bu yüzden documentPdf.js'teki buildGeziFormuHtml doğrudan çağrılıyor.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ref, push, update, get, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useRoute } from '@react-navigation/native';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import { normalizeChildBirthDate } from '../../utils/childDates';
import {
  fetchInstitutionInfo,
  buildGeziFormuHtml,
  printMonthlyDocument,
  shareMonthlyDocumentPdf,
} from '../../services/documentPdf';

const NODE_PATH = 'geziFormlari';

export default function AdminGeziFormEditScreen({ navigation }) {
  const route = useRoute();
  const formId = route.params?.formId || null;

  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const [baslik, setBaslik] = useState('');
  const [hedefYer, setHedefYer] = useState('');
  const [tarih, setTarih] = useState('');
  const [gidisSaati, setGidisSaati] = useState('');
  const [donusSaati, setDonusSaati] = useState('');
  const [sinifId, setSinifId] = useState('');
  const [sorumluPersonel, setSorumluPersonel] = useState('');
  const [izinGerekliMi, setIzinGerekliMi] = useState(true);
  const [aciklama, setAciklama] = useState('');

  const [siniflar, setSiniflar] = useState([]);
  const [loading, setLoading] = useState(!!formId);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!kresId) return undefined;
    const sinifQuery = query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(
      sinifQuery,
      (snap) => {
        const data = snap.val() || {};
        const list = Object.entries(data).map(([id, value]) => ({ id, ad: value?.ad || '' }));
        setSiniflar(list);
      },
      () => setSiniflar([])
    );
    return () => unsub();
  }, [kresId]);

  useEffect(() => {
    if (!formId) return undefined;
    let cancelled = false;
    get(ref(database, `${NODE_PATH}/${formId}`)).then((snap) => {
      if (cancelled || !snap.exists()) {
        setLoading(false);
        return;
      }
      const data = snap.val();
      setBaslik(data.baslik || '');
      setHedefYer(data.hedefYer || '');
      setTarih(data.tarih ? formatIsoToTr(data.tarih) : '');
      setGidisSaati(data.gidisSaati || '');
      setDonusSaati(data.donusSaati || '');
      setSinifId(data.sinifId || '');
      setSorumluPersonel(data.sorumluPersonel || '');
      setIzinGerekliMi(data.izinGerekliMi !== false);
      setAciklama(data.aciklama || '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [formId]);

  function formatIsoToTr(iso) {
    const parts = String(iso || '').split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  async function handleSave() {
    if (!kresId) {
      Alert.alert('Hata', 'Kurum bilgisi bulunamadı.');
      return;
    }
    if (!baslik.trim() || !hedefYer.trim() || !tarih.trim()) {
      Alert.alert('Eksik Bilgi', 'Gezi adı, gidilecek yer ve tarih zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const sinifAd = siniflar.find((s) => s.id === sinifId)?.ad || '';
      const payload = {
        kresId,
        baslik: baslik.trim(),
        hedefYer: hedefYer.trim(),
        tarih: normalizeChildBirthDate(tarih),
        gidisSaati: gidisSaati.trim(),
        donusSaati: donusSaati.trim(),
        sinifId: sinifId || null,
        sinifAd,
        sorumluPersonel: sorumluPersonel.trim(),
        izinGerekliMi,
        aciklama: aciklama.trim(),
        aktif: true,
        updatedAt: now,
      };

      if (formId) {
        await update(ref(database, `${NODE_PATH}/${formId}`), payload);
      } else {
        const newRef = push(ref(database, NODE_PATH));
        await update(newRef, { ...payload, createdAt: now, olusturanId: kullanici?.uid || kullanici?.id || null });
      }

      setSuccessToast(true);
      setTimeout(() => navigation.goBack(), 700);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Gezi formu kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Sil', 'Bu gezi formu silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: doDelete },
    ]);
  }

  async function doDelete() {
    try {
      await update(ref(database, `${NODE_PATH}/${formId}`), { aktif: false, updatedAt: Date.now() });
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Silinemedi.');
    }
  }

  async function handleExport(mode) {
    setExporting(true);
    try {
      const kres = await fetchInstitutionInfo(kresId);
      const sinifAd = siniflar.find((s) => s.id === sinifId)?.ad || '';
      const record = {
        baslik, hedefYer, tarih: normalizeChildBirthDate(tarih), gidisSaati, donusSaati,
        sinifAd, sorumluPersonel, izinGerekliMi, aciklama,
      };
      const html = buildGeziFormuHtml({ kres, record });
      if (mode === 'print') await printMonthlyDocument(html);
      else await shareMonthlyDocumentPdf(html, `Gezi Formu - ${baslik || 'Gezi'}`);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Form oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <ThemedBackground>
        <SafeAreaView style={styles.safeArea}>
          <Text style={{ padding: 20 }}>Yükleniyor...</Text>
        </SafeAreaView>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast visible={successToast} message="Gezi formu kaydedildi" onHide={() => setSuccessToast(false)} />

        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{formId ? 'Gezi Formunu Düzenle' : 'Yeni Gezi Formu'}</Text>
          </View>

          <TextInput value={baslik} onChangeText={setBaslik} placeholder="Gezi Adı *" placeholderTextColor={theme.muted} style={styles.input} />
          <TextInput value={hedefYer} onChangeText={setHedefYer} placeholder="Gidilecek Yer *" placeholderTextColor={theme.muted} style={styles.input} />
          <TextInput value={tarih} onChangeText={setTarih} placeholder="Tarih * (örn: 15.09.2026)" placeholderTextColor={theme.muted} style={styles.input} />

          <View style={styles.row}>
            <TextInput value={gidisSaati} onChangeText={setGidisSaati} placeholder="Gidiş Saati" placeholderTextColor={theme.muted} style={[styles.input, styles.rowFlex]} />
            <TextInput value={donusSaati} onChangeText={setDonusSaati} placeholder="Dönüş Saati" placeholderTextColor={theme.muted} style={[styles.input, styles.rowFlex]} />
          </View>

          <Text style={styles.fieldLabel}>Sınıf</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 12 }}>
            <TouchableOpacity style={[styles.chip, !sinifId && styles.chipActive]} onPress={() => setSinifId('')} activeOpacity={0.85}>
              <Text style={[styles.chipText, !sinifId && styles.chipTextActive]}>Tüm Kurum</Text>
            </TouchableOpacity>
            {siniflar.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.chip, sinifId === s.id && styles.chipActive]} onPress={() => setSinifId(s.id)} activeOpacity={0.85}>
                <Text style={[styles.chipText, sinifId === s.id && styles.chipTextActive]}>{s.ad}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput value={sorumluPersonel} onChangeText={setSorumluPersonel} placeholder="Sorumlu Personel" placeholderTextColor={theme.muted} style={styles.input} />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Veli İzni Gerekli</Text>
            <Switch value={izinGerekliMi} onValueChange={setIzinGerekliMi} trackColor={{ true: theme.primary }} />
          </View>

          <TextInput
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Açıklama (opsiyonel)"
            placeholderTextColor={theme.muted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <TouchableOpacity disabled={saving} style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>

          {formId ? (
            <>
              <View style={styles.exportRow}>
                <TouchableOpacity disabled={exporting} style={[styles.exportButton, styles.exportFlex]} onPress={() => handleExport('print')} activeOpacity={0.85}>
                  <Text style={styles.exportButtonText}>{exporting ? '...' : '🖨️ Yazdır'}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={exporting} style={[styles.exportButton, styles.exportFlex]} onPress={() => handleExport('share')} activeOpacity={0.85}>
                  <Text style={styles.exportButtonText}>{exporting ? '...' : '📤 Paylaş/İndir'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} activeOpacity={0.85}>
                <Text style={styles.deleteButtonText}>Formu Sil</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    screen: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: theme.border },
    backText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    title: { color: theme.primary, fontSize: 20, fontWeight: '900', flex: 1 },
    input: { minHeight: 46, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, color: theme.text, fontWeight: '700', marginBottom: 12 },
    textArea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
    row: { flexDirection: 'row', gap: 10 },
    rowFlex: { flex: 1 },
    fieldLabel: { fontSize: 12, fontWeight: '900', color: theme.muted, marginBottom: 8, textTransform: 'uppercase' },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontWeight: '800', fontSize: 13, color: theme.text },
    chipTextActive: { color: '#fff' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
    switchLabel: { fontWeight: '800', color: theme.text, fontSize: 14 },
    saveButton: { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 14 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    exportRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    exportButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    exportFlex: { flex: 1 },
    exportButtonText: { color: theme.primary, fontWeight: '900', fontSize: 14 },
    deleteButton: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,77,109,0.12)' },
    deleteButtonText: { color: '#FF4D6D', fontWeight: '900' },
  });
}
