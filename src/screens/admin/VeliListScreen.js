// ============================================================
// YUMURCAK — VeliListScreen.js
// Veli listesi
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function VeliListScreen() {
  const navigation = useNavigation();
  const [veliler, setVeliler] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref_ = ref(database, 'kullanicilar');
    const unsub = onValue(ref_, (snap) => {
      const data = snap.val();
      if (data) {
        const liste = Object.entries(data)
          .filter(([_, v]) => v.rol === 'veli')
          .map(([id, v]) => ({ id, ...v }));
        setVeliler(liste);
      } else {
        setVeliler([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#3C3489" /></View>;
  }

  return (
    <View style={s.container}>
      {veliler.length === 0 ? (
        <View style={s.bos}>
          <Text style={s.bosYazi}>Henüz veli eklenmemiş</Text>
        </View>
      ) : (
        <FlatList
          data={veliler}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.liste}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.kart}
              onPress={() => navigation.navigate('VeliForm', { veliId: item.id })}
            >
              <Text style={s.ad}>{item.ad}</Text>
              <Text style={s.kullaniciAdi}>@{item.kullaniciAdi}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('VeliForm')}>
        <Text style={s.fabYazi}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  liste: { padding: 16 },
  kart: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  ad: { fontSize: 17, fontWeight: '600', color: '#333' },
  kullaniciAdi: { fontSize: 14, color: '#3C3489', marginTop: 4 },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosYazi: { color: '#888', fontSize: 16 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3C3489', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabYazi: { fontSize: 32, color: '#fff', fontWeight: '300', lineHeight: 36 },
});
