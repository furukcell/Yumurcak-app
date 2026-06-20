// ============================================================
// YUMURCAK — AdminAuthMigrationScreen.js
// FAZ 11 v2: Modern Yumurcak arayüzü
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, ref, set, update } from 'firebase/database';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { database, firebaseConfig } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { usernameToEmail } from '../../utils/authHelpers';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function AdminAuthMigrationScreen({ navigation }) {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || 'kres001';

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(database, 'kullanicilar'));
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, user]) => ({ id, uid: id, ...user }))
        .filter((user) => user.aktif !== false)
        .filter((user) => !user.kresId || user.kresId === kresId)
        .sort((a, b) => String(a.rol || '').localeCompare(String(b.rol || ''), 'tr'));

      setUsers(list);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const migrated = users.filter((u) => !!u.authUid).length;
    return { total, migrated, waiting: total - migrated };
  }, [users]);

  const addLog = (message) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString('tr-TR')} · ${message}`, ...prev].slice(0, 80));
  };

  const runMigration = async () => {
    if (running) return;

    Alert.alert(
      'Firebase Auth Geçişi',
      'authUid olmayan kullanıcılar için Firebase Auth hesabı oluşturulacak. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Başlat', onPress: startMigration },
      ]
    );
  };

  const startMigration = async () => {
    setRunning(true);

    try {
      const secondaryAuth = getSecondaryAuth();
      const candidates = users.filter((u) => !u.authUid);

      if (candidates.length === 0) {
        addLog('Taşınacak kullanıcı yok.');
        setRunning(false);
        return;
      }

      for (const user of candidates) {
        try {
          const username = user.kullaniciAdi || user.username || user.userName || user.id;
          const email = usernameToEmail(username);
          const password = String(user.sifre || user.password || '123456');

          if (password.length < 6) {
            addLog(`Atlandı: ${username} şifre en az 6 karakter olmalı.`);
            continue;
          }

          const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          const authUid = credential.user.uid;

          await update(ref(database, `kullanicilar/${user.id}`), {
            authUid,
            email,
            authProvider: 'firebase',
            authMigratedAt: Date.now(),
            updatedAt: Date.now(),
          });

          await set(ref(database, `authKullaniciIndex/${authUid}`), user.id);

          addLog(`Tamam: ${username} -> ${email}`);
        } catch (error) {
          const username = user.kullaniciAdi || user.id;
          if (error?.code === 'auth/email-already-in-use') {
            addLog(`Zaten var: ${username}. Firebase Console'da email var; manuel eşleştirme gerekebilir.`);
          } else {
            addLog(`Hata: ${username} -> ${error?.code || error?.message || 'bilinmeyen hata'}`);
          }
        }
      }

      await signOut(secondaryAuth).catch(() => {});
      await loadUsers();
      Alert.alert('Tamamlandı', 'Firebase Auth geçiş denemesi tamamlandı.');
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Auth geçiş işlemi başlatılamadı.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Auth geçiş ekranı hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Firebase Auth</Text>
          <Text style={styles.headerSub}>Yumurcak Geçiş Paneli</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🔐</Text>
          <Text style={styles.heroTitle}>Güvenli Giriş Geçişi</Text>
          <Text style={styles.heroDesc}>Kullanıcıları Firebase Auth sistemine taşı ve üretim güvenliğine hazırla.</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Toplam" value={stats.total} />
          <Stat label="Taşınmış" value={stats.migrated} />
          <Stat label="Bekleyen" value={stats.waiting} />
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Önemli Not</Text>
          <Text style={styles.warningText}>
            Production rules'a geçmeden önce tüm kullanıcıların authUid alması ve 3 rolün giriş testinden geçmesi gerekir.
          </Text>
        </View>

        <TouchableOpacity style={[styles.runButton, running && { opacity: 0.6 }]} onPress={runMigration} disabled={running}>
          {running ? <ActivityIndicator color="#FFF" /> : <Text style={styles.runText}>Auth Geçişini Başlat</Text>}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Kullanıcılar</Text>
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{getUserName(user)}</Text>
              <Text style={styles.userMeta}>{user.rol || '-'} · {user.kullaniciAdi || user.email || user.id}</Text>
              <Text style={styles.userMeta}>{user.authUid ? `authUid: ${shortUid(user.authUid)}` : 'Auth bekliyor'}</Text>
            </View>
            <Text style={[styles.statusBadge, user.authUid ? styles.doneBadge : styles.waitBadge]}>
              {user.authUid ? 'Tamam' : 'Bekliyor'}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Log</Text>
        {logs.length === 0 ? (
          <View style={styles.logEmpty}><Text style={styles.logText}>Henüz işlem yok.</Text></View>
        ) : (
          logs.map((line, index) => (
            <View key={`${line}_${index}`} style={styles.logLine}>
              <Text style={styles.logText}>{line}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getSecondaryAuth() {
  const name = 'yumurcak-auth-migration';
  const existing = getApps().find((app) => app.name === name);
  const app = existing || initializeApp(firebaseConfig, name);
  return getAuth(app);
}

function getUserName(user) {
  return `${user?.ad || ''} ${user?.soyad || ''}`.trim() || user?.ad || user?.kullaniciAdi || 'Kullanıcı';
}

function shortUid(uid) {
  if (!uid) return '';
  if (uid.length <= 14) return uid;
  return `${uid.slice(0, 8)}...${uid.slice(-4)}`;
}

function Stat({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  customHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: THEME.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { width: 74, flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 28, color: THEME.primary, fontWeight: '900', marginRight: 2 },
  backText: { color: THEME.primary, fontWeight: '900' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: THEME.primary, fontSize: 20, fontWeight: '900' },
  headerSub: { color: THEME.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  headerRight: { width: 74 },
  content: { padding: 16, paddingBottom: 44 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 14 },
  heroIcon: { fontSize: 42, marginBottom: 8 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  heroDesc: { color: 'rgba(255,255,255,0.82)', marginTop: 5, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: THEME.card, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  statValue: { color: THEME.primary, fontSize: 24, fontWeight: '900' },
  statLabel: { color: THEME.muted, fontWeight: '800', marginTop: 3 },
  warningCard: { backgroundColor: '#FFF5D9', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#FFE1A1', marginBottom: 12 },
  warningTitle: { color: '#8A6500', fontWeight: '900', fontSize: 16, marginBottom: 6 },
  warningText: { color: '#7A5A00', fontWeight: '700', lineHeight: 20 },
  runButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 18 },
  runText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 10, marginTop: 8 },
  userCard: { backgroundColor: THEME.card, borderRadius: 16, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  userName: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  userMeta: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11 },
  doneBadge: { backgroundColor: '#E8F9EF', color: THEME.green },
  waitBadge: { backgroundColor: '#FFF4E1', color: THEME.orange },
  logEmpty: { backgroundColor: THEME.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: THEME.border },
  logLine: { backgroundColor: THEME.card, borderRadius: 12, padding: 10, marginBottom: 7, borderWidth: 1, borderColor: THEME.border },
  logText: { color: THEME.muted, fontWeight: '700', lineHeight: 18 },
});
