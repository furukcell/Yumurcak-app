// ============================================================
// YUMURCAK — TeacherAttendanceScreen.js
// FAZ 2: Seç / Kaydet sistemi + aynı çocuk aynı gün tek kayıt
// FAZ 3: "Yoklaması alındı" rozeti eklendi
// Firebase path: yoklamalar/{tarih}_{cocukId}
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ref, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName, todayString } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function TeacherAttendanceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, classChildren, attendance } = useTeacherData();
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState({});
  const [initialStatus, setInitialStatus] = useState({});
  const [successToast, setSuccessToast] = useState(false);

  const today = todayString();

  const todayMap = useMemo(() => {
    const map = {};
    attendance
      .filter((item) => item.tarih === today && item.sinifId === currentClass?.id)
      .forEach((item) => {
        map[item.cocukId] = item.durum;
      });
    return map;
  }, [attendance, currentClass?.id, today]);

  useEffect(() => {
    setLocalStatus(todayMap);
    setInitialStatus(todayMap);
  }, [todayMap]);

  const hasChanges = useMemo(() => {
    const childIds = classChildren.map((child) => child.id);
    return childIds.some((id) => (localStatus[id] || '') !== (initialStatus[id] || ''));
  }, [classChildren, localStatus, initialStatus]);

  if (loading) return <LoadingState text={t('teacher.attendance.loading')} />;

  const selectStatus = (child, status) => {
    setLocalStatus((prev) => ({ ...prev, [child.id]: status }));
  };

  const saveAll = async () => {
    if (!currentClass?.id) return Alert.alert(t('teacher.attendance.errorTitle'), t('teacher.attendance.classNotFoundDesc'));

    const selectedChildren = classChildren.filter((child) => localStatus[child.id]);
    if (selectedChildren.length === 0) {
      Alert.alert(t('teacher.attendance.missingInfoTitle'), t('teacher.attendance.missingSelectionDesc'));
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();

      await Promise.all(
        selectedChildren.map((child) => {
          const recordId = `${today}_${child.id}`;
          return set(ref(database, `yoklamalar/${recordId}`), {
            id: recordId,
            kresId: child.kresId || kresId || '',
            sinifId: child.sinifId || currentClass.id || '',
            cocukId: child.id,
            ogretmenId: teacherId || '',
            tarih: today,
            durum: localStatus[child.id],
            updatedAt: now,
            createdAt: now,
          });
        })
      );

      setInitialStatus(localStatus);
      setSuccessToast(true);
    } catch (err) {
      console.error(err);
      Alert.alert(t('teacher.attendance.errorTitle'), t('teacher.attendance.saveErrorDesc'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message={t('teacher.attendance.successMessage')}
        onHide={() => setSuccessToast(false)}
      />

      <ScreenHeader navigation={navigation} title={t('teacher.attendance.title')} subtitle={today} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="✅" title={t('teacher.attendance.emptyTitle')} desc={t('teacher.attendance.emptyDesc')} />
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t('teacher.attendance.infoTitle')}</Text>
              <Text style={styles.infoDesc}>{t('teacher.attendance.infoDesc')}</Text>
            </View>

            {classChildren.map((child) => {
              const status = localStatus[child.id] || '';
              // Bu çocuk için bugün zaten kaydedilmiş (sunucudaki) bir yoklama var mı?
              const alreadySaved = Boolean(todayMap[child.id]);

              return (
                <View key={child.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.childName}>{getChildName(child)}</Text>
                    {alreadySaved ? (
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedBadgeText}>{t('teacher.attendance.savedBadge')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.buttons}>
                    {renderButton(child, 'geldi', t('teacher.attendance.statusGeldi'), status)}
                    {renderButton(child, 'gelmedi', t('teacher.attendance.statusGelmedi'), status)}
                    {renderButton(child, 'gec', t('teacher.attendance.statusGec'), status)}
                  </View>
                </View>
              );
            })}

            {hasChanges ? (
              <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={saveAll} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{t('teacher.attendance.saveButton')}</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.savedInfo}>{t('teacher.attendance.noChangesInfo')}</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  function renderButton(child, value, label, status) {
    const active = status === value;
    return (
      <TouchableOpacity
        style={[styles.statusButton, active && styles.statusButtonActive]}
        onPress={() => selectStatus(child, value)}
        activeOpacity={0.85}
      >
        <Text style={[styles.statusText, active && styles.statusTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  infoCard: { backgroundColor: THEME.primarySoft, borderRadius: 18, padding: 15, marginBottom: 14 },
  infoTitle: { fontSize: 16, fontWeight: '900', color: THEME.primaryDark },
  infoDesc: { color: THEME.muted, marginTop: 4, fontWeight: '600' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  childName: { fontSize: 16, fontWeight: '900', color: THEME.text, flexShrink: 1 },
  savedBadge: {
    backgroundColor: '#E7F8D8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savedBadgeText: { color: '#3C8C2A', fontSize: 11, fontWeight: '900' },
  buttons: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, paddingVertical: 11, borderRadius: 13, backgroundColor: THEME.bg, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  statusButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  statusText: { color: THEME.text, fontWeight: '900' },
  statusTextActive: { color: '#FFF' },
  saveButton: { marginTop: 10, backgroundColor: THEME.primary, borderRadius: 16, padding: 16, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  savedInfo: { marginTop: 8, textAlign: 'center', color: THEME.muted, fontWeight: '700' },
});
