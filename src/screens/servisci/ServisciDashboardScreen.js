// ============================================================
// YUMURCAK — ServisciDashboardScreen.js
// Servis görevlisi (abla/hostes) ana ekranı.
// Kendi hesabına atanmış araç(lar)daki, o gün servis kullanan
// çocukları listeler; her çocuk için "Alındı" / "Bırakıldı" tek
// tek işaretlenir, "Kuruma Vardı" ise araç bazlı TOPLU tek buton
// (FAZ 4 tasarım kararı — kullanıcı ile konuşulup netleşti).
//
// Veri modeli:
//   servisGunlukDurum/{tarihKey}/{servisId}: {
//     kurumaVardi: { zaman },
//     cocuklar: { [childId]: { alindi: { zaman }, birakildi: { zaman } } }
//   }
//
// Her işaretlemede hem o çocuğun velisine hem yöneticiye bildirim
// gider (createNotification). "Kuruma Vardı" toplu butonu, o gün
// "alındı" işaretlenmiş TÜM çocukların velilerine ayrı ayrı +
// yöneticiye tek bir özet bildirim gönderir.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ref, onValue, get, update, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../services/notificationCenter';

const THEME = {
  primary: '#3A7BFF',
  primaryDark: '#2A5FD6',
  primarySoft: '#E8F0FF',
  green: '#20B45B',
  greenSoft: '#E4F9EC',
  orange: '#FF9F1C',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  border: '#EAEFF8',
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

export default function ServisciDashboardScreen({ navigation }) {
  const { kullanici, kres, cikisYap } = useAuth();
  const userId = kullanici?.uid || kullanici?.id;
  const kresId = kullanici?.kresId;
  const dateKey = useMemo(() => todayKey(), []);

  // Android donanım geri tuşu — direkt uygulamadan çıkmasın, önce sorsun
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Çıkmak istiyor musunuz?',
          'Uygulamadan çıkmak üzeresiniz.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Çık', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ]
        );
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [children, setChildren] = useState([]);
  const [gunlukDurum, setGunlukDurum] = useState({});
  const [busyChildId, setBusyChildId] = useState(null);
  const [busyVarma, setBusyVarma] = useState(false);

  // Kendi hesabına atanmış araçlar
  useEffect(() => {
    if (!kresId || !userId) {
      setLoading(false);
      return undefined;
    }

    const unsub = onValue(ref(database, 'servisler'), (snap) => {
      const data = snap.val() || {};
      const mine = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter((v) => v.kresId === kresId && String(v.servisciId) === String(userId));
      mine.sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
      setVehicles(mine);
      setSelectedVehicleId((prev) => (prev && mine.some((v) => v.id === prev) ? prev : mine[0]?.id || null));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [kresId, userId]);

  // Seçili araca atanmış, servis kullanan çocuklar
  useEffect(() => {
    if (!selectedVehicleId || !kresId) {
      setChildren([]);
      return undefined;
    }

    const serviceQuery = query(ref(database, 'servisBilgileri'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(serviceQuery, async (snap) => {
      const data = snap.val() || {};
      const childIds = Object.entries(data)
        .filter(([, v]) => v?.servisKullaniyor && v?.servisId === selectedVehicleId)
        .map(([childId]) => childId);

      if (childIds.length === 0) {
        setChildren([]);
        return;
      }

      const results = await Promise.all(
        childIds.map(async (id) => {
          const snap = await get(ref(database, `cocuklar/${id}`));
          if (!snap.exists()) return null;
          const childData = { id, ...snap.val() };
          const parentIds = getChildParentIds(childData);
          if (parentIds.length > 0) {
            try {
              const veliSnap = await get(ref(database, `kullanicilar/${parentIds[0]}`));
              if (veliSnap.exists()) {
                childData.veliTelefon = veliSnap.val().telefon || '';
                childData.veliAdi = veliSnap.val().ad || '';
              }
            } catch (error) {
              console.log('Veli bilgisi çekilemedi:', error);
            }
          }
          return childData;
        })
      );
      const list = results.filter(Boolean).sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
      setChildren(list);
    });

    return () => unsub();
  }, [selectedVehicleId, kresId]);

  // Günlük durum (o araç + bugün)
  useEffect(() => {
    if (!selectedVehicleId) {
      setGunlukDurum({});
      return undefined;
    }
    const unsub = onValue(ref(database, `servisGunlukDurum/${dateKey}/${selectedVehicleId}`), (snap) => {
      setGunlukDurum(snap.val() || {});
    });
    return () => unsub();
  }, [selectedVehicleId, dateKey]);

  const vehicleChildrenDurum = gunlukDurum.cocuklar || {};
  const kurumaVardiZaman = gunlukDurum.kurumaVardi?.zaman || null;

  async function markChild(child, field) {
    if (!selectedVehicleId) return;
    setBusyChildId(child.id);
    try {
      const zaman = Date.now();
      await update(ref(database, `servisGunlukDurum/${dateKey}/${selectedVehicleId}/cocuklar/${child.id}`), {
        [field]: { zaman },
      });

      const parentIds = getChildParentIds(child);
      const adSoyad = `${child.ad || ''} ${child.soyad || ''}`.trim();
      const baslik = field === 'alindi' ? '🚌 Servise alındı' : '🏠 Servisten bırakıldı';
      const mesaj = field === 'alindi'
        ? `${adSoyad} servise alındı.`
        : `${adSoyad} evine bırakıldı.`;

      if (parentIds.length > 0) {
        createNotification({
          kresId,
          hedefUserIds: parentIds,
          hedefCocukIds: [child.id],
          baslik,
          mesaj,
          tip: 'servis',
          routeName: 'ParentService',
          createdBy: userId,
        }).catch((error) => console.log('Servis bildirimi (veli) gönderilemedi:', error));
      }

      createNotification({
        kresId,
        hedefRoller: ['yonetici'],
        baslik,
        mesaj,
        tip: 'servis',
        routeName: 'AdminService',
        createdBy: userId,
      }).catch((error) => console.log('Servis bildirimi (yönetici) gönderilemedi:', error));
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'İşaretlenemedi, tekrar deneyin.');
    } finally {
      setBusyChildId(null);
    }
  }

  async function markKurumaVardi() {
    if (!selectedVehicleId) return;

    const alinanCocuklar = children.filter((c) => vehicleChildrenDurum[c.id]?.alindi);
    if (alinanCocuklar.length === 0) {
      Alert.alert('Uyarı', 'Henüz alınan çocuk yok. Önce çocukları "Alındı" olarak işaretleyin.');
      return;
    }

    setBusyVarma(true);
    try {
      const zaman = Date.now();
      await update(ref(database, `servisGunlukDurum/${dateKey}/${selectedVehicleId}`), {
        kurumaVardi: { zaman },
      });

      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      const servisAdi = vehicle?.ad || vehicle?.plaka || 'Servis';

      alinanCocuklar.forEach((child) => {
        const parentIds = getChildParentIds(child);
        if (parentIds.length === 0) return;
        const adSoyad = `${child.ad || ''} ${child.soyad || ''}`.trim();
        createNotification({
          kresId,
          hedefUserIds: parentIds,
          hedefCocukIds: [child.id],
          baslik: '🏫 Servis kuruma ulaştı',
          mesaj: `${adSoyad} ile birlikte ${servisAdi} kuruma ulaştı.`,
          tip: 'servis',
          routeName: 'ParentService',
          createdBy: userId,
        }).catch((error) => console.log('Servis bildirimi (veli) gönderilemedi:', error));
      });

      createNotification({
        kresId,
        hedefRoller: ['yonetici'],
        baslik: '🏫 Servis kuruma ulaştı',
        mesaj: `${servisAdi} kuruma ulaştı — ${alinanCocuklar.length} çocuk.`,
        tip: 'servis',
        routeName: 'AdminService',
        createdBy: userId,
      }).catch((error) => console.log('Servis bildirimi (yönetici) gönderilemedi:', error));
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'İşaretlenemedi, tekrar deneyin.');
    } finally {
      setBusyVarma(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color={THEME.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Size henüz bir servis aracı atanmamış. Yöneticinizle iletişime geçin.</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('ServisciProfile')} activeOpacity={0.85}>
            <Text style={styles.logoutButtonText}>👤 Profilim</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logoutButton, { marginTop: 10 }]} onPress={cikisYap} activeOpacity={0.85}>
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{kres?.ad || 'Servis Görevlisi'}</Text>
            <Text style={styles.subtitle}>
              {kullanici?.ad || ''}
              {vehicles.find((v) => v.id === selectedVehicleId)?.plaka
                ? ` · 🚐 ${vehicles.find((v) => v.id === selectedVehicleId).plaka}`
                : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutIconButton} onPress={() => navigation.navigate('ServisciProfile')} activeOpacity={0.8}>
            <Text style={styles.logoutIconText}>👤 Profilim</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutIconButton} onPress={cikisYap} activeOpacity={0.8}>
            <Text style={styles.logoutIconText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.routeButton}
          onPress={() => navigation.navigate('ServisciRoute', { vehicleId: selectedVehicleId })}
          activeOpacity={0.85}
        >
          <Text style={styles.routeButtonText}>📍 Günlük Rota — Sıradaki Durağı Göster</Text>
        </TouchableOpacity>

        {vehicles.length > 1 ? (
          <View style={styles.vehicleTabRow}>
            {vehicles.map((v) => {
              const active = v.id === selectedVehicleId;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleTab, active && styles.vehicleTabActive]}
                  onPress={() => setSelectedVehicleId(v.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.vehicleTabText, active && styles.vehicleTabTextActive]}>{v.ad || v.plaka}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          disabled={busyVarma || !!kurumaVardiZaman}
          style={[styles.varmaButton, kurumaVardiZaman && styles.varmaButtonDone]}
          onPress={markKurumaVardi}
          activeOpacity={0.85}
        >
          <Text style={styles.varmaButtonText}>
            {busyVarma ? '...' : kurumaVardiZaman ? '✅ Kuruma Vardı (İşaretlendi)' : '🏫 Kuruma Vardı — Toplu İşaretle'}
          </Text>
        </TouchableOpacity>

        {children.length === 0 ? (
          <Text style={styles.emptyListText}>Bu araca atanmış, servis kullanan çocuk yok.</Text>
        ) : (
          children.map((child) => {
            const durum = vehicleChildrenDurum[child.id] || {};
            const alindi = !!durum.alindi;
            const birakildi = !!durum.birakildi;
            const busy = busyChildId === child.id;
            return (
              <View key={child.id} style={styles.card}>
                <Text style={styles.childName}>{child.ad} {child.soyad}</Text>

                {child.veliTelefon ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`tel:${child.veliTelefon}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.contactText}>📞 {child.veliTelefon}</Text>
                  </TouchableOpacity>
                ) : null}

                {child.adres ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(child.adres)}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.contactText} numberOfLines={2}>🗺️ {child.adres}</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    disabled={busy}
                    style={[styles.actionButton, alindi && styles.actionButtonDone]}
                    onPress={() => markChild(child, 'alindi')}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.actionButtonText, alindi && styles.actionButtonTextDone]}>
                      {alindi ? '✅ Alındı' : 'Alındı'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={busy || !alindi}
                    style={[styles.actionButton, birakildi && styles.actionButtonDone, !alindi && styles.actionButtonDisabled]}
                    onPress={() => markChild(child, 'birakildi')}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.actionButtonText, birakildi && styles.actionButtonTextDone]}>
                      {birakildi ? '✅ Bırakıldı' : 'Bırakıldı'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { color: THEME.primaryDark, fontSize: 22, fontWeight: '900' },
  subtitle: { color: THEME.muted, fontSize: 13, fontWeight: '700', marginTop: 2 },
  logoutIconButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border },
  logoutIconText: { color: THEME.primary, fontWeight: '800', fontSize: 13 },
  routeButton: { backgroundColor: THEME.primaryDark, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 14 },
  routeButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  vehicleTabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  vehicleTab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, backgroundColor: '#fff' },
  vehicleTabActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  vehicleTabText: { color: THEME.text, fontWeight: '800', fontSize: 13 },
  vehicleTabTextActive: { color: '#fff' },
  varmaButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 18 },
  varmaButtonDone: { backgroundColor: THEME.green },
  varmaButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  emptyListText: { color: THEME.muted, textAlign: 'center', marginTop: 30, fontWeight: '700' },
  card: { backgroundColor: THEME.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 12 },
  childName: { fontSize: 15, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  contactRow: { marginBottom: 6 },
  contactText: { color: THEME.primaryDark, fontWeight: '700', fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.border },
  actionButtonDone: { backgroundColor: THEME.greenSoft, borderColor: THEME.green },
  actionButtonDisabled: { opacity: 0.45 },
  actionButtonText: { color: THEME.primaryDark, fontWeight: '800', fontSize: 13 },
  actionButtonTextDone: { color: THEME.green },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { color: THEME.muted, textAlign: 'center', fontWeight: '700', marginBottom: 20 },
  logoutButton: { backgroundColor: THEME.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  logoutButtonText: { color: '#fff', fontWeight: '800' },
});
