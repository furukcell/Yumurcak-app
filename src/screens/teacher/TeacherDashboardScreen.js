// ============================================================
// YUMURCAK — TeacherDashboardScreen.js
// Öğretmen ana ekranı — sınıfındaki çocukları gösterir
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboardScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const teacherId = kullanici?.uid;

  useEffect(() => {
    if (!teacherId) return;

    const classesRef = ref(database, 'siniflar');
    const unsubscribe = onValue(classesRef, (snapshot) => {
      const data = snapshot.val();
      let assignedClassId = null;

      if (data) {
        for (const [classId, classData] of Object.entries(data)) {
          if (classData.ogretmenIds?.includes(teacherId)) {
            assignedClassId = classId;
            break;
          }
        }
      }

      if (assignedClassId) {
        const childrenRef = ref(database, 'cocuklar');
        const childUnsub = onValue(childrenRef, (childSnap) => {
          const childData = childSnap.val();
          const classChildren = childData
            ? Object.entries(childData)
                .filter(([_, c]) => c.sinifId === assignedClassId)
                .map(([id, c]) => ({ id, ...c }))
            : [];
          setChildren(classChildren);
          setLoading(false);
        });
        return () => childUnsub();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teacherId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#633806" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {children.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sınıfında henüz çocuk tanımlanmamış.</Text>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ChildReport', { child: item })}
            >
              <Text style={styles.childName}>{item.ad}</Text>
              <Text style={styles.birthDate}>Doğum: {item.dogumTarihi}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 12, elevation: 2 },
  childName: { fontSize: 18, fontWeight: '600', color: '#333' },
  birthDate: { fontSize: 14, color: '#633806', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 16 },
});
