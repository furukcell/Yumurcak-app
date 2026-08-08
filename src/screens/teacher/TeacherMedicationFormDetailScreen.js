// ============================================================
// YUMURCAK — TeacherMedicationFormDetailScreen.js
// FAZ 8: "İlaç Takip Formu" detay + günlük uygulama log ekranı. Öğretmen
// "Bugün Verildi" ile o günün dozunu işaretliyor; geçmiş kayıtlar altta
// listeleniyor. Yazdır/Paylaş, veli onayı + personel imzası için fiziksel
// çıktı üretir (documentPdf.js -> buildIlacTakipHtml).
// ============================================================
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, onValue, update } from 'firebase/database';
import { useRoute } from '@react-navigation/native';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import { createNotification } from '../../services/notificationCenter';
import {
  fetchInstitutionInfo,
  buildIlacTakipHtml,
  printMonthlyDocument,
  shareMonthlyDocumentPdf,
} from '../../services/documentPdf';

function getChildParentIds(child) {
  const raw = [...(Array.isArray(child?.veliIds) ? child.veliIds : []), child?.veliId, child?.parentId];
  return [...new Set(raw.filter(Boolean))];
}

const NODE_PATH = 'ilacTakipFormlari';

function formatDateTr(dateKey) {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return dateKey || '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TeacherMedicationFormDetailScreen({ navigation }) {
  const route = useRoute();
  const formId = route.params?.formId;
  const { kullanici, teacherId, kresId, classChildren } = useTeacherData();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!formId) {
      setLoading(false);
      return undefined;
    }
    const r = ref(database, `${NODE_PATH}/${formId}`);
    const unsub = onValue(r, (snap) => {
      setRecord(snap.exists() ? { id: formId, ...snap.val() } : null);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [formId]);

  const today = todayString();
  const todayLogged = !!record?.kayitlar?.[today]?.verildi;

  async function handleLogToday() {
    setLogging(true);
    try {
      const teacherName = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Öğretmen';
      await update(ref(database, `${NODE_PATH}/${formId}/kayitlar/${today}`), {
        verildi: true,
        saat: nowTimeStr(),
        verenAdi: teacherName,
        verenId: teacherId || kullanici?.uid || null,
        not: note.trim(),
      });
      await update(ref(database, `${NODE_PATH}/${formId}`), { updatedAt: Date.now() });
      setNote('');
      setSuccessToast(true);

      const child = (classChildren || []).find((c) => c.id === record?.cocukId);
      const parentIds = getChildParentIds(child);
      if (parentIds.length > 0) {
        createNotification({
          kresId,
          hedefUserIds: parentIds,
          hedefCocukIds: record?.cocukId ? [record.cocukId] : null,
          baslik: '💊 İlaç uygulandı',
          mesaj: `${record?.cocukAdi || 'Çocuğunuz'} için bugünkü "${record?.ilacAdi || 'ilaç'}" dozu verildi.`,
          tip: 'ilac_takip',
          routeName: 'ParentMedical',
          createdBy: teacherId || kullanici?.uid || '',
        }).catch((error) => console.log('İlaç bildirimi gönderilemedi:', error));
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Kayıt eklenemedi.');
    } finally {
      setLogging(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Sil', 'Bu ilaç takip formu silinsin mi?', [
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
      const html = buildIlacTakipHtml({ kres, record });
      if (mode === 'print') await printMonthlyDocument(html);
      else await shareMonthlyDocumentPdf(html, `Ilac Takip - ${record?.cocukAdi || ''}`);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Form oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <LoadingState text="Yükleniyor..." />;
  if (!record) return <LoadingState text="Form bulunamadı." />;

  const kayitlar = Object.entries(record.kayitlar || {}).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message="Bugünkü doz kaydedildi" onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title={record.ilacAdi} subtitle={record.cocukAdi} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <InfoRow label="Doz" value={record.doz} />
          <InfoRow label="Uygulama Şekli" value={record.uygulamaSekli} />
          <InfoRow label="Başlangıç" value={formatDateTr(record.baslangicTarihi)} />
          <InfoRow label="Bitiş" value={formatDateTr(record.bitisTarihi)} />
          <InfoRow label="Hatırlatma Saati" value={record.hatirlaticiSaat ? `⏰ ${record.hatirlaticiSaat}` : ''} />
          <InfoRow label="Veli Onayı" value={record.veliOnayi ? '✅ Alındı' : '⏳ Bekleniyor'} />
        </View>

        {todayLogged ? (
          <View style={styles.loggedCard}>
            <Text style={styles.loggedText}>✅ Bugün ({formatDateTr(today)}) doz verildi olarak işaretlendi.</Text>
          </View>
        ) : (
          <View style={styles.logCard}>
            <Text style={styles.logTitle}>Bugünün Dozu ({formatDateTr(today)})</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Not (opsiyonel)"
              placeholderTextColor={THEME.muted}
              style={styles.input}
            />
            <TouchableOpacity disabled={logging} style={[styles.logButton, logging && { opacity: 0.6 }]} onPress={handleLogToday} activeOpacity={0.85}>
              <Text style={styles.logButtonText}>{logging ? 'Kaydediliyor...' : '✅ Bugün Verildi'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.historyTitle}>Geçmiş Kayıtlar</Text>
        {kayitlar.length === 0 ? (
          <Text style={styles.emptyText}>Henüz kayıt yok.</Text>
        ) : (
          kayitlar.map(([tarih, kayit]) => (
            <View key={tarih} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDateTr(tarih)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyMain}>{kayit.verildi ? `✅ ${kayit.saat || ''}` : '—'} · {kayit.verenAdi || ''}</Text>
                {kayit.not ? <Text style={styles.historyNote}>{kayit.not}</Text> : null}
              </View>
            </View>
          ))
        )}

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
      </ScrollView>
     </KeyboardAvoidingView>
   </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 36 },
  infoCard: { backgroundColor: THEME.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontWeight: '800', color: THEME.muted, fontSize: 13 },
  infoValue: { fontWeight: '800', color: THEME.text, fontSize: 13 },
  loggedCard: { backgroundColor: '#E7FAD9', borderRadius: 16, padding: 14, marginBottom: 14 },
  loggedText: { color: '#2E7D32', fontWeight: '800', fontSize: 13 },
  logCard: { backgroundColor: THEME.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 14 },
  logTitle: { fontWeight: '900', color: THEME.text, fontSize: 14, marginBottom: 10 },
  input: { minHeight: 44, backgroundColor: THEME.bg, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, color: THEME.text, fontWeight: '700', marginBottom: 10 },
  logButton: { backgroundColor: THEME.green, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  logButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  historyTitle: { fontSize: 13, fontWeight: '900', color: THEME.muted, marginBottom: 8, textTransform: 'uppercase' },
  emptyText: { color: THEME.muted, fontWeight: '700', marginBottom: 14 },
  historyRow: { flexDirection: 'row', gap: 10, backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 12, marginBottom: 8 },
  historyDate: { fontWeight: '900', color: THEME.primary, fontSize: 12, width: 70 },
  historyMain: { fontWeight: '700', color: THEME.text, fontSize: 12 },
  historyNote: { fontWeight: '600', color: THEME.muted, fontSize: 11, marginTop: 2 },
  exportRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 10 },
  exportButton: { backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  exportFlex: { flex: 1 },
  exportButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 14 },
  deleteButton: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,77,109,0.12)' },
  deleteButtonText: { color: '#FF4D6D', fontWeight: '900' },
});
