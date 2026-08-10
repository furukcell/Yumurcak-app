// ============================================================
// YUMURCAK — MonthlyDocumentPdfBar.js
// Faz 3: Aylık belge (yemek listesi / ders programı) için ortak
// "Yazdır" + "Paylaş / İndir" buton satırı. Admin, öğretmen ve veli
// ekranlarının HEPSİ bu component'i kullanır — tek renderer, tek buton
// mantığı; her ekran kendi PDF kodunu yazmaz.
//
// Kayıtları KENDİSİ çeker (nodePath + kresId + monthKey + kaynak +
// opsiyonel sinifId ile), o yüzden ekranın local taslak state'i değil,
// DB'deki YAYINLANMIŞ (aktif) hali PDF'e yansır — taslak/paylaşılan
// karışıklığı olmaz.
// ============================================================
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { query, ref, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import {
  fetchInstitutionInfo,
  buildMonthlyDocumentHtml,
  printMonthlyDocument,
  shareMonthlyDocumentPdf,
} from '../services/documentPdf';

function fetchPublishedRecords({ nodePath, kresId, monthKey, kaynak, sinifId }) {
  return new Promise((resolve) => {
    if (!kresId) {
      resolve([]);
      return;
    }

    let unsub = null;
    const q = query(ref(database, nodePath), orderByChild('kresId'), equalTo(kresId));
    unsub = onValue(
      q,
      (snap) => {
        if (unsub) unsub();
        const data = snap.val() || {};
        const list = Object.values(data).filter((item) => {
          if (item?.ayKey !== monthKey) return false;
          if (item?.kaynak !== kaynak) return false;
          if (item?.aktif === false) return false;
          if (sinifId && item?.sinifId !== sinifId) return false;
          return true;
        });
        resolve(list);
      },
      () => {
        if (unsub) unsub();
        resolve([]);
      }
    );
  });
}

function docTypeLabel(docType, t) {
  if (docType === 'yemek') return t('parent.pdfBar.docType.yemek');
  if (docType === 'nobet') return t('parent.pdfBar.docType.nobet');
  if (docType === 'gorev') return t('parent.pdfBar.docType.gorev');
  return t('parent.pdfBar.docType.ders');
}

export default function MonthlyDocumentPdfBar({ kresId, nodePath, kaynak, docType, monthKey, monthLabel, sinifId, sinifAd, theme }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState('');
  const palette = theme || { primary: '#6C3DEB', primarySoft: '#EFE8FF', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8' };

  async function prepareHtml() {
    const [kres, records] = await Promise.all([
      fetchInstitutionInfo(kresId),
      fetchPublishedRecords({ nodePath, kresId, monthKey, kaynak, sinifId }),
    ]);

    if (records.length === 0) {
      Alert.alert(t('parent.pdfBar.noRecordsTitle'), t('parent.pdfBar.noRecordsBody', { monthLabel }));
      return null;
    }

    return buildMonthlyDocumentHtml({ docType, kres, monthLabel, sinifAd, records });
  }

  async function handlePrint() {
    setBusy('print');
    try {
      const html = await prepareHtml();
      if (html) await printMonthlyDocument(html);
    } catch (error) {
      console.warn('PDF yazdırılamadı:', error?.message || error);
      Alert.alert(t('parent.pdfBar.errorTitle'), t('parent.pdfBar.printErrorBody'));
    } finally {
      setBusy('');
    }
  }

  async function handleShare() {
    setBusy('share');
    try {
      const html = await prepareHtml();
      if (html) await shareMonthlyDocumentPdf(html, `${docTypeLabel(docType, t)} - ${monthLabel}`);
    } catch (error) {
      console.warn('PDF paylaşılamadı:', error?.message || error);
      Alert.alert(t('parent.pdfBar.errorTitle'), t('parent.pdfBar.shareErrorBody'));
    } finally {
      setBusy('');
    }
  }

  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <TouchableOpacity
        disabled={!!busy}
        style={[styles.btn, { backgroundColor: palette.primarySoft, opacity: busy ? 0.6 : 1 }]}
        onPress={handlePrint}
        activeOpacity={0.85}
      >
        {busy === 'print' ? <ActivityIndicator color={palette.primary} /> : <Text style={[styles.btnText, { color: palette.primary }]}>🖨️ {t('parent.pdfBar.print')}</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        disabled={!!busy}
        style={[styles.btn, { backgroundColor: palette.primary, opacity: busy ? 0.6 : 1 }]}
        onPress={handleShare}
        activeOpacity={0.85}
      >
        {busy === 'share' ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: '#fff' }]}>📤 {t('parent.pdfBar.shareDownload')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '900', fontSize: 13 },
});
