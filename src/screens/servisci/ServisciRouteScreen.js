// ============================================================
// YUMURCAK — ServisciRouteScreen.js
// Servis görevlisi için "günlük rota" ekranı. Gerçek görsel/pinli
// harita YOK (react-native-maps ücretli Google Maps API key
// gerektirdiği için bilinçli olarak eklenmedi) — bunun yerine:
//  - Sıradaki çocuk büyük "Hedef" kartında gösterilir
//  - Cihazın GPS konumu (expo-location) ile hedefin ev adresi
//    arasındaki kuş uçuşu mesafe hesaplanır (gerçek yol mesafesi
//    değil, yaklaşık bir gösterge)
//  - "Yol Tarifi Aç" butonu telefonun kendi harita uygulamasını
//    (Google/Apple Maps) gerçek dönüşlü yol tarifiyle açar
//  - Adresler ilk kullanımda cihaz üzerinde (ücretsiz) geocode
//    edilip cocuklar/{id}/adresKonum altında cache'lenir
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { ref, onValue, get, update, query, orderByChild, equalTo } from 'firebase/database';
import * as Location from 'expo-location';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../services/notificationCenter';

const THEME = {
  primary: '#3A7BFF',
  primaryDark: '#2A5FD6',
  primarySoft: '#E8F0FF',
  green: '#20B45B',
  greenSoft: '#E4F9EC',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  border: '#EAEFF8',
  warnBg: '#FFF4E0',
  warnText: '#8A5A00',
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getChildParentIds(child) {
  const raw = [...(Array.isArray(child?.veliIds) ? child.veliIds : []), child?.veliId, child?.parentId];
  return [...new Set(raw.filter(Boolean))];
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ServisciRouteScreen({ navigation }) {
  const route = useRoute();
  const { kullanici, kres } = useAuth();
  const userId = kullanici?.uid || kullanici?.id;
  const kresId = kullanici?.kresId;
  const dateKey = useMemo(() => todayKey(), []);
  const vehicleId = route.params?.vehicleId || null;

  const [mode, setMode] = useState('alindi'); // 'alindi' = sabah alma turu, 'birakildi' = akşam bırakma turu
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [children, setChildren] = useState([]);
  const [gunlukDurum, setGunlukDurum] = useState({});
  const [currentPos, setCurrentPos] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const watchSubRef = useRef(null);

  // Geri tuşu — bu ekranda normal davranış (bir önceki ekrana dön), sadece dashboard'da özel onay var.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  // Konum izni + takip
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocationDenied(true);
          return;
        }
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCurrentPos({ lat: initial.coords.latitude, lng: initial.coords.longitude });

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 6000, distanceInterval: 25 },
          (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        );
        watchSubRef.current = sub;
      } catch (error) {
        console.log('Konum alınamadı:', error);
        if (!cancelled) setLocationDenied(true);
      }
    })();

    return () => {
      cancelled = true;
      watchSubRef.current?.remove?.();
    };
  }, []);

  // Araç bilgisi
  useEffect(() => {
    if (!vehicleId) return undefined;
    const unsub = onValue(ref(database, `servisler/${vehicleId}`), (snap) => setVehicle(snap.val()));
    return () => unsub();
  }, [vehicleId]);

  // Çocuklar (+ veli telefon) + adresKonum yoksa geocode edip cache'le
  useEffect(() => {
    if (!vehicleId || !kresId) {
      setChildren([]);
      setLoading(false);
      return undefined;
    }

    const serviceQuery = query(ref(database, 'servisBilgileri'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(serviceQuery, async (snap) => {
      const data = snap.val() || {};
      const childIds = Object.entries(data)
        .filter(([, v]) => v?.servisKullaniyor && v?.servisId === vehicleId)
        .map(([childId]) => childId);

      if (childIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        childIds.map(async (id) => {
          const snapshot = await get(ref(database, `cocuklar/${id}`));
          if (!snapshot.exists()) return null;
          const childData = { id, ...snapshot.val() };
          const parentIds = getChildParentIds(childData);
          if (parentIds.length > 0) {
            try {
              const veliSnap = await get(ref(database, `kullanicilar/${parentIds[0]}`));
              if (veliSnap.exists()) childData.veliTelefon = veliSnap.val().telefon || '';
            } catch (error) {
              console.log('Veli bilgisi çekilemedi:', error);
            }
          }

          // Konum cache yoksa ve adres varsa, cihaz üzerinde geocode etmeyi dene (ücretsiz, izin gerektirir)
          if (!childData.adresKonum && childData.adres) {
            try {
              const geocoded = await Location.geocodeAsync(childData.adres);
              if (geocoded && geocoded.length > 0) {
                const konum = { lat: geocoded[0].latitude, lng: geocoded[0].longitude };
                childData.adresKonum = konum;
                update(ref(database, `cocuklar/${id}/adresKonum`), konum).catch((error) =>
                  console.log('Konum cache yazılamadı:', error)
                );
              }
            } catch (error) {
              console.log('Geocode başarısız:', childData.adres, error);
            }
          }

          return childData;
        })
      );

      const list = results.filter(Boolean).sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
      setChildren(list);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [vehicleId, kresId]);

  // Günlük durum
  useEffect(() => {
    if (!vehicleId) return undefined;
    const unsub = onValue(ref(database, `servisGunlukDurum/${dateKey}/${vehicleId}`), (snap) => {
      setGunlukDurum(snap.val() || {});
    });
    return () => unsub();
  }, [vehicleId, dateKey]);

  const durumMap = gunlukDurum.cocuklar || {};
  const kurumaVardiZaman = gunlukDurum.kurumaVardi?.zaman || null;

  const { tamamlananlar, kalanlar, hedef } = useMemo(() => {
    const list = mode === 'birakildi' ? children.filter((c) => durumMap[c.id]?.alindi) : children;
    const done = list.filter((c) => durumMap[c.id]?.[mode]);
    const remaining = list.filter((c) => !durumMap[c.id]?.[mode]);
    return { tamamlananlar: done, kalanlar: remaining, hedef: remaining[0] || null };
  }, [children, durumMap, mode]);

  const hedefMesafeKm = useMemo(() => {
    if (!hedef?.adresKonum || !currentPos) return null;
    return haversineKm(currentPos.lat, currentPos.lng, hedef.adresKonum.lat, hedef.adresKonum.lng);
  }, [hedef, currentPos]);

  async function markHedef() {
    if (!hedef || !vehicleId) return;
    setBusyId(hedef.id);
    try {
      const zaman = Date.now();
      await update(ref(database, `servisGunlukDurum/${dateKey}/${vehicleId}/cocuklar/${hedef.id}`), {
        [mode]: { zaman },
      });

      const parentIds = getChildParentIds(hedef);
      const adSoyad = `${hedef.ad || ''} ${hedef.soyad || ''}`.trim();
      const baslik = mode === 'alindi' ? '🚌 Servise alındı' : '🏠 Servisten bırakıldı';
      const mesaj = mode === 'alindi' ? `${adSoyad} servise alındı.` : `${adSoyad} evine bırakıldı.`;

      if (parentIds.length > 0) {
        createNotification({
          kresId, hedefUserIds: parentIds, hedefCocukIds: [hedef.id], baslik, mesaj, tip: 'servis', routeName: 'ParentService', createdBy: userId,
        }).catch((error) => console.log('Servis bildirimi (veli) gönderilemedi:', error));
      }
      createNotification({
        kresId, hedefRoller: ['yonetici'], baslik, mesaj, tip: 'servis', routeName: 'AdminService', createdBy: userId,
      }).catch((error) => console.log('Servis bildirimi (yönetici) gönderilemedi:', error));
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'İşaretlenemedi, tekrar deneyin.');
    } finally {
      setBusyId(null);
    }
  }

  async function markKurumaVardi() {
    if (!vehicleId) return;
    const alinanCocuklar = children.filter((c) => durumMap[c.id]?.alindi);
    if (alinanCocuklar.length === 0) return;
    setBusyId('varma');
    try {
      await update(ref(database, `servisGunlukDurum/${dateKey}/${vehicleId}`), { kurumaVardi: { zaman: Date.now() } });
      const servisAdi = vehicle?.ad || vehicle?.plaka || 'Servis';
      alinanCocuklar.forEach((child) => {
        const parentIds = getChildParentIds(child);
        if (parentIds.length === 0) return;
        const adSoyad = `${child.ad || ''} ${child.soyad || ''}`.trim();
        createNotification({
          kresId, hedefUserIds: parentIds, hedefCocukIds: [child.id],
          baslik: '🏫 Servis kuruma ulaştı', mesaj: `${adSoyad} ile birlikte ${servisAdi} kuruma ulaştı.`,
          tip: 'servis', routeName: 'ParentService', createdBy: userId,
        }).catch((error) => console.log('Servis bildirimi (veli) gönderilemedi:', error));
      });
      createNotification({
        kresId, hedefRoller: ['yonetici'],
        baslik: '🏫 Servis kuruma ulaştı', mesaj: `${servisAdi} kuruma ulaştı — ${alinanCocuklar.length} çocuk.`,
        tip: 'servis', routeName: 'AdminService', createdBy: userId,
      }).catch((error) => console.log('Servis bildirimi (yönetici) gönderilemedi:', error));
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'İşaretlenemedi, tekrar deneyin.');
    } finally {
      setBusyId(null);
    }
  }

  function openDirections(child) {
    if (child?.adresKonum) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${child.adresKonum.lat},${child.adresKonum.lng}`);
    } else if (child?.adres) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(child.adres)}`);
    } else {
      Alert.alert('Adres yok', 'Bu çocuk için kayıtlı bir adres bulunamadı.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color={THEME.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backText}>‹ Geri</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Günlük Rota</Text>
            <Text style={styles.subtitle}>{kres?.ad || ''}{vehicle?.plaka ? ` · 🚐 ${vehicle.plaka}` : ''}</Text>
          </View>
        </View>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'alindi' && styles.modeTabActive]}
            onPress={() => setMode('alindi')}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeTabText, mode === 'alindi' && styles.modeTabTextActive]}>🌅 Alma Turu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'birakildi' && styles.modeTabActive]}
            onPress={() => setMode('birakildi')}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeTabText, mode === 'birakildi' && styles.modeTabTextActive]}>🌇 Bırakma Turu</Text>
          </TouchableOpacity>
        </View>

        {locationDenied ? (
          <View style={styles.warnCard}>
            <Text style={styles.warnText}>
              ⚠️ Konum izni verilmedi — mesafe hesaplanamıyor, ama "Yol Tarifi Aç" butonu yine çalışır.
            </Text>
          </View>
        ) : null}

        {hedef ? (
          <View style={styles.hedefCard}>
            <Text style={styles.hedefLabel}>🎯 HEDEF — Sıradaki Durak</Text>
            <Text style={styles.hedefName}>{hedef.ad} {hedef.soyad}</Text>
            {hedef.adres ? <Text style={styles.hedefAdres}>{hedef.adres}</Text> : <Text style={styles.hedefAdres}>Adres girilmemiş</Text>}
            {hedefMesafeKm != null ? (
              <Text style={styles.hedefMesafe}>📍 Yaklaşık {hedefMesafeKm.toFixed(1)} km kaldı</Text>
            ) : null}

            <View style={styles.hedefButtonRow}>
              <TouchableOpacity
                style={styles.hedefButtonPrimary}
                onPress={markHedef}
                disabled={busyId === hedef.id}
                activeOpacity={0.85}
              >
                <Text style={styles.hedefButtonPrimaryText}>
                  {busyId === hedef.id ? '...' : mode === 'alindi' ? '✅ Alındı Olarak İşaretle' : '✅ Bırakıldı Olarak İşaretle'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.hedefButtonSecondary} onPress={() => openDirections(hedef)} activeOpacity={0.85}>
                <Text style={styles.hedefButtonSecondaryText}>🧭 Yol Tarifi</Text>
              </TouchableOpacity>
            </View>

            {hedef.veliTelefon ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${hedef.veliTelefon}`)} activeOpacity={0.8} style={{ marginTop: 10 }}>
                <Text style={styles.hedefTelefon}>📞 Veliyi Ara — {hedef.veliTelefon}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.doneCard}>
            <Text style={styles.doneText}>
              {mode === 'alindi' ? '🎉 Tüm çocuklar alındı!' : '🎉 Tüm çocuklar bırakıldı!'}
            </Text>
            {mode === 'alindi' && !kurumaVardiZaman && tamamlananlar.length > 0 ? (
              <TouchableOpacity style={styles.varmaButton} onPress={markKurumaVardi} disabled={busyId === 'varma'} activeOpacity={0.85}>
                <Text style={styles.varmaButtonText}>{busyId === 'varma' ? '...' : '🏫 Kuruma Vardı — Toplu İşaretle'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {kalanlar.length > 1 ? (
          <View style={styles.listSection}>
            <Text style={styles.listSectionTitle}>Sıradaki Duraklar ({kalanlar.length - 1})</Text>
            {kalanlar.slice(1).map((c, i) => (
              <Text key={c.id} style={styles.listItem}>{i + 2}. {c.ad} {c.soyad}</Text>
            ))}
          </View>
        ) : null}

        {tamamlananlar.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.listSectionTitle}>✅ Tamamlanan ({tamamlananlar.length})</Text>
            {tamamlananlar.map((c) => (
              <Text key={c.id} style={styles.listItemDone}>✓ {c.ad} {c.soyad}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border },
  backText: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  title: { color: THEME.primaryDark, fontSize: 20, fontWeight: '900' },
  subtitle: { color: THEME.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeTab: { flex: 1, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, backgroundColor: '#fff', alignItems: 'center' },
  modeTabActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  modeTabText: { color: THEME.text, fontWeight: '800', fontSize: 13 },
  modeTabTextActive: { color: '#fff' },
  warnCard: { backgroundColor: THEME.warnBg, borderRadius: 14, padding: 12, marginBottom: 14 },
  warnText: { color: THEME.warnText, fontWeight: '700', fontSize: 12 },
  hedefCard: { backgroundColor: THEME.primaryDark, borderRadius: 22, padding: 20, marginBottom: 16 },
  hedefLabel: { color: '#C9D9FF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  hedefName: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 8 },
  hedefAdres: { color: '#DCE6FF', fontWeight: '600', fontSize: 13, marginTop: 6 },
  hedefMesafe: { color: '#fff', fontWeight: '900', fontSize: 15, marginTop: 10 },
  hedefButtonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  hedefButtonPrimary: { flex: 1.4, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  hedefButtonPrimaryText: { color: THEME.primaryDark, fontWeight: '900', fontSize: 13 },
  hedefButtonSecondary: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  hedefButtonSecondaryText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  hedefTelefon: { color: '#fff', fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
  doneCard: { backgroundColor: THEME.greenSoft, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 },
  doneText: { color: THEME.green, fontWeight: '900', fontSize: 16 },
  varmaButton: { backgroundColor: THEME.green, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20, marginTop: 14 },
  varmaButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  listSection: { backgroundColor: THEME.card, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 12 },
  listSectionTitle: { color: THEME.muted, fontWeight: '900', fontSize: 12, marginBottom: 8 },
  listItem: { color: THEME.text, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  listItemDone: { color: THEME.green, fontWeight: '700', fontSize: 13, marginBottom: 6 },
});
