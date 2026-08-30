// ============================================================
// YUMURCAK — AdminServiceStatsScreen.js
// Yönetici için servis durumu: bugünün canlı takibi (kim alındı,
// kim henüz alınmadı, araç kuruma vardı mı) + tarih gezinerek
// geçmiş günlere bakabilme. servisGunlukDurum node'u zaten gün
// gün saklandığı için sadece okuma/gösterim ekranı — yeni yazma
// mantığı gerekmiyor.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, onValue, get, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTime(zaman) {
  if (!zaman) return null;
  const d = new Date(zaman);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDateLabel(date, todayKey) {
  const key = toDateKey(date);
  if (key === todayKey) return 'Bugün';
  const dun = new Date();
  dun.setDate(dun.getDate() - 1);
  if (key === toDateKey(dun)) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

export default function AdminServiceStatsScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [serviceMap, setServiceMap] = useState({});
  const [gunlukDurum, setGunlukDurum] = useState({});
  const [childrenMap, setChildrenMap] = useState({});

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const isToday = dateKey === todayKey;

  // Araçlar
  useEffect(() => {
    if (!kresId) return undefined;
    const q = query(ref(database, 'servisler'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      list.sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
      setVehicles(list);
    });
    return () => unsub();
  }, [kresId]);

  // Servis kullanan çocuklar (mevcut atama)
  useEffect(() => {
    if (!kresId) return undefined;
    const q = query(ref(database, 'servisBilgileri'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      setServiceMap(snap.val() || {});
    });
    return () => unsub();
  }, [kresId]);

  // Seçili günün durum kaydı
  useEffect(() => {
    setLoading(true);
    const unsub = onValue(ref(database, `servisGunlukDurum/${dateKey}`), async (snap) => {
      const data = snap.val() || {};
      setGunlukDurum(data);

      // Bu güne ait kayıtlarda geçen tüm çocuk id'lerini + mevcut atamadaki çocukları topla
      const idsFromDurum = Object.values(data).flatMap((v) => Object.keys(v?.cocuklar || {}));
      const idsFromAtama = Object.entries(serviceMap)
        .filter(([, v]) => v?.servisKullaniyor)
        .map(([childId]) => childId);
      const allIds = [...new Set([...idsFromDurum, ...idsFromAtama])];

      const missing = allIds.filter((id) => !childrenMap[id]);
      if (missing.length > 0) {
        const results = await Promise.all(
          missing.map((id) => get(ref(database, `cocuklar/${id}`)).then((s) => (s.exists() ? [id, s.val()] : null)))
        );
        setChildrenMap((prev) => ({ ...prev, ...Object.fromEntries(results.filter(Boolean)) }));
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, serviceMap]);

  const assignedChildren = useMemo(
    () => Object.entries(serviceMap).filter(([, v]) => v?.servisKullaniyor).map(([id, v]) => ({ id, ...v })),
    [serviceMap]
  );

  const alinmayanlar = useMemo(() => {
    if (!isToday) return [];
    return assignedChildren.filter((c) => {
      const vehicleDurum = gunlukDurum[c.servisId]?.cocuklar || {};
      return !vehicleDurum[c.id]?.alindi;
    });
  }, [assignedChildren, gunlukDurum, isToday]);

  function shiftDay(delta) {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Servis Durumu</Text>
          </View>

          <View style={styles.dateNav}>
            <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(-1)} activeOpacity={0.8}>
              <Text style={styles.dateArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.dateLabelWrap}>
              <Text style={styles.dateLabel}>{formatDateLabel(selectedDate, todayKey)}</Text>
              {!isToday ? (
                <TouchableOpacity onPress={() => setSelectedDate(new Date())} activeOpacity={0.8}>
                  <Text style={styles.todayLink}>Bugüne dön</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
              onPress={() => !isToday && shiftDay(1)}
              disabled={isToday}
              activeOpacity={0.8}
            >
              <Text style={styles.dateArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
          ) : (
            <>
              {isToday && alinmayanlar.length > 0 ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>⏳ Henüz Alınmayanlar ({alinmayanlar.length})</Text>
                  {alinmayanlar.map((c) => {
                    const child = childrenMap[c.id];
                    const vehicle = vehicles.find((v) => v.id === c.servisId);
                    return (
                      <Text key={c.id} style={styles.warningItem}>
                        • {child ? `${child.ad} ${child.soyad}` : '...'} {vehicle ? `(${vehicle.ad || vehicle.plaka})` : ''}
                      </Text>
                    );
                  })}
                </View>
              ) : null}

              {vehicles.length === 0 ? (
                <Text style={styles.emptyText}>Henüz servis aracı eklenmedi.</Text>
              ) : (
                vehicles.map((vehicle) => {
                  const durum = gunlukDurum[vehicle.id] || {};
                  const cocuklar = assignedChildren.filter((c) => c.servisId === vehicle.id);
                  const varmaSaat = formatTime(durum.kurumaVardi?.zaman);

                  return (
                    <View key={vehicle.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.vehicleName}>{vehicle.ad || vehicle.plaka}</Text>
                        <View style={[styles.badge, varmaSaat ? styles.badgeDone : styles.badgePending]}>
                          <Text style={[styles.badgeText, varmaSaat ? styles.badgeTextDone : styles.badgeTextPending]}>
                            {varmaSaat ? `✅ Vardı ${varmaSaat}` : '⏳ Henüz varmadı'}
                          </Text>
                        </View>
                      </View>

                      {cocuklar.length === 0 ? (
                        <Text style={styles.noChildText}>Bu araca atanmış çocuk yok.</Text>
                      ) : (
                        cocuklar.map((c) => {
                          const child = childrenMap[c.id];
                          const childDurum = (durum.cocuklar || {})[c.id] || {};
                          const alindiSaat = formatTime(childDurum.alindi?.zaman);
                          const birakildiSaat = formatTime(childDurum.birakildi?.zaman);
                          return (
                            <View key={c.id} style={styles.childRow}>
                              <Text style={styles.childName}>{child ? `${child.ad} ${child.soyad}` : '...'}</Text>
                              <View style={styles.childTimes}>
                                <Text style={[styles.childTime, alindiSaat && styles.childTimeDone]}>
                                  {alindiSaat ? `✅ ${alindiSaat}` : '⏳ —'}
                                </Text>
                                <Text style={[styles.childTime, birakildiSaat && styles.childTimeDone]}>
                                  {birakildiSaat ? `✅ ${birakildiSaat}` : '⏳ —'}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
    screen: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
    backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: theme.border },
    backText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    title: { color: theme.primary, fontSize: 22, fontWeight: '900' },
    dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 10, marginBottom: 16 },
    dateArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
    dateArrowDisabled: { opacity: 0.35 },
    dateArrowText: { color: theme.primary, fontSize: 20, fontWeight: '900' },
    dateLabelWrap: { alignItems: 'center' },
    dateLabel: { color: theme.text, fontSize: 15, fontWeight: '900' },
    todayLink: { color: theme.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },
    warningCard: { backgroundColor: '#FFF4E0', borderRadius: 16, borderWidth: 1, borderColor: '#FFD98A', padding: 14, marginBottom: 16 },
    warningTitle: { color: '#8A5A00', fontWeight: '900', fontSize: 14, marginBottom: 6 },
    warningItem: { color: '#8A5A00', fontSize: 13, fontWeight: '700', marginTop: 2 },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 30, fontWeight: '700' },
    card: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    vehicleName: { fontSize: 16, fontWeight: '900', color: theme.text },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeDone: { backgroundColor: '#E4F9EC' },
    badgePending: { backgroundColor: theme.primarySoft },
    badgeText: { fontSize: 11, fontWeight: '800' },
    badgeTextDone: { color: '#20B45B' },
    badgeTextPending: { color: theme.primary },
    noChildText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
    childRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
    childName: { color: theme.text, fontWeight: '700', fontSize: 13, flex: 1 },
    childTimes: { flexDirection: 'row', gap: 10 },
    childTime: { fontSize: 12, fontWeight: '700', color: theme.muted, minWidth: 60, textAlign: 'right' },
    childTimeDone: { color: '#20B45B' },
  });
}
