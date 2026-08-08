import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';

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

function syncTheme(theme) {
  Object.assign(THEME, theme || {});
}

function useParentSharedStyles() {
  const { theme } = useAppTheme();
  syncTheme(theme);
  return useMemo(() => createStyles(theme || THEME), [theme]);
}

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
  return `${MONTH_LABELS[monthIndex] || monthKey || 'Ay'} ${year || ''}`.trim();
}

export function getDayKey(date = new Date()) {
  const keys = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
  return keys[date.getDay()] || 'pazartesi';
}

export function isAbsentStatus(status) {
  const value = String(status || '').toLowerCase().trim();
  return value === 'gelmedi' || value === 'devamsiz' || value === 'devamsız' || value === 'yok';
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

export function includesId(value, id) {
  if (!id) return false;
  return asArray(value).map((item) => String(item)).includes(String(id));
}

export function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function getProfilePhotoUrl(user) {
  return (
    user?.profilFotoUrl ||
    user?.profilePhotoUrl ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.avatarUrl ||
    user?.avatar ||
    ''
  );
}

export function toList(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function indexIds(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .filter(([, value]) => value !== false && value !== null)
    .map(([id]) => id);
}

function listenValue(path, onData, onError) {
  const r = ref(database, path);
  return onValue(
    r,
    (snap) => onData(snap.val()),
    () => {
      if (typeof onError === 'function') onError();
    }
  );
}

function compactUserMap(entries) {
  return entries.reduce((acc, [id, user]) => {
    if (id && user && Object.keys(user).length > 0) acc[id] = user;
    return acc;
  }, {});
}

export function useParentBase() {
  const { kullanici, cikisYap } = useAuth();
  const [children, setChildren] = useState([]);
  const [parentRecord, setParentRecord] = useState({});
  const [sinif, setSinif] = useState(null);
  const [kres, setKres] = useState(null);
  const [ogretmen, setOgretmen] = useState(null);
  const [yonetici, setYonetici] = useState(null);
  const [loading, setLoading] = useState(true);

  const parentId = kullanici?.uid || kullanici?.id;

  useEffect(() => {
    if (!parentId) {
      setParentRecord({});
      return undefined;
    }

    return listenValue(
      `kullanicilar/${parentId}`,
      (data) => setParentRecord(safeObject(data)),
      () => setParentRecord({})
    );
  }, [parentId]);

  useEffect(() => {
    if (!parentId) {
      setChildren([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let scopedUnsubs = [];
    let fallbackUnsub = null;
    let usingFallback = false;

    const cleanupScoped = () => {
      scopedUnsubs.forEach((unsub) => unsub && unsub());
      scopedUnsubs = [];
    };

    const cleanupFallback = () => {
      if (fallbackUnsub) fallbackUnsub();
      fallbackUnsub = null;
      usingFallback = false;
    };

    const startFallback = () => {
      cleanupScoped();
      if (usingFallback) return;
      usingFallback = true;

      fallbackUnsub = listenValue(
        'cocuklar',
        (data) => {
          const myChildren = [];
          if (data && typeof data === 'object') {
            Object.entries(data).forEach(([id, childData]) => {
              const child = safeObject(childData);
              if (includesId(child.veliIds, parentId) || child.veliId === parentId || child.parentId === parentId) {
                myChildren.push({ id, ...child });
              }
            });
          }
          setChildren(myChildren);
          setLoading(false);
        },
        () => {
          setChildren([]);
          setLoading(false);
        }
      );
    };

    const indexUnsub = listenValue(
      `veliCocuklari/${parentId}`,
      (data) => {
        const ids = indexIds(data);

        if (ids.length === 0) {
          startFallback();
          return;
        }

        cleanupFallback();
        cleanupScoped();

        const childMap = {};
        let loadedCount = 0;
        const publish = () => {
          setChildren(
            ids
              .map((id) => childMap[id])
              .filter(Boolean)
              .sort((a, b) => `${a.ad || a.adSoyad || ''}`.localeCompare(`${b.ad || b.adSoyad || ''}`, 'tr'))
          );
          setLoading(false);
        };

        ids.forEach((childId) => {
          const unsub = listenValue(
            `cocuklar/${childId}`,
            (childData) => {
              const child = safeObject(childData);
              if (Object.keys(child).length > 0) childMap[childId] = { id: childId, ...child };
              else delete childMap[childId];

              loadedCount += 1;
              if (loadedCount >= ids.length) publish();
              else setChildren(Object.values(childMap));
            },
            () => {
              loadedCount += 1;
              delete childMap[childId];
              if (loadedCount >= ids.length) publish();
            }
          );
          scopedUnsubs.push(unsub);
        });
      },
      startFallback
    );

    return () => {
      indexUnsub && indexUnsub();
      cleanupScoped();
      cleanupFallback();
    };
  }, [parentId]);

  const selectedChild = children[0] || null;
  const mergedKullanici = {
    ...safeObject(kullanici),
    ...safeObject(parentRecord),
    uid: kullanici?.uid || parentRecord.uid || parentId,
    id: kullanici?.id || parentRecord.id || parentId,
  };
  const parentPhotoUrl = getProfilePhotoUrl(mergedKullanici);

  const kresId = selectedChild?.kresId || mergedKullanici?.kresId || null;
  const sinifId = selectedChild?.sinifId || null;

  useEffect(() => {
    if (!sinifId) {
      setSinif(null);
      return undefined;
    }

    return listenValue(
      `siniflar/${sinifId}`,
      (data) => setSinif({ id: sinifId, ...safeObject(data) }),
      () => setSinif(null)
    );
  }, [sinifId]);

  useEffect(() => {
    if (!kresId) {
      setKres(null);
      return undefined;
    }

    return listenValue(
      `kresler/${kresId}`,
      (data) => setKres({ id: kresId, ...safeObject(data) }),
      () => setKres(null)
    );
  }, [kresId]);

  const ogretmenId = useMemo(() => {
    if (selectedChild?.ogretmenId) return selectedChild.ogretmenId;
    if (asArray(sinif?.ogretmenIds)[0]) return asArray(sinif?.ogretmenIds)[0];
    if (sinif?.ogretmenId) return sinif.ogretmenId;
    return null;
  }, [selectedChild, sinif]);

  const yoneticiId = kres?.yoneticiId || kres?.adminId || null;

  useEffect(() => {
    if (!ogretmenId) {
      setOgretmen(null);
      return undefined;
    }

    return listenValue(
      `kullanicilar/${ogretmenId}`,
      (data) => setOgretmen({ id: ogretmenId, ...safeObject(data) }),
      () => setOgretmen(null)
    );
  }, [ogretmenId]);

  useEffect(() => {
    if (!yoneticiId) {
      setYonetici(null);
      return undefined;
    }

    return listenValue(
      `kullanicilar/${yoneticiId}`,
      (data) => setYonetici({ id: yoneticiId, ...safeObject(data) }),
      () => setYonetici(null)
    );
  }, [yoneticiId]);

  const siniflar = useMemo(() => (sinifId && sinif ? { [sinifId]: sinif } : {}), [sinifId, sinif]);
  const kullanicilar = useMemo(
    () => compactUserMap([
      [parentId, parentRecord],
      [ogretmenId, ogretmen],
      [yoneticiId, yonetici],
    ]),
    [parentId, parentRecord, ogretmenId, ogretmen, yoneticiId, yonetici]
  );
  const kresler = useMemo(() => (kresId && kres ? { [kresId]: kres } : {}), [kresId, kres]);
  const kresAdi = kres?.ad || kres?.adi || 'Yumurcak';

  const childName = selectedChild
    ? `${selectedChild.ad || selectedChild.adSoyad || selectedChild.isim || 'Çocuğum'} ${selectedChild.soyad || ''}`.trim()
    : 'Çocuğum';

  const parentName =
    `${mergedKullanici?.ad || ''} ${mergedKullanici?.soyad || ''}`.trim() ||
    mergedKullanici?.kullaniciAdi ||
    mergedKullanici?.email ||
    'Veli';

  return {
    kullanici: mergedKullanici,
    parentRecord,
    parentPhotoUrl,
    cikisYap,
    parentId,
    children,
    selectedChild,
    childName,
    parentName,
    kresId,
    kresAdi,
    sinifId,
    sinif,
    kres,
    ogretmen,
    yonetici,
    siniflar,
    kullanicilar,
    kresler,
    loading,
  };
}

export function useNodeList(node, kresId) {
  const [list, setList] = useState([]);

  useEffect(() => {
    if (!node || !kresId) {
      setList([]);
      return undefined;
    }

    const q = query(ref(database, node), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => setList(toList(snap.val())), () => setList([]));
    return () => unsub();
  }, [node, kresId]);

  return list;
}

// Bir çocuğun belirli bir günü için Cloud Function'ın ürettiği AI günlük
// özetini dinler (gunlukYorumlar/{cocukId}/{dateKey}/yorum). Kayıt henüz
// yoksa (17:00 olmadı ya da o gün hiç veri girilmedi) '' döner.
export function useDailyAiComment(childId, dateKey) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!childId || !dateKey) {
      setComment('');
      return undefined;
    }

    const unsub = onValue(
      ref(database, `gunlukYorumlar/${childId}/${dateKey}/yorum`),
      (snap) => setComment(snap.val() || ''),
      () => setComment('')
    );
    return () => unsub();
  }, [childId, dateKey]);

  return comment;
}

export function ScreenShell({ title, emoji, navigation, children, subtitle }) {
  const themedStyles = useParentSharedStyles();
  const insets = useSafeAreaInsets();
  const canGoBack = !!navigation?.canGoBack?.();
  const bottomSafePadding = 96 + Math.max(insets.bottom || 0, 8);

  return (
    <SafeAreaView style={themedStyles.safeArea}>
      <View style={themedStyles.header}>
        {navigation && canGoBack ? (
          <TouchableOpacity style={themedStyles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Text style={themedStyles.backArrow}>‹</Text>
            <Text style={themedStyles.backLabel}>Geri</Text>
          </TouchableOpacity>
        ) : (
          <View style={themedStyles.backSpacer} />
        )}
        <View style={themedStyles.headerTitleWrap}>
          <Text style={themedStyles.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={themedStyles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <Text style={themedStyles.headerEmoji}>{emoji || ''}</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        style={themedStyles.screen}
        contentContainerStyle={[themedStyles.scrollContent, { paddingBottom: bottomSafePadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function LoadingScreen({ text = 'Hazırlanıyor...' }) {
  const themedStyles = useParentSharedStyles();

  return (
    <View style={themedStyles.center}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={themedStyles.loadingText}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'ℹ️', title, desc }) {
  const themedStyles = useParentSharedStyles();

  return (
    <View style={themedStyles.emptyStateCard}>
      <Text style={themedStyles.emptyIcon}>{icon}</Text>
      <Text style={themedStyles.emptyTitle}>{title}</Text>
      {desc ? <Text style={themedStyles.emptyDesc}>{desc}</Text> : null}
    </View>
  );
}

export function InfoRow({ icon, label, value }) {
  const themedStyles = useParentSharedStyles();

  return (
    <View style={themedStyles.infoRow}>
      <Text style={themedStyles.infoIcon}>{icon}</Text>
      <Text style={themedStyles.infoLabel}>{label}</Text>
      <Text style={themedStyles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

export function PlaceholderScreen({ navigation, icon, title, description }) {
  const themedStyles = useParentSharedStyles();

  return (
    <ScreenShell title={title} emoji={icon} navigation={navigation}>
      <View style={themedStyles.placeholderCard}>
        <Text style={themedStyles.placeholderIcon}>{icon}</Text>
        <Text style={themedStyles.placeholderTitle}>{title}</Text>
        <Text style={themedStyles.placeholderDesc}>{description || 'Bu alan yakında aktif olacak.'}</Text>
      </View>
    </ScreenShell>
  );
}

function createStyles(theme) {
  const t = { ...THEME, ...(theme || {}) };
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.bg,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    },
    screen: { flex: 1, backgroundColor: t.bg },
    scrollContent: { padding: 16, paddingBottom: 120 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    loadingText: { marginTop: 12, color: t.muted, fontWeight: '700' },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: t.bg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: { width: 74, flexDirection: 'row', alignItems: 'center' },
    backArrow: { fontSize: 28, color: t.primary, fontWeight: '800', marginRight: 3 },
    backLabel: { color: t.primary, fontWeight: '800' },
    backSpacer: { width: 74 },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: t.primary },
    headerSubtitle: { fontSize: 11, color: t.muted, marginTop: 2, fontWeight: '700' },
    headerEmoji: { width: 36, textAlign: 'right', fontSize: 21 },
    emptyStateCard: {
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '900', color: t.text, textAlign: 'center' },
    emptyDesc: { fontSize: 13, color: t.muted, marginTop: 5, textAlign: 'center', lineHeight: 18 },
    card: { backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border },
    cardTitle: { fontSize: 17, fontWeight: '900', color: t.text },
    cardText: { color: t.muted, marginTop: 6, fontWeight: '700', lineHeight: 19 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontWeight: '900', overflow: 'hidden' },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: t.text, marginTop: 8, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.border },
    infoIcon: { width: 26, fontSize: 17 },
    infoLabel: { width: 116, color: t.muted, fontWeight: '800' },
    infoValue: { flex: 1, color: t.text, fontWeight: '800' },
    secondaryButton: { backgroundColor: t.primarySoft, borderRadius: 14, padding: 13, alignItems: 'center', marginTop: 12 },
    secondaryButtonText: { color: t.primary, fontWeight: '900' },
    placeholderCard: {
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    placeholderIcon: { fontSize: 44, marginBottom: 10 },
    placeholderTitle: { fontSize: 18, fontWeight: '900', color: t.text },
    placeholderDesc: { color: t.muted, marginTop: 7, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
  });
}

export const styles = createStyles(THEME);
