// ============================================================
// YUMURCAK — ChildReportScreen.js (PARENT)
// Veli günlük rapor görüntüleme
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { translateMood } from '../../utils/moodLabel';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function ChildReportScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const kresId = child?.kresId;

    if (!kresId) {
      setReports([]);
      setLoading(false);
      return undefined;
    }

    // Artık tüm 'gunlukRaporlar' node'u çekilmiyor, sadece bu kreşe ait
    // kayıtlar sorgulanıp client-side cocukId'ye göre filtreleniyor.
    const reportsQ = query(ref(database, 'gunlukRaporlar'), orderByChild('kresId'), equalTo(kresId));
    const unsubscribe = onValue(reportsQ, (snapshot) => {
      const data = snapshot.val();
      const childReports = [];

      if (data) {
        Object.entries(data).forEach(([id, reportData]) => {
          if (reportData.cocukId === child.id) {
            childReports.push({ id, ...reportData });
          }
        });
        childReports.sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
      }

      setReports(childReports);
      setLoading(false);
    }, () => {
      setReports([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [child.id, child?.kresId]);

  const MEAL_ITEM_SECTIONS = [
    { key: 'kahvalti', icon: '🥐' },
    { key: 'ogle', icon: '🍲' },
    { key: 'araOgun', icon: '🍎' },
  ];

  const renderMealItemsSection = (item) => {
    const sections = MEAL_ITEM_SECTIONS
      .map((meal) => ({ ...meal, urunler: item.yemek?.[meal.key]?.urunler }))
      .filter((meal) => meal.urunler && Object.keys(meal.urunler).length > 0);

    if (sections.length === 0) return null;

    return (
      <View style={styles.mealItemsBox}>
        {sections.map((meal) => (
          <View key={meal.key} style={styles.mealItemsRow}>
            <Text style={styles.mealItemsIcon}>{meal.icon}</Text>
            <View style={styles.mealItemsChips}>
              {Object.entries(meal.urunler).map(([name, yedi]) => (
                <View key={name} style={[styles.mealItemChip, yedi ? styles.mealItemChipYedi : styles.mealItemChipYemedi]}>
                  <Text style={styles.mealItemChipText}>{yedi ? '✓' : '✗'} {name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const getMoodIcon = (mood) => {
    const map = {
      'Mutlu': '😊',
      'Neşeli': '😄',
      'Normal': '😐',
      'Üzgün': '😢',
      'Yorgun': '😴',
      'Hasta': '🤒',
      'Sinirli': '😠',
      'Heyecanlı': '🥳',
    };
    return map[mood] || '😊';
  };

  const renderItem = ({ item, index }) => {
    const isFirst = index === 0;
    const moodText = translateMood(item.mood, t, t('parent.childReport.moodFallback'));

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.dateText}>{isFirst ? t('parent.childReport.today') : item.tarih || t('parent.childReport.reportFallback')}</Text>
              <Text style={styles.dateSubText}>{item.tarih || '-'}</Text>
            </View>

            <View style={styles.moodBadge}>
              <Text style={styles.moodIcon}>{getMoodIcon(item.mood)}</Text>
              <Text style={styles.moodLabel}>{moodText}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>🍽️</Text>
              <Text style={styles.metricLabel}>{t('parent.childReport.breakfast')}</Text>
              <Text style={styles.metricValue}>{item.yemek?.kahvalti ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>🥗</Text>
              <Text style={styles.metricLabel}>{t('parent.childReport.lunch')}</Text>
              <Text style={styles.metricValue}>{item.yemek?.ogle ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>🍎</Text>
              <Text style={styles.metricLabel}>{t('parent.childReport.snack')}</Text>
              <Text style={styles.metricValue}>{item.yemek?.araOgun ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>💤</Text>
              <Text style={styles.metricLabel}>{t('parent.childReport.sleep')}</Text>
              <Text style={styles.metricValue}>{item.uyku?.sure !== undefined && item.uyku?.sure !== null ? t('parent.childReport.hoursValue', { count: item.uyku.sure }) : '-'}</Text>
            </View>

            <View style={[styles.metricItem, { borderRightWidth: 0 }]}>
              <Text style={styles.metricIcon}>🚽</Text>
              <Text style={styles.metricLabel}>{t('parent.childReport.toilet')}</Text>
              <Text style={styles.metricValue}>{item.tuvalet?.sayi !== undefined && item.tuvalet?.sayi !== null ? t('parent.childReport.timesValue', { count: item.tuvalet.sayi }) : '-'}</Text>
            </View>
          </View>

          {renderMealItemsSection(item)}

          {item.not ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteAvatar}>👩‍🏫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>{t('parent.childReport.teacherNote')}</Text>
                <Text style={styles.noteText}>{item.not}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>{t('parent.childReport.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>{t('parent.childReport.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{child?.ad || child?.adSoyad || t('parent.childReport.headerFallback')}</Text>

        <View style={styles.headerSpacer} />
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>{t('parent.childReport.noReportsTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('parent.childReport.noReportsDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  backArrow: { fontSize: 28, color: THEME.primary, fontWeight: '700', lineHeight: 32, marginRight: 2 },
  backLabel: { fontSize: 15, color: THEME.primary, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  headerSpacer: { width: 60 },

  list: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 },

  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.primary, marginTop: 20 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#DED2FF', marginTop: 4 },

  card: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  dateText: { fontSize: 16, fontWeight: '900', color: THEME.text },
  dateSubText: { fontSize: 12, color: THEME.muted, marginTop: 2 },
  moodBadge: { backgroundColor: THEME.primarySoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  moodIcon: { fontSize: 20 },
  moodLabel: { fontSize: 10, color: THEME.primary, fontWeight: '900', marginTop: 2 },

  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: THEME.border },
  metricIcon: { fontSize: 18, marginBottom: 4 },
  metricLabel: { fontSize: 9, color: THEME.muted, fontWeight: '800', marginBottom: 3 },
  metricValue: { fontSize: 11, color: THEME.text, fontWeight: '900' },

  mealItemsBox: { marginTop: 4, marginBottom: 4 },
  mealItemsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  mealItemsIcon: { fontSize: 14, marginRight: 6, marginTop: 3 },
  mealItemsChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealItemChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  mealItemChipYedi: { backgroundColor: '#E4F9EE', borderColor: '#20B45B' },
  mealItemChipYemedi: { backgroundColor: '#FFE9E9', borderColor: '#FF4444' },
  mealItemChipText: { fontSize: 11, fontWeight: '800', color: THEME.text },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start' },
  noteAvatar: { fontSize: 26, marginRight: 9 },
  noteTitle: { fontSize: 11, color: THEME.muted, fontWeight: '900', marginBottom: 3 },
  noteText: { fontSize: 12, color: THEME.text, lineHeight: 17 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 19 },
});
