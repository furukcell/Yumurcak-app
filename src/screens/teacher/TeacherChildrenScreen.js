// ============================================================
// YUMURCAK — TeacherChildrenScreen.js
// Öğretmenin sınıfındaki çocuklar
// FAZ: Kart üzerinde detay açma (expand) + bugünkü rapor rozeti
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  THEME,
  useTeacherData,
  ScreenHeader,
  LoadingState,
  EmptyState,
  getChildName,
  todayString,
} from './teacherShared';
import { calculateChildAge, formatChildBirthDate, getChildBirthDate } from '../../utils/childDates';

export default function TeacherChildrenScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const reportMode = route.params?.mode === 'report';
  const { loading, currentClass, classChildren, reports } = useTeacherData();
  const [expandedId, setExpandedId] = useState(null);
  const [veliMap, setVeliMap] = useState({});
  const [veliLoading, setVeliLoading] = useState(true);

  // Veli bilgileri (ad, telefon) çocuk kaydında tutulmuyor — kullanicilar/{veliId}
  // altında, rol: 'veli' olarak duruyor. Sadece bu sınıftaki çocukların
  // veliIds'lerini topluyor, o kullanıcıları tek tek çekiyoruz.
  // (Önceden tüm 'kullanicilar' node'u çekilip client-side filtreleniyordu —
  // bu, tüm kreşlerin veli verisini cihaza indiriyordu.)
  useEffect(() => {
    let cancelled = false;

    const loadVeliler = async () => {
      setVeliLoading(true);
      try {
        const veliIds = new Set();
        (classChildren || []).forEach((child) => {
          (Array.isArray(child.veliIds) ? child.veliIds : []).forEach((id) => veliIds.add(id));
        });

        const entries = await Promise.all(
          Array.from(veliIds).map(async (id) => {
            const snap = await get(ref(database, `kullanicilar/${id}`));
            const val = snap.val();
            return val ? [id, val] : null;
          })
        );

        if (!cancelled) {
          const map = {};
          entries.filter(Boolean).forEach(([id, v]) => {
            if (v.rol === 'veli') map[id] = v;
          });
          setVeliMap(map);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setVeliLoading(false);
      }
    };

    loadVeliler();

    return () => {
      cancelled = true;
    };
  }, [classChildren]);

  const today = todayString();

  // Bugün hangi çocuklar için rapor girilmiş — hızlı bakış için set oluşturuyoruz.
  const reportedTodayIds = useMemo(() => {
    const set = new Set();
    (reports || []).forEach((item) => {
      if (item.tarih === today) set.add(item.cocukId);
    });
    return set;
  }, [reports, today]);

  if (loading) return <LoadingState text={reportMode ? t('teacher.children.loadingReport') : t('teacher.children.loading')} />;

  const handleChildPress = (childId, child) => {
    if (reportMode) {
      navigation.navigate('ChildReport', { child });
      return;
    }

    setExpandedId((prev) => (prev === childId ? null : childId));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        navigation={navigation}
        title={reportMode ? t('teacher.children.reportTitle') : t('teacher.children.title')}
        subtitle={reportMode ? t('teacher.children.reportSubtitle') : (currentClass?.ad || t('teacher.children.classFallback'))}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reportMode ? (
          <View style={styles.reportInfoBox}>
            <Text style={styles.reportInfoTitle}>{t('teacher.children.reportInfoTitle')}</Text>
            <Text style={styles.reportInfoText}>{t('teacher.children.reportInfoText')}</Text>
          </View>
        ) : null}

        {classChildren.length === 0 ? (
          <EmptyState icon="👧" title={t('teacher.children.emptyTitle')} desc={t('teacher.children.emptyDesc')} />
        ) : (
          classChildren.map((child) => {
            const isExpanded = expandedId === child.id;
            const reportedToday = reportedTodayIds.has(child.id);
            const birthDate = getChildBirthDate(child);
            const age = calculateChildAge(birthDate);
            const birthDateText = formatChildBirthDate(birthDate);

            return (
              <View key={child.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => handleChildPress(child.id, child)}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatar}><Text style={styles.avatarText}>{reportMode ? '📝' : '👧'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{getChildName(child)}</Text>
                    <Text style={styles.sub}>{t('teacher.children.ageSub', { age: age || '—', birthDate: birthDateText })}</Text>
                  </View>

                  {reportedToday ? (
                    <View style={styles.reportBadge}>
                      <Text style={styles.reportBadgeText}>{t('teacher.children.reportedBadge')}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.chevron}>{reportMode ? '›' : (isExpanded ? '▲' : '▼')}</Text>
                </TouchableOpacity>

                {!reportMode && isExpanded ? (
                  <View style={styles.details}>
                    <DetailRow label={t('teacher.children.ageLabel')} value={age || '—'} />
                    <DetailRow label={t('teacher.children.birthDateLabel')} value={birthDateText} />

                    {veliLoading ? (
                      <Text style={styles.veliLoadingText}>{t('teacher.children.veliLoading')}</Text>
                    ) : (
                      renderVeliler(child.veliIds, veliMap, t)
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderVeliler(veliIds, veliMap, t) {
  const ids = Array.isArray(veliIds) ? veliIds : [];

  if (ids.length === 0) {
    return <Text style={styles.veliEmptyText}>{t('teacher.children.veliEmpty')}</Text>;
  }

  return ids.map((veliId, index) => {
    const veli = veliMap[veliId];

    if (!veli) {
      return (
        <DetailRow
          key={veliId}
          label={ids.length > 1 ? t('teacher.children.veliIndexLabel', { index: index + 1 }) : t('teacher.children.veliLabel')}
          value={t('teacher.children.veliNotFound')}
        />
      );
    }

    return (
      <View key={veliId} style={index > 0 ? styles.veliGroupSpacing : null}>
        <DetailRow
          label={ids.length > 1 ? t('teacher.children.veliIndexLabel', { index: index + 1 }) : t('teacher.children.veliNameLabel')}
          value={veli.ad || '—'}
        />
        <DetailRow label={t('teacher.children.phoneLabel')} value={veli.telefon || '—'} />
      </View>
    );
  });
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 30 },
  reportInfoBox: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#FFE1A6',
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
  },
  reportInfoTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  reportInfoText: { color: THEME.muted, fontWeight: '700', marginTop: 5, lineHeight: 18 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 25 },
  name: { fontSize: 16, fontWeight: '900', color: THEME.text },
  sub: { color: THEME.muted, marginTop: 3, fontWeight: '600' },
  reportBadge: {
    backgroundColor: '#E7F8D8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  reportBadgeText: { color: '#3C8C2A', fontSize: 11, fontWeight: '900' },
  chevron: { color: THEME.muted, fontSize: 20, marginLeft: 4, fontWeight: '900' },
  details: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  detailLabel: { color: THEME.muted, fontWeight: '700', fontSize: 13 },
  detailValue: { color: THEME.text, fontWeight: '800', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  veliLoadingText: { color: THEME.muted, fontWeight: '600', fontSize: 13, paddingTop: 10 },
  veliEmptyText: { color: THEME.muted, fontWeight: '600', fontSize: 13, paddingTop: 10, fontStyle: 'italic' },
  veliGroupSpacing: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: THEME.border },
});
