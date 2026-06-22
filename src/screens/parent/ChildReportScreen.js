// ============================================================
// YUMURCAK — ChildReportScreen.js (PARENT)
// Veli günlük rapor görüntüleme
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';

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
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reportsRef = ref(database, 'gunlukRaporlar');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
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
    });

    return () => unsubscribe();
  }, [child.id]);

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

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.dateText}>{isFirst ? 'Bugün' : item.tarih || 'Rapor'}</Text>
              <Text style={styles.dateSubText}>{item.tarih || '-'}</Text>
            </View>

            <View style={styles.moodBadge}>
              <Text style={styles.moodIcon}>{getMoodIcon(item.mood)}</Text>
              <Text style={styles.moodLabel}>{item.mood || 'Mutlu'}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>🍽️</Text>
              <Text style={styles.metricLabel}>Kahvaltı</Text>
              <Text style={styles.metricValue}>{item.yemek?.kahvalti ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>🥗</Text>
              <Text style={styles.metricLabel}>Öğle</Text>
              <Text style={styles.metricValue}>{item.yemek?.ogle ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>🍎</Text>
              <Text style={styles.metricLabel}>İkindi</Text>
              <Text style={styles.metricValue}>{item.yemek?.araOgun ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricIcon}>💤</Text>
              <Text style={styles.metricLabel}>Uyku</Text>
              <Text style={styles.metricValue}>{item.uyku?.sure ? `${item.uyku.sure}s` : '-'}</Text>
            </View>

            <View style={[styles.metricItem, { borderRightWidth: 0 }]}>
              <Text style={styles.metricIcon}>🚽</Text>
              <Text style={styles.metricLabel}>Tuvalet</Text>
              <Text style={styles.metricValue}>{item.tuvalet?.sayi ? `${item.tuvalet.sayi}x` : '-'}</Text>
            </View>
          </View>

          {item.not ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteAvatar}>👩‍🏫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>Öğretmen Notu</Text>
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
        <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Geri</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{child?.ad || child?.adSoyad || 'Raporlar'}</Text>

        <View style={styles.headerSpacer} />
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>Henüz rapor yok</Text>
          <Text style={styles.emptyDesc}>Öğretmen günlük rapor girdiğinde burada görünecek.</Text>
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

  noteBox: { flexDirection: 'row', alignItems: 'flex-start' },
  noteAvatar: { fontSize: 26, marginRight: 9 },
  noteTitle: { fontSize: 11, color: THEME.muted, fontWeight: '900', marginBottom: 3 },
  noteText: { fontSize: 12, color: THEME.text, lineHeight: 17 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 19 },
});
