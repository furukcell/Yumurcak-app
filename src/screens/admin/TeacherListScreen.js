// ============================================================
// YUMURCAK — TeacherListScreen.js
// Öğretmen listesi
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function TeacherListScreen() {
  const navigation = useNavigation();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Şimdilik MVP için sınıfların içinden öğretmenleri çekiyoruz
    const classesRef = ref(database, 'siniflar');
    const unsubscribe = onValue(classesRef, (snapshot) => {
      const data = snapshot.val();
      let extractedTeachers = [];

      if (data) {
        Object.entries(data).forEach(([classId, classData]) => {
          if (classData.ogretmenIds) {
            classData.ogretmenIds.forEach((tId) => {
              extractedTeachers.push({
                id: tId,
                className: classData.ad,
                role: 'Öğretmen',
              });
            });
          }
        });

        // Tekilleştirme (aynı öğretmen 2 sınıfta olabilir)
        extractedTeachers = [...new Set(extractedTeachers.map((t) => t.id))].map((id) => {
          return extractedTeachers.find((t) => t.id === id);
        });
      }

      setTeachers(extractedTeachers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>Öğretmen ID: {item.id.substring(0, 8)}...</Text>
      <Text style={styles.info}>Atandığı Sınıf: {item.className}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#633806" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {teachers.length === 0 ? (
        <Text style={styles.empty}>Henüz atanmış öğretmen yok.</Text>
      ) : (
        <FlatList
          data={teachers}
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
  name: { fontSize: 16, fontWeight: '600', color: '#333' },
  info: { fontSize: 14, color: '#633806', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
});
