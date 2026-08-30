// ============================================================
// YUMURCAK — AdminServiceMonthlyStatsScreen.js
// Seçilen ayın TÜM günlerini (servisGunlukDurum/{tarih}) paralel
// çekip araç + çocuk bazında toplu istatistik üretir:
//  - Her aracın o ay kaç gün sefer yaptığı
//  - Ortalama sefer süresi (ilk alınan çocuk → kuruma vardı farkı)
//  - Ortalama dönüş süresi (ilk bırakılan → son bırakılan farkı)
//  - Her çocuğun o ay kaç kez alınıp/alınmadığı, bırakılıp/bırakılmadığı
//  - "Servis kullanıp sık binmeyen" çocukların öne çıkarılmış listesi
// Yazma yok, sadece okuma/agregasyon — mevcut veri modeline dokunmaz.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, get, onValue, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}s ${m}dk` : `${m} dk`;
}

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function AdminServiceMonthlyStatsScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [serviceMap, setServiceMap] = useState({});
  const [childrenMap, setChildrenMap] = useState({});
  const [monthData, setMonthData] = useState({});

  const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth();

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

  useEffect(() => {
    if (!kresId) return undefined;
    const q = query(ref(database, 'servisBilgileri'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => setServiceMap(snap.val() || {}));
    return () => unsub();
  }, [kresId]);

  useEffect(() => {
    let cancelled = false;
    async function yukle() {
      setLoading(true);
      const lastDay = isCurrentMonth ? now.getDate() : daysInMonth(year, monthIndex);
      const dateKeys = Array.from({ length: lastDay }, (_, i) => `${year}-${pad2(monthIndex + 1)}-${pad2(i + 1)}`);

      const results = await Promise.all(
        dateKeys.map((key) => get(ref(database, `servisGunlukDurum/${key}`)).then((s) => [key, s.val()]))
      );
      if (cancelled) return;
      setMonthData(Object.fromEntries(results.filter(([, v]) => v)));

      const allChildIds = new Set();
      results.forEach(([, dayData]) => {
        Object.values(dayData || {}).forEach((durum) => {
          Object.keys(durum?.cocuklar || {}).forEach((id) => allChildIds.add(id));
        });
      });
      Object.entries(serviceMap).forEach(([id, v]) => { if (v?.servisKullaniyor) allChildIds.add(id); });

      const missing = [...allChildIds].filter((id) => !childrenMap[id]);
      if (missing.length > 0) {
        const childResults = await Promise.all(
          missing.map((id) => get(ref(database, `cocuklar/${id}`)).then((s) => (s.exists() ? [id, s.val()] : null)))
        );
        if (!cancelled) setChildrenMap((prev) => ({ ...prev, ...Object.fromEntries(childResults.filter(Boolean)) }));
      }
      if (!cancelled) setLoading(false);
    }
    yukle();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, monthIndex, serviceMap]);

  const { vehicleStats, cokBinmeyenler } = useMemo(() => {
    const stats = {};
    Object.values(monthData).forEach((dayData) => {
      Object.entries(dayData || {}).forEach(([servisId, durum]) => {
        const cocuklar = durum?.cocuklar || {};
        const childIds = Object.keys(cocuklar);
        if (childIds.length === 0 && !durum?.kurumaVardi) return;

        if (!stats[servisId]) stats[servisId] = { gunSayisi: 0, seferSureleri: [], donusSureleri: [], childCounts: {} };
        stats[servisId].gunSayisi += 1;

        const alindiZamanlar = childIds.map((id) => cocuklar[id]?.alindi?.zaman).filter(Boolean);
        if (alindiZamanlar.length > 0 && durum?.kurumaVardi?.zaman) {
          const sefer = durum.kurumaVardi.zaman - Math.min(...alindiZamanlar);
          if (sefer > 0) stats[servisId].seferSureleri.push(sefer);
        }

        const birakilanZamanlar = childIds.map((id) => cocuklar[id]?.birakildi?.zaman).filter(Boolean);
        if (birakilanZamanlar.length >= 2) {
          const donus = Math.max(...birakilanZamanlar) - Math.min(...birakilanZamanlar);
          if (donus > 0) stats[servisId].donusSureleri.push(donus);
        }

        childIds.forEach((id) => {
          if (!stats[servisId].childCounts[id]) stats[servisId].childCounts[id] = { alinma: 0, birakilma: 0 };
          if (cocuklar[id]?.alindi) stats[servisId].childCounts[id].alinma += 1;
          if (cocuklar[id]?.birakildi) stats[servisId].childCounts[id].birakilma += 1;
        });
      });
    });

    const assigned = Object.entries(serviceMap)
      .filter(([, v]) => v?.servisKullaniyor)
      .map(([id, v]) => ({ id, ...v }));

    const binmeyenler = assigned
      .map((c) => {
        const vs = stats[c.servisId];
        const gunSayisi = vs?.gunSayisi || 0;
        const alinma = vs?.childCounts?.[c.id]?.alinma || 0;
        const birakilma = vs?.childCounts?.[c.id]?.birakilma || 0;
        return { ...c, gunSayisi, alinma, alinmayan: gunSayisi - alinma, birakilma, birakilmayan: gunSayisi - birakilma };
      })
      .filter((c) => c.gunSayisi > 0 && (c.alinmayan > 0 || c.birakilmayan > 0))
      .sort((a, b) => (b.alinmayan + b.birakilmayan) - (a.alinmayan + a.birakilmayan));

    return { vehicleStats: stats, cokBinmeyenler: binmeyenler };
  }, [monthData, serviceMap]);

  function shiftMonth(delta) {
    setMonthIndex((prevMonth) => {
      let nextMonth = prevMonth + delta;
      let nextYear = year;
      if (nextMonth < 0) { nextMonth = 11; nextYear -= 1; }
      if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
      if (nextYear > now.getFullYear() || (nextYear === now.getFullYear() && nextMonth > now.getMonth())) {
        return prevMonth;
      }
      setYear(nextYear);
      return nextMonth;
    });
  }

  const assignedChildren = useMemo(
    () => Object.entries(serviceMap).filter(([, v]) => v?.servisKullaniyor).map(([id, v]) => ({ id, ...v })),
    [serviceMap]
  );

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Aylık Servis İstatistikleri</Text>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.monthArrow} onPress={() => shiftMonth(-1)} activeOpacity={0.8}>
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{AY_ADLARI[monthIndex]} {year}</Text>
            <TouchableOpacity
              style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
              onPress={() => !isCurrentMonth && shiftMonth(1)}
              disabled={isCurrentMonth}
              activeOpacity={0.8}
            >
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
          ) : (
            <>
              {cokBinmeyenler.length > 0 ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>⚠️ Servis Kullanıp Sık Binmeyenler</Text>
                  {cokBinmeyenler.map((c) => {
                    const child = childrenMap[c.id];
                    return (
                      <View key={c.id} style={styles.warningRow}>
                        <Text style={styles.warningChildName}>{child ? `${child.ad} ${child.soyad}` : '...'}</Text>
                        <Text style={styles.warningDetail}>
                          Alınma: {c.alinma}/{c.gunSayisi} · Bırakılma: {c.birakilma}/{c.gunSayisi}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Bu ay için henüz kayıt yok ya da tüm çocuklar düzenli kullanmış.</Text>
              )}

              {vehicles.map((vehicle) => {
                const vs = vehicleStats[vehicle.id];
                if (!vs) return null;
                const ortSefer = vs.seferSureleri.length
                  ? vs.seferSureleri.reduce((a, b) => a + b, 0) / vs.seferSureleri.length
                  : 0;
                const ortDonus = vs.donusSureleri.length
                  ? vs.donusSureleri.reduce((a, b) => a + b, 0) / vs.donusSureleri.length
                  : 0;
                const cocuklar = assignedChildren.filter((c) => c.servisId === vehicle.id);

                return (
                  <View key={vehicle.id} style={styles.card}>
                    <Text style={styles.vehicleName}>{vehicle.ad || vehicle.plaka}</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{vs.gunSayisi}</Text>
                        <Text style={styles.statLabel}>Sefer Günü</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{formatDuration(ortSefer)}</Text>
                        <Text style={styles.statLabel}>Ort. Sabah Süresi</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{formatDuration(ortDonus)}</Text>
                        <Text style={styles.statLabel}>Ort. Dönüş Süresi</Text>
                      </View>
                    </View>

                    {cocuklar.map((c) => {
                      const child = childrenMap[c.id];
                      const counts = vs.childCounts[c.id] || { alinma: 0, birakilma: 0 };
                      return (
                        <View key={c.id} style={styles.childRow}>
                          <Text style={styles.childName}>{child ? `${child.ad} ${child.soyad}` : '...'}</Text>
                          <Text style={styles.childCount}>
                            {counts.alinma}/{vs.gunSayisi} alındı · {counts.birakilma}/{vs.gunSayisi} bırakıldı
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
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
    title: { color: theme.primary, fontSize: 20, fontWeight: '900', flexShrink: 1 },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 10, marginBottom: 16 },
    monthArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
    monthArrowDisabled: { opacity: 0.35 },
    monthArrowText: { color: theme.primary, fontSize: 20, fontWeight: '900' },
    monthLabel: { color: theme.text, fontSize: 16, fontWeight: '900' },
    warningCard: { backgroundColor: '#FFF4E0', borderRadius: 16, borderWidth: 1, borderColor: '#FFD98A', padding: 14, marginBottom: 16 },
    warningTitle: { color: '#8A5A00', fontWeight: '900', fontSize: 14, marginBottom: 8 },
    warningRow: { marginBottom: 6 },
    warningChildName: { color: '#8A5A00', fontWeight: '800', fontSize: 13 },
    warningDetail: { color: '#8A5A00', fontSize: 12, fontWeight: '600', marginTop: 1 },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 20, marginBottom: 16, fontWeight: '700' },
    card: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12 },
    vehicleName: { fontSize: 16, fontWeight: '900', color: theme.text, marginBottom: 10 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    statBox: { flex: 1, backgroundColor: theme.primarySoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    statValue: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    statLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
    childRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
    childName: { color: theme.text, fontWeight: '700', fontSize: 13, flex: 1 },
    childCount: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  });
}
