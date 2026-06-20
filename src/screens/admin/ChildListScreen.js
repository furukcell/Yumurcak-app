// ============================================================
// YUMURCAK — ChildListScreen.js
// Çocuk listesi — sınıf, veli, telefon, öğretmen bilgisiyle
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function ChildListScreen() {
  const navigation = useNavigation();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cocuklar = {};
    let siniflar = {};
    let kullanicilar = {};
    let cocukLoaded = false;
    let sinifLoaded = false;
    let kulLoaded = false;

    function buildList() {
      if (!cocukLoaded || !sinifLoaded || !kulLoaded) return;

      const liste = Object.entries(cocuklar).map(([id, c]) => {
        // Sınıf
        const sinif = c.sinifId ? siniflar[c.sinifId] : null;

        // Veliler
        const veliBilgileri = c.veliIds
          ? c.veliIds
              .filter((vid) => kullanicilar[vid])
              .map((vid) => {
                const v = kullanicilar[vid];
                return {
                  ad: `${v.ad || ''} ${v.soyad || ''}`.trim() || v.kullaniciAdi || vid,
                  telefon: v.telefon || null,
                };
              })
          : [];

        // Öğretmen — sinifın ogretmenIds'inden ilkini al
        let ogretmenAd = null;
        if (sinif && sinif.ogretmenIds && sinif.ogretmenIds.length > 0) {
          const ogId = sinif.ogretmenIds[0];
          const og = kullanicilar[ogId];
          if (og) {
            ogretmenAd = `${og.ad || ''} ${og.soyad || ''}`.trim() || og.kullaniciAdi || null;
          }
        }

        return {
          id,
          ad: `${c.ad || ''} ${c.soyad || ''}`.trim() || c.ad || id,
          dogumTarihi: c.dogumTarihi || null,
          sinifAd: sinif ? sinif.ad : c.sinifId || null,
          veliler: veliBilgileri,
          ogretmenAd,
        };
      });

      setChildren(liste);
      setLoading(false);
    }

    const cocukUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      cocuklar = snap.val() || {};
      cocukLoaded = true;
      buildList();
    });

    const sinifUnsub = onValue(ref(database, 'siniflar'), (snap) => {
      siniflar = snap.val() || {};
      sinifLoaded = true;
      buildList();
    });

    const kulUnsub = onValue(ref(database, 'kullanicilar'), (snap) => {
      kullanicilar = snap.val() || {};
      kulLoaded = true;
      buildList();
    });

    return () => {
      cocukUnsub();
      sinifUnsub();
      kulUnsub();
    };
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ChildForm', { childId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.childName}>{item.ad}</Text>
        {item.dogumTarihi ? (
          <Text style={styles.birthDate}>{item.dogumTarihi}</Text>
        ) : null}
      </View>

      <Text style={styles.satir}>
        🏫 {item.sinifAd ?? 'Sınıf belirtilmemiş'}
      </Text>

      {item.veliler.length === 0 ? (
        <Text style={styles.satir}>👨‍👩‍👧 Veli bağlı değil</Text>
      ) : (
        item.veliler.map((v, i) => (
          <View key={i}>
            <Text style={styles.satir}>👨‍👩‍👧 {v.ad}</Text>
            <Text style={styles.altSatir}>📞 {v.telefon ?? '-'}</Text>
          </View>
        ))
      )}

      {item.ogretmenAd ? (
        <Text style={styles.satir}>👨‍🏫 {item.ogretmenAd}</Text>
      ) : null}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  childName: { fontSize: 17, fontWeight: '700', color: '#191A23' },
  birthDate: { fontSize: 13, color: '#712B13', fontWeight: '500' },
  satir: { fontSize: 13, color: '#555', marginTop: 4 },
  altSatir: { fontSize: 12, color: '#888', marginLeft: 20, marginTop: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#712B13',
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300', lineHeight: 32 },
});
