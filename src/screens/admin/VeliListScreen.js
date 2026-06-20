// ============================================================
// YUMURCAK — VeliListScreen.js
// Veli listesi — çocuk adı, sınıf, telefon bilgisiyle
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function VeliListScreen() {
  const navigation = useNavigation();
  const [veliler, setVeliler] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let kullanicilar = {};
    let cocuklar = {};
    let siniflar = {};
    let kulLoaded = false;
    let cocukLoaded = false;
    let sinifLoaded = false;

    function buildList() {
      if (!kulLoaded || !cocukLoaded || !sinifLoaded) return;

      const liste = Object.entries(kullanicilar)
        .filter(([, v]) => v.rol === 'veli')
        .map(([id, v]) => {
          // Bu veliye bağlı çocukları bul
          const bagliCocuklar = Object.values(cocuklar).filter(
            (c) => c.veliIds && c.veliIds.includes(id)
          );

          const cocukBilgileri = bagliCocuklar.map((c) => {
            const sinif = c.sinifId ? siniflar[c.sinifId] : null;
            return {
              ad: `${c.ad || ''} ${c.soyad || ''}`.trim() || '-',
              sinifAd: sinif ? sinif.ad : c.sinifId || null,
            };
          });

          return {
            id,
            ad: `${v.ad || ''} ${v.soyad || ''}`.trim() || v.kullaniciAdi || id,
            kullaniciAdi: v.kullaniciAdi || '-',
            telefon: v.telefon || null,
            cocuklar: cocukBilgileri,
          };
        });

      setVeliler(liste);
      setLoading(false);
    }

    const kulUnsub = onValue(ref(database, 'kullanicilar'), (snap) => {
      kullanicilar = snap.val() || {};
      kulLoaded = true;
      buildList();
    });

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

    return () => {
      kulUnsub();
      cocukUnsub();
      sinifUnsub();
    };
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
              activeOpacity={0.8}
            >
              <Text style={s.ad}>{item.ad}</Text>
              <Text style={s.kullaniciAdi}>@{item.kullaniciAdi}</Text>

              <Text style={s.satir}>
                📞 {item.telefon ?? '-'}
              </Text>

              {item.cocuklar.length === 0 ? (
                <Text style={s.satir}>👶 Bağlı çocuk yok</Text>
              ) : (
                item.cocuklar.map((c, i) => (
                  <View key={i} style={s.cocukSatir}>
                    <Text style={s.satir}>👶 {c.ad}'in velisi</Text>
                    {c.sinifAd ? (
                      <Text style={s.sinif}>🏫 {c.sinifAd}</Text>
                    ) : null}
                  </View>
                ))
              )}
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
  liste: { padding: 16, paddingBottom: 100 },
  kart: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 2,
  },
  ad: { fontSize: 17, fontWeight: '700', color: '#191A23', marginBottom: 2 },
  kullaniciAdi: { fontSize: 13, color: '#3C3489', marginBottom: 6 },
  satir: { fontSize: 13, color: '#555', marginTop: 3 },
  cocukSatir: { marginTop: 4 },
  sinif: { fontSize: 12, color: '#3C3489', marginLeft: 18, marginTop: 1 },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosYazi: { color: '#888', fontSize: 16 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#3C3489',
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  fabYazi: { fontSize: 32, color: '#fff', fontWeight: '300', lineHeight: 36 },
});
