// ============================================================
// YUMURCAK — AnnouncementListScreen.js
// Duyuru listesi
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function AnnouncementListScreen() {
  const navigation = useNavigation();
  const { kres, kullanici } = useAuth();
  const kresId = kres?.id || kullanici?.kresId;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kresId) {
      setAnnouncements([]);
      setLoading(false);
      return undefined;
    }

    const announcementsRef = query(ref(database, 'duyurular'), orderByChild('kresId'), equalTo(kresId));
    const unsubscribe = onValue(
      announcementsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
          list.sort((a, b) => b.createdAt - a.createdAt);
          setAnnouncements(list);
        } else {
          setAnnouncements([]);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Duyurular okunamadı:', error);
        setAnnouncements([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kresId]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, item.priority === 'urgent' && styles.urgentCard]}
      onPress={() => navigation.navigate('AnnouncementForm', { announcementId: item.id })}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.msg} numberOfLines={2}>{item.message}</Text>
      <Text style={styles.date}>
        {item.senderName ? `${item.senderName} · ` : ''}
        {new Date(item.createdAt).toLocaleDateString('tr-TR')}
      </Text>
    </TouchableOpacity>
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
      <FlatList
        data={announcements}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AnnouncementForm')}
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
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#27500A',
  },
  urgentCard: { borderLeftColor: 'red', backgroundColor: '#fff0f0' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  msg: { color: '#666' },
  date: { color: '#999', fontSize: 12, marginTop: 8, textAlign: 'right' },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#27500A', justifyContent: 'center',
    alignItems: 'center', elevation: 4,
  },
  fabText: { fontSize: 30, color: '#fff' },
});
