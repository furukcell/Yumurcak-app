// ============================================================
// YUMURCAK — teacherShared.js
// Öğretmen ekranları ortak tema, component ve Firebase verisi
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Geri</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backSpacer} />
      )}

      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {rightText ? (
        <TouchableOpacity style={styles.rightButton} onPress={onRightPress} activeOpacity={0.8}>
          <Text style={styles.rightButtonText}>{rightText}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backSpacer} />
      )}
    </View>
  );
}

export function LoadingState({ text = 'Hazırlanıyor...' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = '📌', title = 'Kayıt yok', desc = 'Veri eklendiğinde burada görünecek.' }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );
}

export function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value || '-'}</Text>
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

    listen('siniflar', setClasses, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('cocuklar', setChildren, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('kullanicilar', setUsers, (data) => data || {});
    listen('kresler', setKresler, (data) => data || {});
    listen('gunlukRaporlar', setReports, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('duyurular', setAnnouncements, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('yemekListeleri', setMeals, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('etkinlikler', setEvents, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('dersProgramlari', setSchedules, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('yoklamalar', setAttendance, (data) =>
      data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []
    );
    listen('medikalBilgiler', setMedicalMap, (data) => data || {});

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, []);

  const currentClass = useMemo(() => {
    if (!teacherId) return null;
    return (
      classes.find((item) => Array.isArray(item.ogretmenIds) && item.ogretmenIds.includes(teacherId)) ||
      classes.find((item) => item.id === kullanici?.sinifId) ||
      null
    );
  }, [classes, teacherId, kullanici?.sinifId]);

  const classChildren = useMemo(() => {
    if (!currentClass?.id) return [];
    return children
      .filter((child) => child.sinifId === currentClass.id)
      .sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr'));
  }, [children, currentClass?.id]);

  const kresId = currentClass?.kresId || kullanici?.kresId || classChildren[0]?.kresId || null;
  const kurum = kresId ? kresler[kresId] : null;

  const classReports = useMemo(() => {
    const childIds = new Set(classChildren.map((child) => child.id));
    return reports
      .filter((item) => childIds.has(item.cocukId))
      .sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));
  }, [reports, classChildren]);

  return {
    kullanici,
    cikisYap,
    teacherId,
    loading,
    users,
    kresId,
    kurum,
    currentClass,
    classChildren,
    reports: classReports,
    announcements,
    meals,
    events,
    schedules,
    attendance,
    medicalMap,
  };
}

export const sharedStyles = styles;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: THEME.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { width: 74, flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 28, color: THEME.primary, fontWeight: '800', marginRight: 3 },
  backLabel: { color: THEME.primary, fontWeight: '800' },
  backSpacer: { width: 74 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: THEME.primary },
  headerSubtitle: { fontSize: 12, color: THEME.muted, marginTop: 2, fontWeight: '600' },
  rightButton: { width: 74, alignItems: 'flex-end' },
  rightButtonText: { color: THEME.primary, fontWeight: '900' },
  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    margin: 16,
  },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: THEME.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  infoIcon: { width: 30, fontSize: 18 },
  infoLabel: { flex: 1, color: THEME.muted, fontWeight: '700' },
  infoValue: { flex: 1.2, color: THEME.text, fontWeight: '900', textAlign: 'right' },
});
