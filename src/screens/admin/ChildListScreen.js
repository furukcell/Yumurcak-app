// ============================================================
// YUMURCAK — ChildListScreen.js
// FAZ 19: Sadece kendi kreşinin verisi index üzerinden çekilir
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
import { calculateChildAge, formatChildBirthDate, getChildBirthDate } from '../../utils/childDates';

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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

export default function ChildListScreen() {
  const navigation = useNavigation();
  const { kullanici, kres } = useAuth();
  const kresId = kres?.id || kullanici?.kresId;

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kresId) {
      setChildren([]);
      setLoading(false);
      return;
    }

    const cocukIndexRef = ref(database, `kresCocuklari/${kresId}`);

    const unsubscribe = onValue(cocukIndexRef, async (snapshot) => {
      const idsData = snapshot.val();

      if (!idsData) {
        setChildren([]);
        setLoading(false);
        return;
      }

      try {
        const cocukIds = Object.keys(idsData);

        // ── Çocukları çek ──────────────────────────────────
        const cocukResults = await Promise.all(
          cocukIds.map((id) =>
            get(ref(database, `cocuklar/${id}`)).then((s) =>
              s.exists() ? { id, ...s.val() } : null
            )
          )
        );
        const cocuklarArr = cocukResults.filter(Boolean);

        // ── Bu çocukların bağlı olduğu sınıf ve veli ID'lerini topla ─
        const sinifIdSet = new Set();
        const veliIdSet = new Set();
        cocuklarArr.forEach((c) => {
          if (c.sinifId) sinifIdSet.add(c.sinifId);
          asArray(c.veliIds).forEach((vid) => vid && veliIdSet.add(vid));
        });

        // ── Sınıfları çek ──────────────────────────────────
        const sinifResults = await Promise.all(
          Array.from(sinifIdSet).map((id) =>
            get(ref(database, `siniflar/${id}`)).then((s) =>
              s.exists() ? [id, s.val()] : null
            )
          )
        );
        const siniflarMap = Object.fromEntries(sinifResults.filter(Boolean));

        // ── Sınıflardaki öğretmen ID'lerini de topla ───────
        Object.values(siniflarMap).forEach((sinif) => {
          asArray(sinif.ogretmenIds).forEach((oid) => oid && veliIdSet.add(oid));
        });

        // ── Veli + öğretmen kullanıcılarını çek ────────────
        const kullaniciResults = await Promise.all(
          Array.from(veliIdSet).map((id) =>
            get(ref(database, `kullanicilar/${id}`)).then((s) =>
              s.exists() ? [id, s.val()] : null
            )
          )
        );
        const kullanicilarMap = Object.fromEntries(kullaniciResults.filter(Boolean));

        // ── Listeyi kur ─────────────────────────────────────
        const liste = cocuklarArr
          .map((c) => {
            const sinif = c.sinifId ? siniflarMap[c.sinifId] : null;
            const birthDate = getChildBirthDate(c);

            const veliBilgileri = asArray(c.veliIds)
              .filter((vid) => kullanicilarMap[vid])
              .map((vid) => {
                const v = kullanicilarMap[vid];
                return {
                  ad: `${v.ad || ''} ${v.soyad || ''}`.trim() || v.kullaniciAdi || vid,
                  telefon: v.telefon || null,
                };
              });

            let ogretmenAd = null;
            const ogretmenIds = sinif ? asArray(sinif.ogretmenIds) : [];
            if (ogretmenIds.length > 0) {
              const og = kullanicilarMap[ogretmenIds[0]];
              if (og) {
                ogretmenAd = `${og.ad || ''} ${og.soyad || ''}`.trim() || og.kullaniciAdi || null;
              }
            }

            return {
              id: c.id,
              ad: `${c.ad || ''} ${c.soyad || ''}`.trim() || c.ad || c.id,
              dogumTarihi: birthDate,
              yas: calculateChildAge(birthDate),
              sinifAd: sinif ? sinif.ad : c.sinifId || null,
              veliler: veliBilgileri,
              ogretmenAd,
            };
          })
          .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

        setChildren(liste);
        setLoading(false);
      } catch (error) {
        console.warn('Çocuk listesi çekme hatası:', error);
        setChildren([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [kresId]);

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
              🏫 {item.sinifAd ?? 'Sınıf belirtilmemiş'} {item.yas ? `• ${item.yas}` : ''}
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={[styles.infoPill, styles.infoPillBlue]}>
            <Text style={styles.infoLabel}>Doğum</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {formatChildBirthDate(item.dogumTarihi)}
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
          <Text style={styles.parentLabel}>Veli Bilgisi</Text>
          <Text style={styles.parentName} numberOfLines={2} ellipsizeMode="tail">
            {veliText}
          </Text>
          <Text style={styles.parentPhone} numberOfLines={1} ellipsizeMode="tail">
            Tel: {telefonText}
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
            <Text style={styles.emptySubtext}>İlk kaydı ekleyerek sınıf ve veli takibini başlat.</Text>
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
  headerCard: { marginHorizontal: 16, marginTop: 14, marginBottom: 6, padding: 18, borderRadius: 24, backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '800' },
  headerIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerIconText: { fontSize: 28 },
  list: { padding: 16, paddingBottom: 108 },
  card: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, shadowColor: '#3B235C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: THEME.orangeSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
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
  parentBox: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#FAFAFF', borderWidth: 1, borderColor: '#F0ECFA' },
  parentLabel: { fontSize: 12, color: THEME.muted, fontWeight: '900', marginBottom: 5 },
  parentName: { fontSize: 14, color: THEME.text, fontWeight: '800', lineHeight: 19 },
  parentPhone: { fontSize: 13, color: THEME.muted, fontWeight: '700', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 34 },
  emptyIcon: { fontSize: 58, marginBottom: 12 },
  emptyText: { fontSize: 21, fontWeight: '900', color: THEME.text, marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
  emptyBtn: { marginTop: 20, backgroundColor: THEME.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center', shadowColor: THEME.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 7 },
  fabText: { fontSize: 34, color: '#fff', fontWeight: '500', lineHeight: 36 },
});
