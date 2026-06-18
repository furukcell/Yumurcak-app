// ============================================================
// YUMURCAK — ChildReportScreen.js (PARENT)
// Veli günlük rapor görüntüleme
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute } from '@react-navigation/native';

export default function ChildReportScreen() {
  const route = useRoute();
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
        // Tarihe göre sırala (en yeni en üstte)
        childReports.sort((a, b) => b.tarih.localeCompare(a.tarih));
      }

      setReports(childReports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [child.id]);

  const getMoodIcon = (mood) => {
    if (mood === 'Mutlu') return '😊';
    if (mood === 'Neşeli') return '😄';
    if (mood === 'Normal') return '😐';
    if (mood === 'Üzgün') return '😢';
    if (mood === 'Yorgun') return '😴';
    if (mood === 'Hasta') return '🤒';
    if (mood === 'Sinirli') return '😠';
    if (mood === 'Heyecanlı') return '🥳';
    return '';
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{item.tarih}</Text>
        <Text style={styles.moodIcon}>{getMoodIcon(item.mood)}</Text>
      </View>
      <Text style={styles.section}>
        🍽️ Yemek: {item.yemek?.kahvalti ? '✅' : '❌'} Kahvaltı, {item.yemek?.ogle ? '✅' : '❌'} Öğle, {item.yemek?.araOgun ? '✅' : '❌'} İkindi
      </Text>
      <Text style={styles.section}>💤 Uyku: {item.uyku?.sure} Saat</Text>
      <Text style={styles.section}>🚽 Tuvalet: {item.tuvalet?.sayi} Kere</Text>
      
      {item.not ? (
        <Text style={styles.note}>📝 Not: {item.not}</Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27500A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Henüz rapor girilmemiş.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  date: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  moodIcon: { fontSize: 24 },
  section: { fontSize: 14, color: '#666', marginTop: 4 },
  note: { fontSize: 14, color: '#27500A', marginTop: 8, fontStyle: 'italic', fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 16 },
});
