// ============================================================
// YUMURCAK — LessonScheduleListScreen.js
// Sınıf bazlı haftalık ders programı listesi
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
  muted: '#707386',
  text: '#191A23',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function LessonScheduleListScreen() {
  const navigation = useNavigation();
  const { kres, kullanici } = useAuth();
  const kresId = kres?.id || kullanici?.kresId;
  const [siniflar, setSiniflar] = useState([]);
  const [programlar, setProgramlar] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kresId) {
      setSiniflar([]);
      setLoading(false);
      return undefined;
    }

    let sinifData = {};
    let programData = {};
    let sinifLoaded = false;
    let programLoaded = false;

    function build() {
      if (!sinifLoaded || !programLoaded) return;
      const liste = Object.entries(sinifData).map(([id, s]) => ({
        id,
        ad: s?.ad || 'İsimsiz Sınıf',
        yasGrubu: s?.yasGrubu || null,
        programVarMi: !!programData[id],
      }));
      setSiniflar(liste);
      setProgramlar(programData);
      setLoading(false);
    }

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

    const programUnsub = onValue(
      query(ref(database, 'dersProgramlari'), orderByChild('kresId'), equalTo(kresId)),
      (snap) => {
        programData = snap.val() || {};
        programLoaded = true;
        build();
      },
      (error) => {
        console.warn('Ders programları okunamadı:', error);
        programLoaded = true;
        build();
      }
    );

    return () => {
      sinifUnsub();
      programUnsub();
    };
  }, [kresId]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LessonScheduleForm', { sinifId: item.id, sinifAd: item.ad })}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.sinifAd}>🏫 {item.ad}</Text>
        {item.yasGrubu ? <Text style={styles.altSatir}>{item.yasGrubu}</Text> : null}
      </View>
      <View style={[
        styles.badge,
        { backgroundColor: item.programVarMi ? '#E8F9EF' : '#FFF6E8' }
      ]}>
        <Text style={[
          styles.badgeText,
          { color: item.programVarMi ? THEME.green : '#FF9F1C' }
        ]}>
          {item.programVarMi ? 'Program Var' : 'Program Yok'}
        </Text>
      </View>
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
        {siniflar.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Henüz sınıf eklenmemiş</Text>
            <Text style={styles.emptySubtext}>Önce Sınıflar ekranından sınıf oluşturmalısın</Text>
          </View>
        ) : (
          <FlatList
            data={siniflar}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: THEME.card, borderRadius: 18, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLeft: { flex: 1 },
  sinifAd: { fontSize: 15, fontWeight: '800', color: THEME.text, marginBottom: 4 },
  altSatir: { fontSize: 12, color: THEME.muted },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: THEME.muted, textAlign: 'center' },
});
