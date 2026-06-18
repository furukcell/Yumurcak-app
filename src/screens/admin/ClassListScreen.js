// ============================================================
// YUMURCAK — ClassListScreen.js
// Sınıf listesi ve yönetimi
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function ClassListScreen() {
  const navigation = useNavigation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const classesRef = ref(database, 'siniflar');
    const unsubscribe = onValue(classesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const classesArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setClasses(classesArray);
      } else {
        setClasses([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ClassForm', { classId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.className}>{item.ad}</Text>
        <Text style={styles.ageGroup}>{item.yasGrubu || '-'}</Text>
      </View>
      <Text style={styles.teacherCount}>
        {item.ogretmenIds?.length || 0} Öğretmen
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3C3489" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {classes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Henüz sınıf eklenmemiş</Text>
          <Text style={styles.emptySubtext}>İlk sınıfını ekleyerek başla!</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ClassForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  className: { fontSize: 18, fontWeight: '600', color: '#333' },
  ageGroup: { fontSize: 14, color: '#0C447C', fontWeight: '500' },
  teacherCount: { fontSize: 14, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3C3489', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300', lineHeight: 32 },
});
