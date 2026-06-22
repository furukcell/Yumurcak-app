// ============================================================
// YUMURCAK — ChildListScreen.js
// FAZ 2: Çocuk listesi modern kart arayüzü
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  orange: '#FF9F1C',
  orangeSoft: '#FFF6E8',
  green: '#20B45B',
  greenSoft: '#E8F9EF',
  blue: '#3A7BFF',
  blueSoft: '#EEF4FF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

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

      const liste = Object.entries(cocuklar)
        .map(([id, c]) => {
          const sinif = c.sinifId ? siniflar[c.sinifId] : null;

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
        })
        .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

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

  const renderItem = ({ item }) => {
    const veliText = item.veliler.length > 0
      ? item.veliler.map((v) => v.ad).join(', ')
      : 'Veli bağlı değil';

    const telefonText = item.veliler.length > 0
      ? item.veliler.map((v) => v.telefon || '-').join(' / ')
      : '-';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ChildDetail', { childId: item.id })}
        activeOpacity={0.84}
      >
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👶</Text>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.childName} numberOfLines={1} ellipsizeMode="tail">
              {item.ad}
            </Text>
            <Text style={styles.classText} numberOfLines={1} ellipsizeMode="tail">
              🏫 {item.sinifAd ?? 'Sınıf belirtilmemiş'}
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={[styles.infoPill, styles.infoPillBlue]}>
            <Text style={styles.infoLabel}>Doğum</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.dogumTarihi || 'Belirtilmemiş'}
            </Text>
          </View>

          <View style={[styles.infoPill, styles.infoPillGreen]}>
            <Text style={styles.infoLabel}>Öğretmen</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
              {item.ogretmenAd || 'Atanmamış'}
            </Text>
          </View>
        </View>

        <View style={styles.parentBox}>
          <Text style={styles.parentLabel}>👨‍👩‍👧 Veli Bilgisi</Text>
          <Text style={styles.parentName} numberOfLines={2} ellipsizeMode="tail">
            {veliText}
          </Text>
          <Text style={styles.parentPhone} numberOfLines={1} ellipsizeMode="tail">
            📞 {telefonText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Çocuk listesi yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>Çocuklar</Text>
            <Text style={styles.headerSub}>{children.length} kayıtlı çocuk</Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🌈</Text>
          </View>
        </View>

        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={styles.emptyText}>Henüz çocuk eklenmemiş</Text>
            <Text style={styles.emptySubtext}>İlk çocuğu ekleyerek sınıf ve veli takibini başlat.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('ChildForm')}
              activeOpacity={0.84}
            >
              <Text style={styles.emptyBtnText}>+ Çocuk Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={children}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ChildForm')}
          activeOpacity={0.86}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },

  headerCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 18,
    borderRadius: 24,
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '800' },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 28 },

  list: { padding: 16, paddingBottom: 108 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#3B235C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 27 },
  titleBlock: { flex: 1, minWidth: 0 },
  childName: { fontSize: 18, fontWeight: '900', color: THEME.text },
  classText: { fontSize: 13, color: THEME.muted, fontWeight: '700', marginTop: 4 },
  arrow: { fontSize: 34, fontWeight: '900', color: THEME.primary, marginLeft: 8 },

  infoGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  infoPill: { flex: 1, minWidth: 0, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  infoPillBlue: { backgroundColor: THEME.blueSoft },
  infoPillGreen: { backgroundColor: THEME.greenSoft },
  infoLabel: { fontSize: 11, color: THEME.muted, fontWeight: '800', marginBottom: 3 },
  infoValue: { fontSize: 13, color: THEME.text, fontWeight: '900' },

  parentBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FAFAFF',
    borderWidth: 1,
    borderColor: '#F0ECFA',
  },
  parentLabel: { fontSize: 12, color: THEME.muted, fontWeight: '900', marginBottom: 5 },
  parentName: { fontSize: 14, color: THEME.text, fontWeight: '800', lineHeight: 19 },
  parentPhone: { fontSize: 13, color: THEME.muted, fontWeight: '700', marginTop: 4 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 34 },
  emptyIcon: { fontSize: 58, marginBottom: 12 },
  emptyText: { fontSize: 21, fontWeight: '900', color: THEME.text, marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
  emptyBtn: { marginTop: 20, backgroundColor: THEME.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 7,
  },
  fabText: { fontSize: 34, color: '#fff', fontWeight: '500', lineHeight: 36 },
});
