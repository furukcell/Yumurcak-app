// ============================================================
// YUMURCAK — TeacherChildrenScreen.js
// Öğretmenin sınıfındaki çocuklar
// FAZ: Kart üzerinde detay açma (expand) + bugünkü rapor rozeti
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  THEME,
  useTeacherData,
  ScreenHeader,
  LoadingState,
  EmptyState,
  getChildName,
  formatDate,
  todayString,
} from './teacherShared';

// Doğum tarihinden yaş hesaplar. dogumTarihi 'YYYY-MM-DD' formatında bekleniyor.
function calculateAge(dogumTarihi) {
  if (!dogumTarihi) return null;
  const birth = new Date(dogumTarihi);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) return `${months} aylık`;
  return months > 0 ? `${years} yaş ${months} ay` : `${years} yaş`;
}

export default function TeacherChildrenScreen() {
  const navigation = useNavigation();
  const { loading, currentClass, classChildren, reports } = useTeacherData();
  const [expandedId, setExpandedId] = useState(null);
  const [veliMap, setVeliMap] = useState({});
  const [veliLoading, setVeliLoading] = useState(true);

  // Veli bilgileri (ad, telefon) çocuk kaydında tutulmuyor — kullanicilar/{veliId}
  // altında, rol: 'veli' olarak duruyor. Tüm velileri çekip id'ye göre haritalıyoruz.
  useEffect(() => {
    let cancelled = false;

    const loadVeliler = async () => {
      try {
        const snap = await get(ref(database, 'kullanicilar'));
        if (!cancelled && snap.exists()) {
          const data = snap.val();
          const map = {};
          Object.entries(data).forEach(([id, v]) => {
            if (v.rol === 'veli') {
              map[id] = v;
            }
          });
          setVeliMap(map);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setVeliLoading(false);
      }
    };

    loadVeliler();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState text="Çocuklar hazırlanıyor..." />;

  const today = todayString();

  // Bugün hangi çocuklar için rapor girilmiş — hızlı bakış için set oluşturuyoruz.
  const reportedTodayIds = useMemo(() => {
    const set = new Set();
    (reports || []).forEach((item) => {
      if (item.tarih === today) set.add(item.cocukId);
    });
    return set;
  }, [reports, today]);

  const toggleExpand = (childId) => {
    setExpandedId((prev) => (prev === childId ? null : childId));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Çocuklarım" subtitle={currentClass?.ad || 'Sınıfım'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="👧" title="Sınıfta çocuk yok" desc="Yönetici çocukları sınıfa bağladığında burada görünecek." />
        ) : (
          classChildren.map((child) => {
            const isExpanded = expandedId === child.id;
            const reportedToday = reportedTodayIds.has(child.id);
            const age = calculateAge(child.dogumTarihi);

            return (
              <View key={child.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleExpand(child.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatar}><Text style={styles.avatarText}>👧</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{getChildName(child)}</Text>
                    <Text style={styles.sub}>Doğum: {formatDate(child.dogumTarihi)}</Text>
                  </View>

                  {reportedToday ? (
                    <View style={styles.reportBadge}>
                      <Text style={styles.reportBadgeText}>✓ Rapor girildi</Text>
                    </View>
                  ) : null}

                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isExpanded ? (
                  <View style={styles.details}>
                    <DetailRow label="Yaş" value={age || '—'} />

                    {veliLoading ? (
                      <Text style={styles.veliLoadingText}>Veli bilgileri yükleniyor...</Text>
                    ) : (
                      renderVeliler(child.veliIds, veliMap)
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderVeliler(veliIds, veliMap) {
  const ids = Array.isArray(veliIds) ? veliIds : [];

  if (ids.length === 0) {
    return <Text style={styles.veliEmptyText}>Bu çocuğa bağlı veli yok.</Text>;
  }

  return ids.map((veliId, index) => {
    const veli = veliMap[veliId];

    if (!veli) {
      return (
        <DetailRow
          key={veliId}
          label={ids.length > 1 ? `Veli ${index + 1}` : 'Veli'}
          value="Bulunamadı"
        />
      );
    }

    return (
      <View key={veliId} style={index > 0 ? styles.veliGroupSpacing : null}>
        <DetailRow
          label={ids.length > 1 ? `Veli ${index + 1}` : 'Veli Adı'}
          value={veli.ad || '—'}
        />
        <DetailRow label="Telefon" value={veli.telefon || '—'} />
      </View>
    );
  });
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 25 },
  name: { fontSize: 16, fontWeight: '900', color: THEME.text },
  sub: { color: THEME.muted, marginTop: 3, fontWeight: '600' },
  reportBadge: {
    backgroundColor: '#E7F8D8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  reportBadgeText: { color: '#3C8C2A', fontSize: 11, fontWeight: '900' },
  chevron: { color: THEME.muted, fontSize: 12, marginLeft: 4 },
  details: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  detailLabel: { color: THEME.muted, fontWeight: '700', fontSize: 13 },
  detailValue: { color: THEME.text, fontWeight: '800', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  veliLoadingText: { color: THEME.muted, fontWeight: '600', fontSize: 13, paddingTop: 10 },
  veliEmptyText: { color: THEME.muted, fontWeight: '600', fontSize: 13, paddingTop: 10, fontStyle: 'italic' },
  veliGroupSpacing: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: THEME.border },
});
