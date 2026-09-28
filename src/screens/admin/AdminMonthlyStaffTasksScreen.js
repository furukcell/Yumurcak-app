// ============================================================
// YUMURCAK — AdminMonthlyStaffTasksScreen.js
// FAZ 8: "{t('admin.monthly.staff.title')}" — yemek listesi/ders programı gibi GÜN BAZLI
// değil, ay başına TEK kayıt olan bir belge türü. Başlıklı bölümlerden
// (örn. "Öğretmenler", "Mutfak / Temizlik Personeli") oluşan, kurum
// genelinde, ay bazlı personel görev/sorumluluk listesi.
//
// Aynı altyapı (PDF render, Yazdır/Paylaş/İndir, Arşiv, kurum bilgisi)
// yemek listesi/ders programıyla PAYLAŞILIYOR — sadece "tek kayıt"
// olduğu için publishMonth/unpublishMonth yerine monthlyDocuments.js'e
// eklenen publishSingleRecord/fetchActiveSingleRecord kullanılıyor
// (unpublishMonth zaten day-array'e bağımlı değildi, değişmeden kullanıldı).
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { onValue, ref, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import MonthlyArchivePicker from '../../components/MonthlyArchivePicker';
import { generateId } from '../../utils/id';
import {
  getMonthKey,
  getMonthLabel,
  shiftMonth,
  countPublished,
  fetchActiveSingleRecord,
  publishSingleRecord,
  unpublishMonth,
} from '../../services/monthlyDocuments';

const NODE_PATH = 'personelGorevListeleri';
const KAYNAK = 'admin_aylik';

function defaultSections() {
  return [
    { id: generateId(), baslik: 'Öğretmenler', icerik: '' },
    { id: generateId(), baslik: 'Mutfak / Temizlik Personeli', icerik: '' },
    { id: generateId(), baslik: 'Genel Hatırlatmalar', icerik: '' },
  ];
}

function hasBulletinContent(baslik, bolumler) {
  if (String(baslik || '').trim()) return true;
  return bolumler.some((s) => String(s.baslik || '').trim() || String(s.icerik || '').trim());
}

export default function AdminMonthlyStaffTasksScreen({ navigation }) {
  const headerHeight = useHeaderHeight();
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const kresId = kullanici?.kresId;
  const adminId = kullanici?.uid || kullanici?.id || null;

  const [monthDate, setMonthDate] = useState(new Date());
  const monthKey = useMemo(() => getMonthKey(monthDate), [monthDate]);
  const monthLabel = useMemo(() => getMonthLabel(monthDate), [monthDate]);

  const [baslik, setBaslik] = useState('');
  const [bolumler, setBolumler] = useState(defaultSections);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [successToast, setSuccessToast] = useState(false);

  // Ay değişince: o ay için zaten yayınlanmış görev listesi varsa onu düzenlemeye
  // aç, yoksa varsayılan bölüm iskeletiyle boş bir taslağa dön.
  useEffect(() => {
    let cancelled = false;
    if (!kresId) {
      setLoadingDraft(false);
      return undefined;
    }

    setLoadingDraft(true);
    fetchActiveSingleRecord({ nodePath: NODE_PATH, kresId, monthKey, kaynak: KAYNAK }).then((record) => {
      if (cancelled) return;
      if (record) {
        setBaslik(record.baslik || '');
        setBolumler(
          Array.isArray(record.bolumler) && record.bolumler.length > 0
            ? record.bolumler.map((s) => ({ id: generateId(), baslik: s.baslik || '', icerik: s.icerik || '' }))
            : defaultSections()
        );
      } else {
        setBaslik('');
        setBolumler(defaultSections());
      }
      setLoadingDraft(false);
    });

    return () => { cancelled = true; };
  }, [kresId, monthKey]);

  useEffect(() => {
    if (!kresId) {
      setPublishedCount(0);
      return undefined;
    }
    const q = query(ref(database, NODE_PATH), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(
      q,
      (snap) => setPublishedCount(countPublished(snap.val(), { kresId, monthKey, kaynak: KAYNAK })),
      () => setPublishedCount(0)
    );
    return () => unsub();
  }, [kresId, monthKey]);

  function changeMonth(direction) {
    setMonthDate((prev) => shiftMonth(prev, direction));
  }

  function jumpToMonth(date) {
    setMonthDate(date);
  }

  function updateSection(id, field, text) {
    setBolumler((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: text } : s)));
  }

  function addSection() {
    setBolumler((prev) => [...prev, { id: generateId(), baslik: '', icerik: '' }]);
  }

  function removeSection(id) {
    setBolumler((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleCopyPreviousMonth() {
    if (!kresId) return;
    setCopying(true);
    try {
      const prevDate = shiftMonth(monthDate, -1);
      const prevMonthKey = getMonthKey(prevDate);
      const prevRecord = await fetchActiveSingleRecord({ nodePath: NODE_PATH, kresId, monthKey: prevMonthKey, kaynak: KAYNAK });

      if (!prevRecord) {
        Alert.alert(t('admin.monthly.notFound'), t('admin.monthly.staff.previousNotFound'));
        return;
      }

      setBaslik(prevRecord.baslik || '');
      setBolumler(
        Array.isArray(prevRecord.bolumler) && prevRecord.bolumler.length > 0
          ? prevRecord.bolumler.map((s) => ({ id: generateId(), baslik: s.baslik || '', icerik: s.icerik || '' }))
          : defaultSections()
      );
      Alert.alert(t('admin.monthly.copied'), t('admin.monthly.staff.copiedDesc'));
    } catch (error) {
      console.log(error);
      Alert.alert(t('common.error'), t('admin.monthly.copyFailed'));
    } finally {
      setCopying(false);
    }
  }

  const hasAnyEntry = hasBulletinContent(baslik, bolumler);

  function confirmPublish() {
    if (!kresId) {
      Alert.alert(t('common.error'), t('admin.monthly.institutionMissing'));
      return;
    }
    if (!hasAnyEntry) {
      Alert.alert(t('admin.monthly.missingInfo'), t('admin.monthly.staff.publishRequired'));
      return;
    }
    Alert.alert(
      t('admin.monthly.staff.publishTitle'),
      t('admin.monthly.staff.publishConfirm', { month: monthLabel }),
      [
        { text: t('admin.monthly.cancel'), style: 'cancel' },
        { text: t('admin.monthly.publish'), onPress: doPublish },
      ]
    );
  }

  async function doPublish() {
    setSaving(true);
    try {
      await publishSingleRecord({
        nodePath: NODE_PATH,
        kresId,
        monthKey,
        kaynak: KAYNAK,
        buildRecord: ({ kresId: kId, monthKey: mKey, kaynak, now }) => ({
          kresId: kId,
          kaynak,
          ayKey: mKey,
          tarih: `${mKey}-01`,
          baslik: baslik.trim() || t('admin.monthly.staff.defaultTitle', { month: monthLabel }),
          bolumler: bolumler
            .filter((s) => s.baslik.trim() || s.icerik.trim())
            .map((s) => ({ baslik: s.baslik.trim(), icerik: s.icerik.trim() })),
          aktif: true,
          createdAt: now,
          updatedAt: now,
        }),
      });

      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert(t('common.error'), t('admin.monthly.staff.publishFailed'));
    } finally {
      setSaving(false);
    }
  }

  function confirmUnpublish() {
    if (!kresId || publishedCount === 0) return;
    Alert.alert(
      t('admin.monthly.unpublishTitle'),
      t('admin.monthly.staff.unpublishConfirm', { month: monthLabel }),
      [
        { text: t('admin.monthly.cancel'), style: 'cancel' },
        { text: t('admin.monthly.unpublish'), style: 'destructive', onPress: doUnpublish },
      ]
    );
  }

  async function doUnpublish() {
    setUnpublishing(true);
    try {
      await unpublishMonth({ nodePath: NODE_PATH, kresId, monthKey, kaynak: KAYNAK });
    } catch (error) {
      console.log(error);
      Alert.alert(t('common.error'), t('admin.monthly.unpublishFailed'));
    } finally {
      setUnpublishing(false);
    }
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <AppSuccessToast visible={successToast} message={t('admin.monthly.staff.publishedToast', { month: monthLabel })} onHide={() => setSuccessToast(false)} />
         <KeyboardAvoidingView
          style={{ flex: 1 }}
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
   >
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ {t('common.back')}</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{t('admin.monthly.staff.title')}</Text>
              <Text style={styles.subtitle}>{t('admin.monthly.staff.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.monthCard}>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)} activeOpacity={0.8}>
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.monthCenter}>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Text style={styles.monthHint}>{loadingDraft ? t('admin.monthly.loading') : t('admin.monthly.staff.draft')}</Text>
            </View>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)} activeOpacity={0.8}>
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {publishedCount > 0 ? (
            <View style={styles.publishedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.publishedTitle}>✅ {t('admin.monthly.published', { month: monthLabel })}</Text>
                <Text style={styles.publishedText}>{t('admin.monthly.staff.publishedDesc')}</Text>
              </View>
              <TouchableOpacity disabled={unpublishing} style={[styles.unpublishButton, unpublishing && { opacity: 0.6 }]} onPress={confirmUnpublish} activeOpacity={0.85}>
                <Text style={styles.unpublishButtonText}>{unpublishing ? t('admin.monthly.unpublishing') : t('admin.monthly.unpublishTitle')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.utilityRow}>
            <TouchableOpacity disabled={copying} style={[styles.copyButton, styles.utilityFlex, copying && { opacity: 0.6 }]} onPress={handleCopyPreviousMonth} activeOpacity={0.85}>
              <Text style={styles.copyButtonText}>{copying ? t('admin.monthly.copying') : `📋 ${t('admin.monthly.copyPrevious')}`}</Text>
            </TouchableOpacity>
            <MonthlyArchivePicker
              kresId={kresId}
              nodePath={NODE_PATH}
              kaynak={KAYNAK}
              currentMonthKey={monthKey}
              onSelectMonth={jumpToMonth}
              countLabel={t('admin.monthly.staff.publishedLabel')}
              theme={theme}
            />
          </View>

          <Text style={styles.fieldLabel}>{t('admin.monthly.staff.listTitleLabel')}</Text>
          <TextInput
            value={baslik}
            onChangeText={setBaslik}
            placeholder={t('admin.monthly.staff.defaultTitle', { month: monthLabel })}
            placeholderTextColor={theme.muted}
            style={styles.titleInput}
          />

          {bolumler.map((section, index) => (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIndex}>{t('admin.monthly.staff.section', { index: index + 1 })}</Text>
                <TouchableOpacity onPress={() => removeSection(section.id)} activeOpacity={0.8}>
                  <Text style={styles.sectionRemove}>{t('admin.monthly.delete')}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={section.baslik}
                onChangeText={(text) => updateSection(section.id, 'baslik', text)}
                placeholder={t('admin.monthly.staff.sectionTitlePlaceholder')}
                placeholderTextColor={theme.muted}
                style={styles.sectionTitleInput}
              />
              <TextInput
                value={section.icerik}
                onChangeText={(text) => updateSection(section.id, 'icerik', text)}
                placeholder={t('admin.monthly.staff.contentPlaceholder')}
                placeholderTextColor={theme.muted}
                style={styles.sectionContentInput}
                multiline
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addSectionButton} onPress={addSection} activeOpacity={0.85}>
            <Text style={styles.addSectionButtonText}>+ {t('admin.monthly.staff.addSection')}</Text>
          </TouchableOpacity>

          <TouchableOpacity disabled={saving} style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]} onPress={confirmPublish} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? t('admin.monthly.publishing') : t('admin.monthly.staff.publishButton', { month: monthLabel })}</Text>
          </TouchableOpacity>

          {publishedCount > 0 ? (
            <View style={{ marginTop: 14 }}>
              <MonthlyDocumentPdfBar
                kresId={kresId}
                nodePath={NODE_PATH}
                kaynak={KAYNAK}
                docType="gorev"
                monthKey={monthKey}
                monthLabel={monthLabel}
                theme={theme}
              />
            </View>
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
    headerTextWrap: { flex: 1, minWidth: 0 },
    title: { color: theme.primary, fontSize: 24, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 3 },
    monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.primary, borderRadius: 22, padding: 14, marginBottom: 12 },
    monthButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    monthButtonText: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: -2 },
    monthCenter: { alignItems: 'center' },
    monthLabel: { color: '#fff', fontSize: 20, fontWeight: '900' },
    monthHint: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 3 },
    publishedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    publishedTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
    publishedText: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    unpublishButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FF4D6D' },
    unpublishButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    copyButton: { backgroundColor: theme.primarySoft, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    utilityRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'stretch' },
    utilityFlex: { flex: 1 },
    copyButtonText: { color: theme.primary, fontWeight: '900', fontSize: 14 },
    fieldLabel: { fontSize: 12, fontWeight: '900', color: theme.muted, marginBottom: 8, textTransform: 'uppercase' },
    titleInput: { minHeight: 48, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 16 },
    sectionCard: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionIndex: { fontSize: 11, fontWeight: '900', color: theme.muted, textTransform: 'uppercase' },
    sectionRemove: { fontSize: 12, fontWeight: '900', color: '#FF4D6D' },
    sectionTitleInput: { minHeight: 42, backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: theme.text, fontWeight: '800', marginBottom: 8 },
    sectionContentInput: { minHeight: 90, backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontWeight: '600', textAlignVertical: 'top' },
    addSectionButton: { alignItems: 'center', paddingVertical: 13, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.primarySoft, marginBottom: 16 },
    addSectionButtonText: { color: theme.primary, fontWeight: '900', fontSize: 14 },
    saveButton: { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
}
