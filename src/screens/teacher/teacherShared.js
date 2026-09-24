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
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
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

export const todayString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const formatDate = (value) => {
  if (!value) return '-';
  const raw = String(value);
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
};
export const getChildName = (child) => {
  if (!child) return i18n.t('common.childFallback');
  return `${child.ad || child.adSoyad || ''} ${child.soyad || ''}`.trim() || i18n.t('common.childFallback');
};
export const getUserName = (user) => {
  if (!user) return '-';
  return `${user.ad || ''} ${user.soyad || ''}`.trim() || user.kullaniciAdi || '-';
};

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function toList(data) {
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
  return onValue(r, (snapshot) => onData(snapshot.val()), () => {
    if (typeof onError === 'function') onError();
  });
}

// Rules artık bu node'larda çıplak "tüm node'u oku" isteğini reddediyor;
// sadece kresId'ye göre filtrelenmiş sorguya izin veriyor. Bu yüzden
// duyurular, yemekListeleri, etkinlikler, dersProgramlari, yoklamalar,
// gunlukRaporlar, medikalBilgiler burada kresId sorgusuyla çekiliyor.
function listenByKresId(path, kresId, onData, onError) {
  if (!kresId) {
    onData(null);
    return () => {};
  }
  const q = query(ref(database, path), orderByChild('kresId'), equalTo(kresId));
  return onValue(q, (snapshot) => onData(snapshot.val()), () => {
    if (typeof onError === 'function') onError();
  });
}

function uniqueIds(values) {
  return Array.from(new Set(values.filter(Boolean).map((id) => String(id))));
}

