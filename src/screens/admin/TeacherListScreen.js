// ============================================================
// YUMURCAK — TeacherListScreen.js
// Öğretmen listesi — ad/soyad, kullanıcı adı, sınıf bilgisiyle
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function TeacherListScreen() {
  const navigation = useNavigation();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let kullanicilar = {};
    let siniflar = {};
    let kulLoaded = false;
    let sinifLoaded = false;

    function buildList() {
      if (!kulLoaded || !sinifLoaded) return;

      // Sadece rol === 'ogretmen' olanlar
      const ogretmenler = Object.entries(kullanicilar)
        .filter(([, u]) => u.rol === 'ogretmen')
        .map(([id, u]) => {
          // Bu öğretmenin atandığı sınıfı bul
          const sinif = Object.values(siniflar).find(
            (s) => s.ogretmenIds && s.ogretmenIds.includes(id)
          );
          return {
            id,
            ad: `${u.ad || ''} ${u.soyad || ''}`.trim() || u.kullaniciAdi || id,
            kullaniciAdi: u.kullaniciAdi || '-',
            sinifAd: sinif ? sinif.ad : null,
          };
        });

      setTeachers(ogretmenler);
      setLoading(false);
    }

    const kulUnsub = onValue(ref(database, 'kullanicilar'), (snap) => {
      kullanicilar = snap.val() || {};
      kulLoaded = true;
      buildList();
    });

    const sinifUnsub = onValue(ref(database, 'siniflar'), (snap) => {
      siniflar = snap.val() || {};
      sinifLoaded = true;
      buildList();
    });

    return () => {
      kulUnsub();
      sinifUnsub();
    };
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TeacherForm', { teacherId: item.id })}
      activeOpacity={0.8}
    >
      <Text style={styles.name}>{item.ad}</Text>
      <Text style={styles.info}>👤 {item.kullaniciAdi}</Text>
      <Text style={styles.info}>
        🏫 {item.sinifAd ?? item.sinifId ?? 'Sınıf atanmamış'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C3DEB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {teachers.length === 0 ? (
        <Text style={styles.empty}>Henüz kayıtlı öğretmen yok.</Text>
      ) : (
        <FlatList
          data={teachers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* ── Sağ alt + butonu ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TeacherForm')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    marginBottom: 12, elevation: 2,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#191A23', marginBottom: 4 },
  info: { fontSize: 13, color: '#6C3DEB', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#6C3DEB',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#6C3DEB',
    shadowOpacity: 0.35, shadowRadius: 10,
  },
  fabText: { fontSize: 32, color: '#fff', lineHeight: 36, fontWeight: '700' },
});
