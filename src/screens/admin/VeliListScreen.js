// ============================================================
// YUMURCAK — VeliListScreen.js
// FAZ 2: Profesyonel veli listesi arayüzü
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
  primary: '#3C3489',
  primaryDark: '#28215F',
  primarySoft: '#EEEAFE',
  green: '#20B45B',
  orange: '#FF9F1C',
  blue: '#3A7BFF',
  red: '#FF4D6D',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

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
          const bagliCocuklar = Object.entries(cocuklar)
            .filter(([, c]) => c.veliIds && c.veliIds.includes(id))
            .map(([cocukId, c]) => {
              const sinif = c.sinifId ? siniflar[c.sinifId] : null;
              return {
                id: cocukId,
                ad: `${c.ad || ''} ${c.soyad || ''}`.trim() || '-',
                sinifAd: sinif ? sinif.ad : c.sinifId || null,
              };
            });

          return {
            id,
            ad: `${v.ad || ''} ${v.soyad || ''}`.trim() || v.kullaniciAdi || id,
            kullaniciAdi: v.kullaniciAdi || '-',
            telefon: v.telefon || null,
            email: v.email || v.eposta || null,
            aktif: v.aktif !== false,
            cocuklar: bagliCocuklar,
          };
        })
        .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

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

  const aktifVeliSayisi = veliler.filter((v) => v.aktif).length;
  const cocukBagliVeliSayisi = veliler.filter((v) => v.cocuklar.length > 0).length;

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={s.loadingText}>Veliler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <FlatList
          data={veliler}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.liste}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.headerCard}>
              <View style={s.headerTop}>
                <View style={s.headerIconBox}>
                  <Text style={s.headerIcon}>👨‍👩‍👧</Text>
                </View>
                <View style={s.headerTextBlock}>
                  <Text style={s.headerTitle}>Veliler</Text>
                  <Text style={s.headerSubtitle}>Veli hesapları ve bağlı çocuklar</Text>
                </View>
              </View>

              <View style={s.statsRow}>
                <View style={s.statBox}>
                  <Text style={s.statValue}>{veliler.length}</Text>
                  <Text style={s.statLabel}>Toplam Veli</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statBox}>
                  <Text style={s.statValue}>{aktifVeliSayisi}</Text>
                  <Text style={s.statLabel}>Aktif</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statBox}>
                  <Text style={s.statValue}>{cocukBagliVeliSayisi}</Text>
                  <Text style={s.statLabel}>Çocuk Bağlı</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}>👨‍👩‍👧</Text>
              <Text style={s.emptyTitle}>Henüz veli eklenmemiş</Text>
              <Text style={s.emptyDesc}>Velileri ekleyerek çocuklarla ilişkilendirebilirsiniz.</Text>
              <TouchableOpacity
                style={s.emptyButton}
                onPress={() => navigation.navigate('VeliForm')}
                activeOpacity={0.85}
              >
                <Text style={s.emptyButtonText}>+ Veli Ekle</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.kart}
              onPress={() => navigation.navigate('VeliForm', { veliId: item.id })}
              activeOpacity={0.86}
            >
              <View style={s.cardTop}>
                <View style={s.avatarBox}>
                  <Text style={s.avatarText}>{getInitials(item.ad)}</Text>
                </View>

                <View style={s.cardTitleBlock}>
                  <Text style={s.ad} numberOfLines={1} ellipsizeMode="tail">
                    {item.ad}
                  </Text>
                  <Text style={s.kullaniciAdi} numberOfLines={1} ellipsizeMode="tail">
                    @{item.kullaniciAdi}
                  </Text>
                </View>

                <View style={[s.statusPill, item.aktif ? s.statusActive : s.statusPassive]}>
                  <Text style={[s.statusText, item.aktif ? s.statusTextActive : s.statusTextPassive]}>
                    {item.aktif ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>

              <View style={s.infoGrid}>
                <InfoItem icon="📞" label="Telefon" value={item.telefon || '-'} />
                <InfoItem icon="✉️" label="E-posta" value={item.email || '-'} />
              </View>

              <View style={s.childrenBox}>
                <View style={s.childrenHeader}>
                  <Text style={s.childrenTitle}>Bağlı Çocuklar</Text>
                  <Text style={s.childrenCount}>{item.cocuklar.length}</Text>
                </View>

                {item.cocuklar.length === 0 ? (
                  <Text style={s.noChild}>👶 Bağlı çocuk yok</Text>
                ) : (
                  item.cocuklar.slice(0, 3).map((c) => (
                    <View key={c.id} style={s.childRow}>
                      <Text style={s.childName} numberOfLines={1} ellipsizeMode="tail">
                        👶 {c.ad}
                      </Text>
                      <Text style={s.className} numberOfLines={1} ellipsizeMode="tail">
                        🏫 {c.sinifAd || 'Sınıf yok'}
                      </Text>
                    </View>
                  ))
                )}

                {item.cocuklar.length > 3 ? (
                  <Text style={s.moreText}>+{item.cocuklar.length - 3} çocuk daha</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('VeliForm')} activeOpacity={0.85}>
          <Text style={s.fabYazi}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <View style={s.infoItem}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={s.infoTextBlock}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={1} ellipsizeMode="tail">
          {value}
        </Text>
      </View>
    </View>
  );
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase('tr-TR');
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase('tr-TR');
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '700' },
  liste: { padding: 16, paddingBottom: 112 },

  headerCard: {
    backgroundColor: THEME.primary,
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 7,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIcon: { fontSize: 28 },
  headerTextBlock: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', marginTop: 3, fontWeight: '700' },
  statsRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.76)', fontSize: 12, fontWeight: '800', marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.2)' },

  kart: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#2D245F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: THEME.primary, fontSize: 17, fontWeight: '900' },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  ad: { fontSize: 17, fontWeight: '900', color: THEME.text },
  kullaniciAdi: { fontSize: 13, color: THEME.primary, marginTop: 2, fontWeight: '800' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginLeft: 8 },
  statusActive: { backgroundColor: '#E8F9EF' },
  statusPassive: { backgroundColor: '#FFE8EC' },
  statusText: { fontSize: 11, fontWeight: '900' },
  statusTextActive: { color: THEME.green },
  statusTextPassive: { color: THEME.red },

  infoGrid: { marginTop: 14, gap: 8 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FF',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  infoIcon: { fontSize: 16, marginRight: 9 },
  infoTextBlock: { flex: 1, minWidth: 0 },
  infoLabel: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  infoValue: { color: THEME.text, fontSize: 13, fontWeight: '800', marginTop: 1 },

  childrenBox: { marginTop: 12, backgroundColor: '#F9FBFF', borderRadius: 16, padding: 12 },
  childrenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  childrenTitle: { color: THEME.text, fontSize: 13, fontWeight: '900' },
  childrenCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primarySoft,
    color: THEME.primary,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '900',
    overflow: 'hidden',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  childName: { flex: 1, minWidth: 0, color: THEME.text, fontSize: 13, fontWeight: '800' },
  className: { maxWidth: '45%', color: THEME.primary, fontSize: 12, fontWeight: '800' },
  noChild: { color: THEME.muted, fontSize: 13, fontWeight: '700' },
  moreText: { color: THEME.primary, fontSize: 12, fontWeight: '900', marginTop: 6 },

  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  emptyDesc: { color: THEME.muted, textAlign: 'center', lineHeight: 20, marginTop: 6, fontWeight: '600' },
  emptyButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, marginTop: 16 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '900' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 7,
  },
  fabYazi: { fontSize: 34, color: '#FFFFFF', fontWeight: '300', lineHeight: 38 },
});
