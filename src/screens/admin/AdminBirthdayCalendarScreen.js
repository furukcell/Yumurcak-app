// ============================================================
// YUMURCAK — AdminBirthdayCalendarScreen.js
// FAZ 8: "Doğum Günü Takvimi" — elle girilen bir belge DEĞİL, o ay doğum
// günü olan çocukların `cocuklar.dogumTarihi` (format: YYYY-MM-DD, bkz.
// utils/childDates.js) alanından HESAPLANAN bir rapor. Yeni bir DB node'u
// gerekmiyor — sadece görüntüleme + PDF çıktısı.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, onValue, get, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import { getMonthKey, getMonthLabel, shiftMonth } from '../../services/monthlyDocuments';
import {
  fetchInstitutionInfo,
  buildBirthdayCalendarHtml,
  printMonthlyDocument,
  shareMonthlyDocumentPdf,
} from '../../services/documentPdf';

export default function AdminBirthdayCalendarScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const [monthDate, setMonthDate] = useState(new Date());
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [sinifMap, setSinifMap] = useState({});
  const [exporting, setExporting] = useState(false);

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

    return () => { unsub(); sinifUnsub(); };
  }, [kresId]);

  const birthdays = useMemo(() => {
    const targetMonth = monthDate.getMonth();
    const targetYear = monthDate.getFullYear();

    return children
      .map((child) => {
        const parts = String(child.dogumTarihi || '').split('-');
        if (parts.length !== 3) return null;
        const [yearStr, monthStr, dayStr] = parts;
        const birthMonth = Number(monthStr) - 1;
        if (birthMonth !== targetMonth) return null;

        return {
          id: child.id,
          ad: `${child.ad || ''} ${child.soyad || ''}`.trim(),
          sinifAd: sinifMap[child.sinifId] || '',
          gun: Number(dayStr),
          yasOlacak: targetYear - Number(yearStr),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.gun - b.gun);
  }, [children, sinifMap, monthDate]);

  function changeMonth(direction) {
    setMonthDate((prev) => shiftMonth(prev, direction));
  }

  async function handleExport(mode) {
    setExporting(true);
    try {
      const kres = await fetchInstitutionInfo(kresId);
      const html = buildBirthdayCalendarHtml({ kres, monthLabel, records: birthdays });
      if (mode === 'print') await printMonthlyDocument(html);
      else await shareMonthlyDocumentPdf(html, `Doğum Günü Takvimi - ${monthLabel}`);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Takvim oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Doğum Günü Takvimi</Text>
              <Text style={styles.subtitle}>Çocukların kayıtlı doğum tarihinden otomatik hesaplanır</Text>
            </View>
          </View>

          <View style={styles.monthCard}>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)} activeOpacity={0.8}>
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.monthCenter}>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Text style={styles.monthHint}>{birthdays.length} doğum günü</Text>
            </View>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)} activeOpacity={0.8}>
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
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
          ) : birthdays.length === 0 ? (
            <Text style={styles.emptyText}>Bu ay doğum günü olan çocuk yok.</Text>
          ) : (
            birthdays.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{item.gun}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>🎂 {item.ad}</Text>
                  <Text style={styles.childMeta}>{item.sinifAd} · {item.yasOlacak} yaşına giriyor</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
    title: { color: theme.primary, fontSize: 22, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
    monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.primary, borderRadius: 22, padding: 14, marginBottom: 12 },
    monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    monthButtonText: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: -2 },
    monthCenter: { alignItems: 'center' },
    monthLabel: { color: '#fff', fontSize: 20, fontWeight: '900' },
    monthHint: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 3 },
    exportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    exportButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    exportFlex: { flex: 1 },
    exportButtonText: { color: theme.primary, fontWeight: '900', fontSize: 14 },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 30, fontWeight: '700' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10 },
    dayBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
    dayBadgeText: { color: theme.primary, fontWeight: '900', fontSize: 16 },
    childName: { fontSize: 15, fontWeight: '900', color: theme.text },
    childMeta: { fontSize: 12, fontWeight: '700', color: theme.muted, marginTop: 2 },
  });
}
