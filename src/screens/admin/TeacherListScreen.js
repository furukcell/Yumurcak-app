// ============================================================
// YUMURCAK — TeacherListScreen.js
// FAZ 19: Sadece kendi kreşinin öğretmenleri index üzerinden çekilir
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
import { ref, onValue, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
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

export default function TeacherListScreen() {
  const navigation = useNavigation();
  const { kullanici, kres } = useAuth();
  const kresId = kres?.id || kullanici?.kresId;

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kresId) {
      setTeachers([]);
      setLoading(false);
      return;
    }

    const ogretmenIndexRef = ref(database, `kresKullanicilari/${kresId}/ogretmenler`);
    const sinifIndexRef = ref(database, `kresSiniflari/${kresId}`);

    let ogretmenIds = [];
    let sinifIds = [];
    let ogretmenLoaded = false;
    let sinifLoaded = false;

    async function buildList() {
      if (!ogretmenLoaded || !sinifLoaded) return;

      try {
        const sinifResults = await Promise.all(
          sinifIds.map((id) =>
            get(ref(database, `siniflar/${id}`)).then((s) =>
              s.exists() ? { id, ...s.val() } : null
            )
          )
        );
        const sinifListesi = sinifResults.filter(Boolean);

        const ogretmenResults = await Promise.all(
          ogretmenIds.map((id) =>
            get(ref(database, `kullanicilar/${id}`)).then((s) =>
              s.exists() ? [id, s.val()] : null
            )
          )
        );
        const kullanicilarMap = Object.fromEntries(ogretmenResults.filter(Boolean));

        const ogretmenler = ogretmenIds
          .filter((id) => kullanicilarMap[id])
          .map((id) => {
            const u = kullanicilarMap[id];

            const atanmisSiniflar = sinifListesi.filter(
              (s) => Array.isArray(s.ogretmenIds) && s.ogretmenIds.includes(id)
            );

            const adSoyad = `${u.ad || ''} ${u.soyad || ''}`.trim();
            const sinifAdlari = atanmisSiniflar.map((s) => s.ad).filter(Boolean);

            return {
              id,
              ad: adSoyad || u.kullaniciAdi || 'İsimsiz öğretmen',
              kullaniciAdi: u.kullaniciAdi || '-',
              telefon: u.telefon || u.tel || '-',
              email: u.email || '-',
              aktif: u.aktif !== false,
              sinifAdlari,
              sinifSayisi: sinifAdlari.length,
            };
          })
          .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

        setTeachers(ogretmenler);
        setLoading(false);
      } catch (error) {
        console.warn('Öğretmen listesi çekme hatası:', error);
        setTeachers([]);
        setLoading(false);
      }
    }

    const ogretmenUnsub = onValue(ogretmenIndexRef, (snap) => {
      const data = snap.val();
      ogretmenIds = data ? Object.keys(data) : [];
      ogretmenLoaded = true;
      buildList();
    });

    const sinifUnsub = onValue(sinifIndexRef, (snap) => {
      const data = snap.val();
      sinifIds = data ? Object.keys(data) : [];
      sinifLoaded = true;
      buildList();
    });

    return () => {
      ogretmenUnsub();
      sinifUnsub();
    };
  }, [kresId]);

  const aktifSayisi = teachers.filter((t) => t.aktif).length;
  const atanmisSayisi = teachers.filter((t) => t.sinifSayisi > 0).length;

  const renderItem = ({ item }) => {
    const sinifMetni = item.sinifAdlari.length > 0
      ? item.sinifAdlari.join(', ')
      : 'Sınıf atanmamış';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TeacherForm', { teacherId: item.id })}
        activeOpacity={0.84}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👨‍🏫</Text>
          </View>

          <View style={styles.cardTitleBlock}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {item.ad}
            </Text>
            <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
              @{item.kullaniciAdi}
            </Text>
          </View>

          <View style={[styles.statusBadge, item.aktif ? styles.statusActive : styles.statusPassive]}>
            <Text style={[styles.statusText, item.aktif ? styles.statusTextActive : styles.statusTextPassive]}>
              {item.aktif ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏫</Text>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Sınıf</Text>
              <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">
                {sinifMetni}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📞</Text>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                {item.telefon}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
            {item.email !== '-' ? item.email : 'E-posta bilgisi yok'}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Öğretmenler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>Öğretmenler</Text>
            <Text style={styles.headerSub}>
              {teachers.length} öğretmen · {aktifSayisi} aktif · {atanmisSayisi} sınıfa atanmış
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>👨‍🏫</Text>
          </View>
        </View>

        {teachers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>👨‍🏫</Text>
            <Text style={styles.emptyTitle}>Henüz kayıtlı öğretmen yok</Text>
            <Text style={styles.emptyDesc}>
              Öğretmen hesabı ekleyerek sınıf ataması yapabilirsiniz.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('TeacherForm')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>+ Öğretmen Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={teachers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('TeacherForm')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },

  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: '700',
  },

  headerCard: {
    backgroundColor: THEME.primary,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },

  headerSub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 245,
    lineHeight: 18,
  },

  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    fontSize: 30,
  },

  list: {
    paddingBottom: 110,
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    fontSize: 24,
  },

  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.text,
  },

  username: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },

  statusActive: {
    backgroundColor: '#E8F9EF',
  },

  statusPassive: {
    backgroundColor: '#FFE8EC',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },

  statusTextActive: {
    color: THEME.green,
  },

  statusTextPassive: {
    color: THEME.red,
  },

  infoBox: {
    backgroundColor: '#FAFAFF',
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },

  infoTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  infoLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  infoValue: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 19,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  footerText: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },

  arrow: {
    color: THEME.primary,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 30,
  },

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },

  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyDesc: {
    color: THEME.muted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  emptyButton: {
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 18,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },

  fabText: {
    fontSize: 34,
    color: '#FFFFFF',
    lineHeight: 38,
    fontWeight: '800',
  },
});
