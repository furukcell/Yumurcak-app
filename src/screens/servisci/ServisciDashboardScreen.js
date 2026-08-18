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
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, onValue, get, update } from 'firebase/database';

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
  const { kullanici, cikisYap } = useAuth();
  const userId = kullanici?.uid || kullanici?.id;
  const kresId = kullanici?.kresId;
  const dateKey = useMemo(() => todayKey(), []);

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
    if (!selectedVehicleId) {
      setChildren([]);
      return undefined;
    }

    const unsub = onValue(ref(database, 'servisBilgileri'), async (snap) => {
      const data = snap.val() || {};
      const childIds = Object.entries(data)
        .filter(([, v]) => v?.servisKullaniyor && v?.servisId === selectedVehicleId)
        .map(([childId]) => childId);

      if (childIds.length === 0) {
        setChildren([]);
        return;
      }

      const results = await Promise.all(
        childIds.map((id) => get(ref(database, `cocuklar/${id}`)).then((s) => (s.exists() ? { id, ...s.val() } : null)))
      );
      const list = results.filter(Boolean).sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
      setChildren(list);
    });

    return () => unsub();
  }, [selectedVehicleId]);

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
          <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
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
            <Text style={styles.title}>Servis Görevlisi</Text>
            <Text style={styles.subtitle}>{kullanici?.ad || ''}</Text>
          </View>
          <TouchableOpacity style={styles.logoutIconButton} onPress={cikisYap} activeOpacity={0.8}>
            <Text style={styles.logoutIconText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

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
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { color: THEME.primaryDark, fontSize: 22, fontWeight: '900' },
  subtitle: { color: THEME.muted, fontSize: 13, fontWeight: '700', marginTop: 2 },
  logoutIconButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border },
  logoutIconText: { color: THEME.primary, fontWeight: '800', fontSize: 13 },
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
  childName: { fontSize: 15, fontWeight: '900', color: THEME.text, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', gap: 10 },
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
