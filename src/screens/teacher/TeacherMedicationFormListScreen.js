// ============================================================
// YUMURCAK — TeacherMedicationFormListScreen.js
// FAZ 8: "İlaç Takip Formu" — mevcut TeacherMedicalScreen'deki statik
// "ilaçlar" alanından FARKLI: burada belirli bir ilaç kürü için tarihli,
// günlük uygulama LOG'u tutuluyor (kim verdi, saat kaçta, verildi mi).
//
// ⚠️ SAĞLIK BELGESİ: bu form fiziksel çıktısı veli onayı + personel imzası
// için tasarlandı. Ekrandaki bilgilerin (doz, saat, tarih) doğru girildiğinden
// emin olunmalı — bu ekran veri girişini kolaylaştırır ama tıbbi
// sorumluluk kurumun/öğretmenin kendisindedir.
// ============================================================
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';

function formatDateTr(dateKey) {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return dateKey || '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function TeacherMedicationFormListScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, currentClass, kresId, classChildren } = useTeacherData();
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);

  useEffect(() => {
    if (!kresId) {
      setLoadingForms(false);
      return undefined;
    }
    const q = query(ref(database, 'ilacTakipFormlari'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      const data = snap.val() || {};
      const classChildIds = new Set(classChildren.map((c) => c.id));
      const list = Object.entries(data)
        .map(([id, value]) => ({ id, ...value }))
        .filter((item) => item.aktif !== false && classChildIds.has(item.cocukId))
        .sort((a, b) => String(b.baslangicTarihi || '').localeCompare(String(a.baslangicTarihi || '')));
      setForms(list);
      setLoadingForms(false);
    }, () => setLoadingForms(false));
    return () => unsub();
  }, [kresId, classChildren]);

  if (loading) return <LoadingState text={t('teacher.medicationFormList.loading')} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title={t('teacher.medicationFormList.title')} subtitle={currentClass?.ad || t('teacher.medicationFormList.classFallback')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title={t('teacher.medicationFormList.noClassTitle')} desc={t('teacher.medicationFormList.noClassDesc')} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => navigation.navigate('TeacherMedicationFormEdit', {})}
              activeOpacity={0.85}
            >
              <Text style={styles.newButtonText}>{t('teacher.medicationFormList.newButton')}</Text>
            </TouchableOpacity>

            {loadingForms ? (
              <ActivityIndicator color={THEME.primary} style={{ marginTop: 30 }} />
            ) : forms.length === 0 ? (
              <EmptyState icon="💊" title={t('teacher.medicationFormList.emptyTitle')} desc={t('teacher.medicationFormList.emptyDesc')} />
            ) : (
              forms.map((form) => (
                <TouchableOpacity
                  key={form.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('TeacherMedicationFormDetail', { formId: form.id })}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>💊 {form.ilacAdi} — {form.cocukAdi}</Text>
                    <Text style={styles.cardMeta}>{formatDateTr(form.baslangicTarihi)} - {formatDateTr(form.bitisTarihi)}</Text>
                    <Text style={styles.cardApproval}>{form.veliOnayi ? t('teacher.medicationFormList.approvalReceived') : t('teacher.medicationFormList.approvalPending')}</Text>
                  </View>
                  <Text style={styles.cardArrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 36 },
  newButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  newButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: THEME.text },
  cardMeta: { fontSize: 12, fontWeight: '700', color: THEME.muted, marginTop: 3 },
  cardApproval: { fontSize: 11, fontWeight: '700', color: THEME.primary, marginTop: 3 },
  cardArrow: { fontSize: 22, color: THEME.muted, fontWeight: '900', marginLeft: 8 },
});
