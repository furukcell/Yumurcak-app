// ============================================================
// YUMURCAK — EventListScreen.js
// Etkinlik listesi — çoklu sınıf desteğiyle
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  red: '#FF4D6D',
  muted: '#707386',
  text: '#191A23',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function EventListScreen() {
  const navigation = useNavigation();
  const { kres, kullanici } = useAuth();
  const kresId = kres?.id || kullanici?.kresId;
  const [etkinlikler, setEtkinlikler] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kresId) {
      setEtkinlikler([]);
      setLoading(false);
      return undefined;
    }

    let etkinlikData = {};
    let sinifData = {};
    let etkinlikLoaded = false;
    let sinifLoaded = false;

    function build() {
      if (!etkinlikLoaded || !sinifLoaded) return;

      const liste = Object.entries(etkinlikData).map(([id, e]) => {
        const sinifAdlari = (e.sinifIds || [])
          .map((sid) => sinifData[sid]?.ad)
          .filter(Boolean);

        return {
          id,
          baslik: e.baslik || 'İsimsiz Etkinlik',
          tarih: e.tarih || null,
          saat: e.saat || null,
          aciklama: e.aciklama || null,
          aktif: e.aktif !== false,
          sinifAdlari,
        };
      });

      liste.sort((a, b) => {
        if (!a.tarih) return 1;
        if (!b.tarih) return -1;
        return a.tarih.localeCompare(b.tarih);
      });

      setEtkinlikler(liste);
      setLoading(false);
    }

    const etkinlikUnsub = onValue(
      query(ref(database, 'etkinlikler'), orderByChild('kresId'), equalTo(kresId)),
      (snap) => {
        etkinlikData = snap.val() || {};
        etkinlikLoaded = true;
        build();
      },
      (error) => {
        console.warn('Etkinlikler okunamadı:', error);
        etkinlikLoaded = true;
        build();
      }
    );

    const sinifUnsub = onValue(
      query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId)),
      (snap) => {
        sinifData = snap.val() || {};
        sinifLoaded = true;
        build();
      },
      (error) => {
        console.warn('Sınıflar okunamadı:', error);
        sinifLoaded = true;
        build();
      }
    );

    return () => {
      etkinlikUnsub();
      sinifUnsub();
    };
  }, [kresId]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EventForm', { etkinlikId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.baslik}>{item.baslik}</Text>
        <View style={[
          styles.badge,
          { backgroundColor: item.aktif ? '#E8F9EF' : '#FFE8EC' }
        ]}>
          <Text style={[
            styles.badgeText,
            { color: item.aktif ? THEME.green : THEME.red }
          ]}>
            {item.aktif ? 'Aktif' : 'Pasif'}
          </Text>
        </View>
      </View>

      <Text style={styles.satir}>
        📅 {item.tarih ?? '-'} {item.saat ? `· ${item.saat}` : ''}
      </Text>

      <Text style={styles.satir}>
        🏫 {item.sinifAdlari.length > 0 ? item.sinifAdlari.join(', ') : 'Sınıf seçilmemiş'}
      </Text>

      {item.aciklama ? (
        <Text style={styles.aciklama} numberOfLines={2}>{item.aciklama}</Text>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {etkinlikler.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Henüz etkinlik eklenmemiş</Text>
            <Text style={styles.emptySubtext}>İlk etkinliği ekleyerek başla!</Text>
          </View>
        ) : (
          <FlatList
            data={etkinlikler}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EventForm')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: THEME.card, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  baslik: { fontSize: 16, fontWeight: '800', color: THEME.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  satir: { fontSize: 13, color: '#555', marginTop: 4 },
  aciklama: { fontSize: 12, color: THEME.muted, marginTop: 8, lineHeight: 17 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: THEME.muted },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: THEME.primary,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
    shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 10,
  },
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300', lineHeight: 32 },
});
