import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { db } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function ChildListScreen() {
  const navigation = useNavigation();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const childrenRef = ref(db, 'cocuklar');
    const unsubscribe = onValue(childrenRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const childrenArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setChildren(childrenArray);
      } else {
        setChildren([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ChildForm', { childId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.childName}>{item.name}</Text>
        <Text style={styles.birthDate}>{item.birthDate}</Text>
      </View>
      <Text style={styles.className}>Sınıf: {item.sinifId || 'Belirtilmemiş'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#712B13" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {children.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Henüz çocuk eklenmemiş</Text>
          <Text style={styles.emptySubtext}>İlk çocuğu ekleyerek başla!</Text>
        </View>
      ) : (
        <FlatList
          data={children}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ChildForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  birthDate: {
    fontSize: 14,
    color: '#712B13',
    fontWeight: '500',
  },
  className: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#712B13',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
  },
});
