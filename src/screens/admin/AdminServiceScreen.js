// ============================================================
// YUMURCAK — AdminServiceScreen.js
// FAZ 8: "Servis Listesi" — `servisBilgileri/{childId}` node'u zaten
// vardı (ParentServiceScreen.js sadece okuyordu) ama admin tarafında
// GİRİŞ ekranı yoktu. Bu ekran hem o eksiği kapatıyor (her çocuk için
// servis kullanıyor mu / saatleri / notu düzenlenebiliyor) hem de servis
// kullanan tüm çocukların tek sayfalık, sürücü için yazdırılabilir
// listesini üretiyor (documentPdf.js -> buildServiceListHtml).
//
// Ay/gün kavramı YOK — bu yüzden MonthlyDocumentPdfBar KULLANILMIYOR,
// doğrudan printMonthlyDocument/shareMonthlyDocumentPdf çağrılıyor.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, onValue, get, update, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import {
  fetchInstitutionInfo,
  buildServiceListHtml,
  printMonthlyDocument,
  shareMonthlyDocumentPdf,
} from '../../services/documentPdf';

function asArray(value) {
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

export default function AdminServiceScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [sinifMap, setSinifMap] = useState({});
  const [serviceMap, setServiceMap] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );

  // Çocuklar + sınıf adları
  useEffect(() => {
    if (!kresId) {
      setLoading(false);
      return undefined;
    }

    const unsub = onValue(ref(database, `kresCocuklari/${kresId}`), async (snap) => {
      const idsData = snap.val();
      if (!idsData) {
        setChildren([]);
        setLoading(false);
        return;
      }
      try {
        const ids = Object.keys(idsData);
        const results = await Promise.all(
          ids.map((id) => get(ref(database, `cocuklar/${id}`)).then((s) => (s.exists() ? { id, ...s.val() } : null)))
        );
        setChildren(results.filter(Boolean));
      } finally {
        setLoading(false);
      }
    }, () => setLoading(false));

    const sinifQuery = query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId));
    const sinifUnsub = onValue(
      sinifQuery,
      (snap) => {
        const data = snap.val() || {};
        const map = {};
        Object.entries(data).forEach(([id, value]) => {
          map[id] = value?.ad || '';
        });
        setSinifMap(map);
      },
      () => setSinifMap({})
    );

    // NOT: servisBilgileri top-level ".read" kuralı kresId filtresi
    // istemiyor (bkz. database.rules.json) — tüm node okunup burada
    // client tarafında bu kreşin çocuklarına göre filtreleniyor.
    const serviceUnsub = onValue(ref(database, 'servisBilgileri'), (snap) => {
      setServiceMap(snap.val() || {});
    });

    const vehiclesQuery = query(ref(database, 'servisler'), orderByChild('kresId'), equalTo(kresId));
    const vehiclesUnsub = onValue(
      vehiclesQuery,
      (snap) => {
        const data = snap.val() || {};
        const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        list.sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
        setVehicles(list);
      },
      () => setVehicles([])
    );

    return () => { unsub(); sinifUnsub(); serviceUnsub(); vehiclesUnsub(); };
  }, [kresId]);

  useEffect(() => {
    const next = {};
    children.forEach((child) => {
      const info = serviceMap[child.id] || {};
      next[child.id] = {
        servisKullaniyor: info.servisKullaniyor || false,
        servisId: info.servisId || '',
        alisSaati: info.alisSaati || '',
        birakisSaati: info.birakisSaati || '',
        servisNotu: info.servisNotu || '',
      };
    });
    setDrafts((prev) => ({ ...next, ...Object.fromEntries(Object.entries(prev).filter(([id]) => next[id])) }));
  }, [children, serviceMap]);

  function updateDraft(childId, field, value) {
    setDrafts((prev) => ({ ...prev, [childId]: { ...(prev[childId] || {}), [field]: value } }));
  }

  async function saveChild(childId) {
    const draft = drafts[childId];
    if (!draft) return;
    setSavingId(childId);
    try {
      await update(ref(database, `servisBilgileri/${childId}`), {
        kresId,
        servisKullaniyor: !!draft.servisKullaniyor,
        servisId: draft.servisId || '',
        alisSaati: draft.alisSaati.trim(),
        birakisSaati: draft.birakisSaati.trim(),
        servisNotu: draft.servisNotu.trim(),
        updatedAt: Date.now(),
      });
      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Servis bilgisi kaydedilemedi.');
    } finally {
      setSavingId(null);
    }
  }

  const serviceChildren = useMemo(
    () => children.filter((child) => drafts[child.id]?.servisKullaniyor),
    [children, drafts]
  );

  async function handleExport(mode) {
    if (serviceChildren.length === 0) {
      Alert.alert('Liste Boş', 'Servis kullanan çocuk kaydı yok.');
      return;
    }
    setExporting(true);
    try {
      const kres = await fetchInstitutionInfo(kresId);
      const records = serviceChildren.map((child) => {
        const vehicle = vehicleMap[drafts[child.id]?.servisId];
        return {
          ad: `${child.ad || ''} ${child.soyad || ''}`.trim(),
          sinifAd: sinifMap[child.sinifId] || '',
          servisAd: vehicle ? (vehicle.ad || vehicle.plaka || '') : '',
          alisSaati: drafts[child.id]?.alisSaati || '',
          birakisSaati: drafts[child.id]?.birakisSaati || '',
          servisNotu: drafts[child.id]?.servisNotu || '',
        };
      });
      const html = buildServiceListHtml({ kres, records });
      if (mode === 'print') await printMonthlyDocument(html);
      else await shareMonthlyDocumentPdf(html, 'Servis Listesi');
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Servis listesi oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast visible={successToast} message="Servis bilgisi güncellendi" onHide={() => setSuccessToast(false)} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
         >
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Servis Listesi</Text>
              <Text style={styles.subtitle}>{serviceChildren.length} çocuk servis kullanıyor</Text>
            </View>
          </View>

          <View style={styles.exportRow}>
            <TouchableOpacity disabled={exporting} style={[styles.exportButton, styles.exportFlex]} onPress={() => handleExport('print')} activeOpacity={0.85}>
              <Text style={styles.exportButtonText}>{exporting ? '...' : '🖨️ Yazdır'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={exporting} style={[styles.exportButton, styles.exportFlex]} onPress={() => handleExport('share')} activeOpacity={0.85}>
              <Text style={styles.exportButtonText}>{exporting ? '...' : '📤 Paylaş/İndir'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
          ) : children.length === 0 ? (
            <Text style={styles.emptyText}>Kayıtlı çocuk yok.</Text>
          ) : (
            children.map((child) => {
              const draft = drafts[child.id] || { servisKullaniyor: false, servisId: '', alisSaati: '', birakisSaati: '', servisNotu: '' };
              return (
                <View key={child.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{child.ad} {child.soyad}</Text>
                      <Text style={styles.childClass}>{sinifMap[child.sinifId] || 'Sınıf yok'}</Text>
                    </View>
                    <Switch
                      value={!!draft.servisKullaniyor}
                      onValueChange={(value) => updateDraft(child.id, 'servisKullaniyor', value)}
                      trackColor={{ true: theme.primary }}
                    />
                  </View>

                  {draft.servisKullaniyor ? (
                    <>
                      {vehicles.length === 0 ? (
                        <TouchableOpacity
                          style={styles.noVehicleBox}
                          onPress={() => navigation.navigate('AdminVehicleList')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.noVehicleText}>⚠️ Henüz servis aracı eklenmedi. Araç eklemek için dokun.</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.vehicleChipRow}>
                          {vehicles.map((vehicle) => {
                            const active = draft.servisId === vehicle.id;
                            return (
                              <TouchableOpacity
                                key={vehicle.id}
                                style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                                onPress={() => updateDraft(child.id, 'servisId', active ? '' : vehicle.id)}
                                activeOpacity={0.85}
                              >
                                <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>
                                  {vehicle.ad || vehicle.plaka}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                      <View style={styles.inputRow}>
                        <TextInput
                          value={draft.alisSaati}
                          onChangeText={(text) => updateDraft(child.id, 'alisSaati', text)}
                          placeholder="Alış saati (örn: 08:00)"
                          placeholderTextColor={theme.muted}
                          style={[styles.input, styles.inputFlex]}
                        />
                        <TextInput
                          value={draft.birakisSaati}
                          onChangeText={(text) => updateDraft(child.id, 'birakisSaati', text)}
                          placeholder="Bırakış saati (örn: 16:30)"
                          placeholderTextColor={theme.muted}
                          style={[styles.input, styles.inputFlex]}
                        />
                      </View>
                      <TextInput
                        value={draft.servisNotu}
                        onChangeText={(text) => updateDraft(child.id, 'servisNotu', text)}
                        placeholder="Not (örn: Servis plakası, sürücü adı)"
                        placeholderTextColor={theme.muted}
                        style={styles.input}
                      />
                    </>
                  ) : null}

                  <TouchableOpacity
                    disabled={savingId === child.id}
                    style={[styles.saveRowButton, savingId === child.id && { opacity: 0.6 }]}
                    onPress={() => saveChild(child.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveRowButtonText}>{savingId === child.id ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
    headerTextWrap: { flex: 1, minWidth: 0 },
    title: { color: theme.primary, fontSize: 24, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 3 },
    exportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    exportButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    exportFlex: { flex: 1 },
    exportButtonText: { color: theme.primary, fontWeight: '900', fontSize: 14 },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 30, fontWeight: '700' },
    card: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    childName: { fontSize: 15, fontWeight: '900', color: theme.text },
    childClass: { fontSize: 12, fontWeight: '700', color: theme.muted, marginTop: 2 },
    noVehicleBox: { backgroundColor: theme.primarySoft, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 10, marginBottom: 8 },
    noVehicleText: { color: theme.primary, fontWeight: '700', fontSize: 12 },
    vehicleChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    vehicleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg },
    vehicleChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    vehicleChipText: { color: theme.text, fontWeight: '700', fontSize: 12 },
    vehicleChipTextActive: { color: '#fff' },
    inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    inputFlex: { flex: 1 },
    input: { minHeight: 42, backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: theme.text, fontWeight: '700', marginBottom: 8 },
    saveRowButton: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: theme.primary },
    saveRowButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  });
}
