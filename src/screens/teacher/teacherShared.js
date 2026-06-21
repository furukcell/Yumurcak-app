import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';

export const THEME = {
  primary: '#6C3DEB', primaryDark: '#4B22B8', primarySoft: '#EFE8FF',
  orange: '#FF9F1C', green: '#20B45B', red: '#FF4D6D', blue: '#3A7BFF',
  text: '#191A23', muted: '#707386', bg: '#F8F6FF', card: '#FFFFFF', border: '#EEEAF8',
};

function syncTheme(theme) { Object.assign(THEME, theme || {}); }
function useTeacherSharedStyles() {
  const { theme } = useAppTheme();
  syncTheme(theme);
  return useMemo(() => createStyles(theme || THEME), [theme]);
}

export const todayString = () => new Date().toISOString().split('T')[0];
export const formatDate = (value) => {
  if (!value) return '-';
  const raw = String(value);
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
};
export const getChildName = (child) => {
  if (!child) return 'Çocuk';
  return `${child.ad || child.adSoyad || ''} ${child.soyad || ''}`.trim() || 'Çocuk';
};
export const getUserName = (user) => {
  if (!user) return '-';
  return `${user.ad || ''} ${user.soyad || ''}`.trim() || user.kullaniciAdi || '-';
};

export function ScreenHeader({ title, subtitle, navigation, showBack = true, rightText, onRightPress }) {
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.header}>
      {showBack ? (
        <TouchableOpacity style={themedStyles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={themedStyles.backArrow}>‹</Text>
          <Text style={themedStyles.backLabel}>Geri</Text>
        </TouchableOpacity>
      ) : (<View style={themedStyles.backSpacer} />)}
      <View style={themedStyles.headerTitleWrap}>
        <Text style={themedStyles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={themedStyles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {rightText ? (
        <TouchableOpacity style={themedStyles.rightButton} onPress={onRightPress} activeOpacity={0.8}>
          <Text style={themedStyles.rightButtonText}>{rightText}</Text>
        </TouchableOpacity>
      ) : (<View style={themedStyles.backSpacer} />)}
    </View>
  );
}

export function LoadingState({ text = 'Hazırlanıyor...' }) {
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.center}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={themedStyles.loadingText}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = '📌', title = 'Kayıt yok', desc = 'Veri eklendiğinde burada görünecek.' }) {
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.emptyCard}>
      <Text style={themedStyles.emptyIcon}>{icon}</Text>
      <Text style={themedStyles.emptyTitle}>{title}</Text>
      <Text style={themedStyles.emptyDesc}>{desc}</Text>
    </View>
  );
}

export function InfoRow({ icon, label, value }) {
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.infoRow}>
      <Text style={themedStyles.infoIcon}>{icon}</Text>
      <Text style={themedStyles.infoLabel}>{label}</Text>
      <Text style={themedStyles.infoValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );
}

export function useTeacherData() {
  const { kullanici, cikisYap } = useAuth();
  const teacherId = kullanici?.uid || kullanici?.id;
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [children, setChildren] = useState([]);
  const [users, setUsers] = useState({});
  const [kresler, setKresler] = useState({});
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [meals, setMeals] = useState([]);
  const [events, setEvents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [medicalMap, setMedicalMap] = useState({});

  useEffect(() => {
    const unsubs = [];
    const listen = (path, setter, mapper) => {
      const r = ref(database, path);
      const unsub = onValue(r, (snapshot) => {
        const data = snapshot.val();
        setter(mapper ? mapper(data) : data || {});
        setLoading(false);
      });
      unsubs.push(unsub);
    };
    listen('siniflar', setClasses, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('cocuklar', setChildren, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('kullanicilar', setUsers, (data) => data || {});
    listen('kresler', setKresler, (data) => data || {});
    listen('gunlukRaporlar', setReports, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('duyurular', setAnnouncements, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('yemekListeleri', setMeals, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('etkinlikler', setEvents, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('dersProgramlari', setSchedules, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('yoklamalar', setAttendance, (data) => data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    listen('medikalBilgiler', setMedicalMap, (data) => data || {});
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, []);

  const currentClass = useMemo(() => {
    if (!teacherId) return null;
    return classes.find((item) => Array.isArray(item.ogretmenIds) && item.ogretmenIds.includes(teacherId)) || classes.find((item) => item.id === kullanici?.sinifId) || null;
  }, [classes, teacherId, kullanici?.sinifId]);

  const classChildren = useMemo(() => {
    if (!currentClass?.id) return [];
    return children.filter((child) => child.sinifId === currentClass.id).sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr'));
  }, [children, currentClass?.id]);

  const kresId = currentClass?.kresId || kullanici?.kresId || classChildren[0]?.kresId || null;
  const kurum = kresId ? kresler[kresId] : null;
  const kresAdi = kurum?.ad || 'Yumurcak';

  const classReports = useMemo(() => {
    const childIds = new Set(classChildren.map((child) => child.id));
    return reports.filter((item) => childIds.has(item.cocukId)).sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));
  }, [reports, classChildren]);

  return { kullanici, cikisYap, teacherId, loading, users, kresId, kurum, kresAdi, currentClass, classChildren, reports: classReports, announcements, meals, events, schedules, attendance, medicalMap };
}

function createStyles(theme) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    loadingText: { marginTop: 12, color: theme.muted, fontWeight: '700' },
    header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight || 0) + 6) : 12, paddingBottom: 12, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'center' },
    backButton: { width: 74, flexDirection: 'row', alignItems: 'center' },
    backArrow: { fontSize: 28, color: theme.primary, fontWeight: '800', marginRight: 3 },
    backLabel: { color: theme.primary, fontWeight: '800' },
    backSpacer: { width: 74 },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: theme.primary },
    headerSubtitle: { fontSize: 12, color: theme.muted, marginTop: 2, fontWeight: '700' },
    rightButton: { width: 74, alignItems: 'flex-end' },
    rightButtonText: { color: theme.primary, fontWeight: '900' },
    emptyCard: { backgroundColor: theme.card, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '900', color: theme.text, textAlign: 'center' },
    emptyDesc: { fontSize: 13, color: theme.muted, marginTop: 5, textAlign: 'center', lineHeight: 18 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    infoIcon: { width: 26, fontSize: 17 },
    infoLabel: { width: 116, color: theme.muted, fontWeight: '800' },
    infoValue: { flex: 1, color: theme.text, fontWeight: '800' },
  });
}

const styles = createStyles(THEME);
export const sharedStyles = styles;
