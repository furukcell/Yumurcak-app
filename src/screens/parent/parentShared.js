import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  orange: '#FF9F1C',
  green: '#20B45B',
  red: '#FF4D6D',
  blue: '#3A7BFF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export const MONTH_LABELS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export const GUNLER = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
export const GUN_LABEL = {
  pazartesi: 'Pazartesi',
  sali: 'Salı',
  carsamba: 'Çarşamba',
  persembe: 'Perşembe',
  cuma: 'Cuma',
};

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-');
  const monthIndex = Number(month) - 1;
  return `${MONTH_LABELS[monthIndex] || monthKey} ${year || ''}`.trim();
}

export function getDayKey(date = new Date()) {
  const keys = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
  return keys[date.getDay()] || 'pazartesi';
}

export function isAbsentStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === 'gelmedi' || value === 'devamsiz' || value === 'devamsız' || value === 'yok';
}

export function toList(data) {
  if (!data) return [];
  return Object.entries(data).map(([id, item]) => ({ id, ...item }));
}

export function useParentBase() {
  const { kullanici, cikisYap } = useAuth();
  const [children, setChildren] = useState([]);
  const [siniflar, setSiniflar] = useState({});
  const [kullanicilar, setKullanicilar] = useState({});
  const [kresler, setKresler] = useState({});
  const [loading, setLoading] = useState(true);

  const parentId = kullanici?.uid || kullanici?.id;

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return undefined;
    }

    const childrenRef = ref(database, 'cocuklar');
    const unsubscribe = onValue(childrenRef, (snapshot) => {
      const data = snapshot.val();
      const myChildren = [];
      if (data) {
        Object.entries(data).forEach(([id, childData]) => {
          if (childData?.veliIds?.includes(parentId)) {
            myChildren.push({ id, ...childData });
          }
        });
      }
      setChildren(myChildren);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [parentId]);

  useEffect(() => {
    const r = ref(database, 'siniflar');
    const unsub = onValue(r, (snap) => setSiniflar(snap.val() || {}));
    return () => unsub();
  }, []);

  useEffect(() => {
    const r = ref(database, 'kullanicilar');
    const unsub = onValue(r, (snap) => setKullanicilar(snap.val() || {}));
    return () => unsub();
  }, []);

  useEffect(() => {
    const r = ref(database, 'kresler');
    const unsub = onValue(r, (snap) => setKresler(snap.val() || {}));
    return () => unsub();
  }, []);

  const selectedChild = children[0] || null;
  const kresId = selectedChild?.kresId || kullanici?.kresId || null;
  const sinifId = selectedChild?.sinifId || null;
  const sinif = sinifId ? siniflar[sinifId] : null;
  const kres = kresId ? kresler[kresId] : null;

  const ogretmenId = useMemo(() => {
    if (selectedChild?.ogretmenId) return selectedChild.ogretmenId;
    if (sinif?.ogretmenIds?.[0]) return sinif.ogretmenIds[0];
    if (sinif?.ogretmenId) return sinif.ogretmenId;
    return null;
  }, [selectedChild, sinif]);

  const ogretmen = ogretmenId ? kullanicilar[ogretmenId] : null;
  const yonetici = kres?.yoneticiId ? kullanicilar[kres.yoneticiId] : null;

  const childName = selectedChild
    ? `${selectedChild.ad || selectedChild.adSoyad || 'Çocuğum'} ${selectedChild.soyad || ''}`.trim()
    : 'Çocuğum';

  const parentName =
    `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() ||
    kullanici?.kullaniciAdi ||
    'Veli';

  return {
    kullanici,
    cikisYap,
    parentId,
    children,
    selectedChild,
    childName,
    parentName,
    kresId,
    sinifId,
    sinif,
    kres,
    ogretmen,
    yonetici,
    siniflar,
    kullanicilar,
    loading,
  };
}

export function useNodeList(node) {
  const [list, setList] = useState([]);

  useEffect(() => {
    const r = ref(database, node);
    const unsub = onValue(r, (snap) => setList(toList(snap.val())));
    return () => unsub();
  }, [node]);

  return list;
}

export function ScreenShell({ title, emoji, navigation, children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {navigation ? (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Geri</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.headerEmoji}>{emoji || ''}</Text>
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LoadingScreen({ text = 'Hazırlanıyor...' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'ℹ️', title, desc }) {
  return (
    <View style={styles.emptyStateCard}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {desc ? <Text style={styles.emptyDesc}>{desc}</Text> : null}
    </View>
  );
}

export function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

export function PlaceholderScreen({ navigation, icon, title, description }) {
  return (
    <ScreenShell title={title} emoji={icon} navigation={navigation}>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderIcon}>{icon}</Text>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderDesc}>{description}</Text>
        <Text style={styles.comingSoonText}>Yakında aktif olacak</Text>
      </View>
    </ScreenShell>
  );
}

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: THEME.bg },
  backButton: { width: 72, flexDirection: 'row', alignItems: 'center' },
  backSpacer: { width: 72 },
  backArrow: { fontSize: 30, color: THEME.primary, fontWeight: '900', marginRight: 2 },
  backLabel: { fontSize: 14, color: THEME.primary, fontWeight: '800' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 19, color: THEME.primary, fontWeight: '900' },
  headerEmoji: { width: 72, textAlign: 'right', fontSize: 22 },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  cardTitle: { fontSize: 17, fontWeight: '900', color: THEME.text, marginBottom: 6 },
  cardText: { fontSize: 13, color: THEME.muted, lineHeight: 19 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginTop: 6, marginBottom: 12 },
  emptyStateCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: THEME.text, textAlign: 'center', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 19 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: THEME.border },
  infoIcon: { width: 30, fontSize: 18 },
  infoLabel: { flex: 1, fontSize: 13, color: THEME.muted, fontWeight: '700' },
  infoValue: { flex: 1.2, textAlign: 'right', fontSize: 13, color: THEME.text, fontWeight: '800' },
  placeholderCard: { backgroundColor: THEME.card, borderRadius: 26, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border, marginTop: 20 },
  placeholderIcon: { fontSize: 48, marginBottom: 14 },
  placeholderTitle: { fontSize: 22, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  placeholderDesc: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 21 },
  comingSoonText: { marginTop: 16, fontSize: 13, color: THEME.primary, fontWeight: '900' },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  secondaryButton: { backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  secondaryButtonText: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '900', overflow: 'hidden' },
});
