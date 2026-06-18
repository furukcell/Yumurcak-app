// ============================================================
// YUMURCAK — ParentDashboard.js
// Veli ana ekranı — kendi çocuklarını gösterir
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function ParentDashboardScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const parentId = kullanici?.uid;

  useEffect(() => {
    if (!parentId) return;

    const childrenRef = ref(database, 'cocuklar');
    const unsubscribe = onValue(childrenRef, (snapshot) => {
      const data = snapshot.val();
      const myChildren = [];

      if (data) {
        Object.entries(data).forEach(([id, childData]) => {
          // Eğer bu çocuğun veli listesinde giriş yapan kullanıcının ID'si varsa
          if (childData.veliIds?.includes(parentId)) {
            myChildren.push({ id, ...childData });
          }
        });
      }

      setChildren(myChildren);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [parentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27500A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {children.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sisteme kayıtlı çocuğun bulunmuyor.</Text>
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
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#27500A',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childName: { fontSize: 18, fontWeight: '600', color: '#333' },
  birthDate: { fontSize: 14, color: '#666', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 16 },
});