export function ScreenHeader({ title, subtitle, navigation, showBack = true, rightText, onRightPress }) {
  const { t } = useTranslation();
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.header}>
      {showBack ? (
        <TouchableOpacity style={themedStyles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={themedStyles.backArrow}>‹</Text>
          <Text style={themedStyles.backLabel}>{t('common.back')}</Text>
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

export function LoadingState({ text }) {
  const { t } = useTranslation();
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.center}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={themedStyles.loadingText}>{text || t('common.loading')}</Text>
    </View>
  );
}

export function EmptyState({ icon = '📌', title, desc }) {
  const themedStyles = useTeacherSharedStyles();
  return (
    <View style={themedStyles.emptyCard}>
      <Text style={themedStyles.emptyIcon}>{icon}</Text>
      {title ? <Text style={themedStyles.emptyTitle}>{title}</Text> : null}
      {desc ? <Text style={themedStyles.emptyDesc}>{desc}</Text> : null}
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
  const [currentClass, setCurrentClass] = useState(null);
  const [classChildren, setClassChildren] = useState([]);
  const [users, setUsers] = useState({});
  const [kresler, setKresler] = useState({});
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [meals, setMeals] = useState([]);
  const [events, setEvents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [medicalMap, setMedicalMap] = useState({});
  const [dutyRoster, setDutyRoster] = useState([]);

  useEffect(() => {
    if (!teacherId) {
      setCurrentClass(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let classUnsub = null;
    let fallbackUnsub = null;

    const clearClassListener = () => {
      if (classUnsub) classUnsub();
      classUnsub = null;
    };

    const startFallback = () => {
      clearClassListener();
      if (fallbackUnsub) return;
      fallbackUnsub = listenValue('siniflar', (data) => {
        const classes = toList(data);
        const found = classes.find((item) => asArray(item.ogretmenIds).includes(teacherId)) ||
          classes.find((item) => item.ogretmenId === teacherId || item.id === kullanici?.sinifId) ||
          null;
        setCurrentClass(found);
        setLoading(false);
      }, () => {
        setCurrentClass(null);
        setLoading(false);
      });
    };

    const indexUnsub = listenValue(`ogretmenSiniflari/${teacherId}`, (data) => {
      const ids = indexIds(data);
      const classId = ids[0] || kullanici?.sinifId || null;
      if (!classId) {
        startFallback();
        return;
      }

      if (fallbackUnsub) {
        fallbackUnsub();
        fallbackUnsub = null;
      }
      clearClassListener();
      classUnsub = listenValue(`siniflar/${classId}`, (classData) => {
        const classObj = safeObject(classData);
        if (Object.keys(classObj).length === 0) {
          startFallback();
          return;
        }
        setCurrentClass({ id: classId, ...classObj });
        setLoading(false);
      }, startFallback);
    }, startFallback);

    return () => {
      indexUnsub && indexUnsub();
      clearClassListener();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [teacherId, kullanici?.sinifId]);

  useEffect(() => {
    const classId = currentClass?.id;
    if (!classId) {
      setClassChildren([]);
      return undefined;
    }

    let childUnsubs = [];
    let fallbackUnsub = null;

    const clearChildListeners = () => {
      childUnsubs.forEach((unsub) => unsub && unsub());
      childUnsubs = [];
    };

    const startFallback = () => {
      clearChildListeners();
      if (fallbackUnsub) return;
      fallbackUnsub = listenValue('cocuklar', (data) => {
        const children = toList(data)
          .filter((child) => child.sinifId === classId)
          .sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr'));
        setClassChildren(children);
      }, () => setClassChildren([]));
    };

    const indexUnsub = listenValue(`sinifCocuklari/${classId}`, (data) => {
      const ids = indexIds(data);
      if (ids.length === 0) {
        startFallback();
        return;
      }

      if (fallbackUnsub) {
        fallbackUnsub();
        fallbackUnsub = null;
      }
      clearChildListeners();
      const childMap = {};
      let loadedCount = 0;
      const publish = () => {
        setClassChildren(
          ids
            .map((id) => childMap[id])
            .filter(Boolean)
            .sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr'))
        );
      };

      ids.forEach((childId) => {
        const unsub = listenValue(`cocuklar/${childId}`, (childData) => {
          const child = safeObject(childData);
          if (Object.keys(child).length > 0) childMap[childId] = { id: childId, ...child };
          else delete childMap[childId];
          loadedCount += 1;
          if (loadedCount >= ids.length) publish();
          else setClassChildren(Object.values(childMap));
        }, () => {
          loadedCount += 1;
          delete childMap[childId];
          if (loadedCount >= ids.length) publish();
        });
        childUnsubs.push(unsub);
      });
    }, startFallback);

    return () => {
      indexUnsub && indexUnsub();
      clearChildListeners();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [currentClass?.id]);

  // FAZ 10 — Önceden currentClass?.kresId önce geliyordu. Eğer sınıf kaydındaki
  // kresId, öğretmenin kendi kullanıcı kaydındaki kresId'den farklıysa (veri
  // tutarsızlığı), admin panelinden kullanici.kresId ile yayınlanan aylık liste
  // öğretmen ekranında kresId eşleşmediği için hiç görünmüyordu. Admin panelinin
  // kullandığı önceliğe (kullanici.kresId) hizalandı.
  const kresId = kullanici?.kresId || currentClass?.kresId || classChildren[0]?.kresId || null;
  const kurum = kresId ? kresler[kresId] : null;
  const kresAdi = kurum?.ad || 'Yumurcak';

  useEffect(() => {
    if (!kresId) {
      setKresler({});
      return undefined;
    }
    return listenValue(`kresler/${kresId}`, (data) => setKresler({ [kresId]: { id: kresId, ...safeObject(data) } }), () => setKresler({}));
  }, [kresId]);

  const parentIds = useMemo(() => uniqueIds(classChildren.flatMap((child) => [...asArray(child.veliIds), child.veliId, child.parentId])), [classChildren]);
  const adminId = kurum?.yoneticiId || kurum?.adminId || null;

  useEffect(() => {
    const ids = uniqueIds([teacherId, adminId, ...parentIds]);
    if (ids.length === 0) {
      setUsers({});
      return undefined;
    }

    const map = {};
    const unsubs = ids.map((userId) => listenValue(`kullanicilar/${userId}`, (userData) => {
      const user = safeObject(userData);
      if (Object.keys(user).length > 0) map[userId] = { id: userId, ...user };
      else delete map[userId];
      setUsers({ ...map });
    }, () => {
      delete map[userId];
      setUsers({ ...map });
    }));

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [teacherId, adminId, parentIds.join('|')]);

  useEffect(() => {
    if (!kresId) {
      setReports([]);
      setAnnouncements([]);
      setMeals([]);
      setEvents([]);
      setSchedules([]);
      setAttendance([]);
      setMedicalMap({});
      setDutyRoster([]);
      return undefined;
    }

    const unsubs = [];
    const listenList = (path, setter) => {
      const unsub = listenByKresId(path, kresId, (data) => setter(toList(data)), () => setter([]));
      unsubs.push(unsub);
    };

    listenList('gunlukRaporlar', setReports);
    listenList('duyurular', setAnnouncements);
    listenList('yemekListeleri', setMeals);
    listenList('etkinlikler', setEvents);
    listenList('dersProgramlari', setSchedules);
    listenList('yoklamalar', setAttendance);
    listenList('nobetCizelgeleri', setDutyRoster);

    const medicalUnsub = listenByKresId('medikalBilgiler', kresId, (data) => setMedicalMap(data || {}), () => setMedicalMap({}));
    unsubs.push(medicalUnsub);

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [kresId]);

  const classReports = useMemo(() => {
    const childIds = new Set(classChildren.map((child) => child.id));
    return reports.filter((item) => childIds.has(item.cocukId)).sort((a, b) => String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || '')));
  }, [reports, classChildren]);

  return { kullanici, cikisYap, teacherId, loading, users, kresId, kurum, kresAdi, currentClass, classChildren, reports: classReports, announcements, meals, events, schedules, attendance, medicalMap, dutyRoster };
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
