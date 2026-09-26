// ============================================================
// YUMURCAK — TeacherMedicationFormDetailScreen.js
// FAZ 8: "İlaç Takip Formu" detay + günlük uygulama log ekranı. Öğretmen
// "Bugün Verildi" ile o günün dozunu işaretliyor; geçmiş kayıtlar altta
// listeleniyor. Yazdır/Paylaş, veli onayı + personel imzası için fiziksel
// çıktı üretir (documentPdf.js -> buildIlacTakipHtml).
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, onValue, update } from 'firebase/database';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
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
      const teacherName = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || t('teacher.medicationFormDetail.teacherFallback');
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
      Alert.alert(t('teacher.medicationFormDetail.errorTitle'), t('teacher.medicationFormDetail.logErrorDesc'));
    } finally {
      setLogging(false);
    }
  }

  function confirmDelete() {
    Alert.alert(t('teacher.medicationFormDetail.deleteConfirmTitle'), t('teacher.medicationFormDetail.deleteConfirmDesc'), [
      { text: t('teacher.medicationFormDetail.deleteCancelButton'), style: 'cancel' },
      { text: t('teacher.medicationFormDetail.deleteConfirmButton'), style: 'destructive', onPress: doDelete },
    ]);
  }

  async function doDelete() {
    try {
      await update(ref(database, `${NODE_PATH}/${formId}`), { aktif: false, updatedAt: Date.now() });
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert(t('teacher.medicationFormDetail.errorTitle'), t('teacher.medicationFormDetail.deleteErrorDesc'));
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
      Alert.alert(t('teacher.medicationFormDetail.errorTitle'), t('teacher.medicationFormDetail.exportErrorDesc'));
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <LoadingState text={t('teacher.medicationFormDetail.loadingText')} />;
  if (!record) return <LoadingState text={t('teacher.medicationFormDetail.formNotFound')} />;

  const kayitlar = Object.entries(record.kayitlar || {}).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={t('teacher.medicationFormDetail.doseLoggedToast')} onHide={() => setSuccessToast(false)} />
      <View onLayout={onHeaderLayout}>
        <ScreenHeader navigation={navigation} title={record.ilacAdi} subtitle={record.cocukAdi} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <InfoRow label={t('teacher.medicationFormDetail.doseLabel')} value={record.doz} />
          <InfoRow label={t('teacher.medicationFormDetail.methodLabel')} value={record.uygulamaSekli} />
          <InfoRow label={t('teacher.medicationFormDetail.startLabel')} value={formatDateTr(record.baslangicTarihi)} />
          <InfoRow label={t('teacher.medicationFormDetail.endLabel')} value={formatDateTr(record.bitisTarihi)} />
          <InfoRow label={t('teacher.medicationFormDetail.reminderTimeLabel')} value={record.hatirlaticiSaat ? `⏰ ${record.hatirlaticiSaat}` : ''} />
          <InfoRow label={t('teacher.medicationFormDetail.parentApprovalLabel')} value={record.veliOnayi ? t('teacher.medicationFormDetail.approvalReceived') : t('teacher.medicationFormDetail.approvalPending')} />
        </View>

        {todayLogged ? (
          <View style={styles.loggedCard}>
            <Text style={styles.loggedText}>{t('teacher.medicationFormDetail.loggedToday', { date: formatDateTr(today) })}</Text>
          </View>
        ) : (
          <View style={styles.logCard}>
            <Text style={styles.logTitle}>{t('teacher.medicationFormDetail.todaysDoseTitle', { date: formatDateTr(today) })}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('teacher.medicationFormDetail.notePlaceholder')}
              placeholderTextColor={THEME.muted}
              style={styles.input}
            />
            <TouchableOpacity disabled={logging} style={[styles.logButton, logging && { opacity: 0.6 }]} onPress={handleLogToday} activeOpacity={0.85}>
              <Text style={styles.logButtonText}>{logging ? t('teacher.medicationFormDetail.saving') : t('teacher.medicationFormDetail.logTodayButton')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.historyTitle}>{t('teacher.medicationFormDetail.historyTitle')}</Text>
        {kayitlar.length === 0 ? (
          <Text style={styles.emptyText}>{t('teacher.medicationFormDetail.noHistory')}</Text>
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
            <Text style={styles.exportButtonText}>{exporting ? '...' : t('teacher.medicationFormDetail.printButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={exporting} style={[styles.exportButton, styles.exportFlex]} onPress={() => handleExport('share')} activeOpacity={0.85}>
            <Text style={styles.exportButtonText}>{exporting ? '...' : t('teacher.medicationFormDetail.shareButton')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} activeOpacity={0.85}>
          <Text style={styles.deleteButtonText}>{t('teacher.medicationFormDetail.deleteFormButton')}</Text>
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
