// ============================================================
// YUMURCAK — AdminMessagesScreen.js
// FAZ 7: Yönetici <-> veli / öğretmen mesajlaşma
// Firebase:
/// mesajKonusmalari/{conversationId}
/// mesajlar/{conversationId}/{messageId}
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export default function AdminMessagesScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();

  const adminId = kullanici?.uid || kullanici?.id;
  const kresId = kullanici?.kresId || 'kres001';

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const [classes, setClasses] = useState({});
  const [children, setChildren] = useState({});
  const [kres, setKres] = useState(null);
  const [conversations, setConversations] = useState({});
  const [tab, setTab] = useState('all');

  useEffect(() => {
    const unsubs = [];
    const listen = (path, setter) => {
      const r = ref(database, path);
      const unsub = onValue(r, (snap) => {
        setter(snap.val() || {});
        setLoading(false);
      });
      unsubs.push(unsub);
    };

    listen('kullanicilar', setUsers);
    listen('siniflar', setClasses);
    listen('cocuklar', setChildren);
    listen('mesajKonusmalari', setConversations);

    const kresUnsub = onValue(ref(database, `kresler/${kresId}`), (snap) => {
      setKres(snap.val() || null);
      setLoading(false);
    });
    unsubs.push(kresUnsub);

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [kresId]);

  const contacts = useMemo(() => {
    const list = Object.entries(users)
      .map(([id, user]) => ({ id, ...user }))
      .filter((user) => user.aktif !== false)
      .filter((user) => user.id !== adminId)
      .filter((user) => user.rol === 'veli' || user.rol === 'ogretmen')
      .filter((user) => !user.kresId || user.kresId === kresId)
      .map((user) => {
        const role = user.rol;
        const conversationId = getConversationId(adminId, role, user.id);
        const meta = conversations[conversationId] || {};
        const childInfo = role === 'veli' ? getParentChildrenText(user.id, children, classes) : getTeacherClassText(user.id, classes);
        return {
          ...user,
          role,
          conversationId,
          childInfo,
          sonMesaj: meta.sonMesaj || '',
          sonMesajAt: meta.sonMesajAt || 0,
        };
      })
      .filter((user) => tab === 'all' || user.role === tab)
      .sort((a, b) => Number(b.sonMesajAt || 0) - Number(a.sonMesajAt || 0) || getUserName(a).localeCompare(getUserName(b), 'tr'));

    return list;
  }, [users, children, classes, conversations, adminId, kresId, tab]);

  const openChat = async (contact) => {
    const now = Date.now();
    const conversationMeta = {
      id: contact.conversationId,
      tip: contact.role === 'veli' ? 'admin_veli' : 'admin_ogretmen',
      kresId,
      adminId,
      hedefId: contact.id,
      hedefRol: contact.role,
      katilimcilar: {
        [adminId]: true,
        [contact.id]: true,
      },
      roller: {
        [adminId]: 'yonetici',
        [contact.id]: contact.role,
      },
      baslik: getUserName(contact),
      updatedAt: now,
      aktif: true,
    };

    await update(ref(database, `mesajKonusmalari/${contact.conversationId}`), conversationMeta);

    navigation.navigate('MessageDetail', {
      conversationId: contact.conversationId,
      conversationMeta,
      title: getUserName(contact),
      subtitle: contact.role === 'veli' ? `Veli · ${contact.childInfo || kres?.ad || ''}` : `Öğretmen · ${contact.childInfo || kres?.ad || ''}`,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Mesajlar hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>💬</Text>
          <Text style={styles.heroTitle}>Mesajlar</Text>
          <Text style={styles.heroDesc}>{kres?.ad || 'Kurum'} veli ve öğretmen görüşmeleri</Text>
        </View>

        <View style={styles.tabs}>
          <TabButton label="Tümü" active={tab === 'all'} onPress={() => setTab('all')} />
          <TabButton label="Veliler" active={tab === 'veli'} onPress={() => setTab('veli')} />
          <TabButton label="Öğretmenler" active={tab === 'ogretmen'} onPress={() => setTab('ogretmen')} />
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Kişi bulunamadı</Text>
            <Text style={styles.emptyDesc}>Veli veya öğretmen eklendiğinde burada görünür.</Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <TouchableOpacity key={`${contact.role}_${contact.id}`} style={styles.card} onPress={() => openChat(contact)} activeOpacity={0.85}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.role === 'veli' ? '👨‍👩‍👧' : '👩‍🏫'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{getUserName(contact)}</Text>
                  <Text style={[styles.badge, contact.role === 'veli' ? styles.parentBadge : styles.teacherBadge]}>
                    {contact.role === 'veli' ? 'Veli' : 'Öğretmen'}
                  </Text>
                </View>
                <Text style={styles.desc} numberOfLines={1}>{contact.childInfo || 'Kurum kullanıcısı'}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{contact.sonMesaj || 'Henüz mesaj yok'}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getConversationId(adminId, role, userId) {
  return `admin_${adminId}_${role}_${userId}`;
}

function getUserName(user) {
  return `${user?.ad || ''} ${user?.soyad || ''}`.trim() || user?.kullaniciAdi || 'Kullanıcı';
}

function getParentChildrenText(parentId, children, classes) {
  const linked = Object.values(children || {}).filter((child) => child?.veliIds?.includes(parentId));
  if (linked.length === 0) return '';
  return linked
    .map((child) => {
      const childName = `${child.ad || child.adSoyad || 'Çocuk'} ${child.soyad || ''}`.trim();
      const className = child.sinifId ? classes?.[child.sinifId]?.ad : '';
      return className ? `${childName} · ${className}` : childName;
    })
    .join(', ');
}

function getTeacherClassText(teacherId, classes) {
  const cls = Object.values(classes || {}).find((item) => Array.isArray(item.ogretmenIds) && item.ogretmenIds.includes(teacherId));
  return cls?.ad || '';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 42 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 14 },
  heroIcon: { fontSize: 42, marginBottom: 8 },
  heroTitle: { color: '#FFF', fontSize: 23, fontWeight: '900' },
  heroDesc: { color: 'rgba(255,255,255,0.82)', marginTop: 5, fontWeight: '700', textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabButton: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  tabButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  tabText: { color: THEME.text, fontWeight: '900' },
  tabTextActive: { color: '#FFF' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 23 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: THEME.text, fontWeight: '900', fontSize: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11 },
  parentBadge: { backgroundColor: '#E8F9EF', color: THEME.green },
  teacherBadge: { backgroundColor: THEME.primarySoft, color: THEME.primary },
  desc: { color: THEME.muted, marginTop: 4, fontWeight: '700' },
  lastMessage: { color: THEME.muted, marginTop: 5, fontSize: 12, fontWeight: '600' },
  arrow: { color: THEME.primary, fontSize: 28, fontWeight: '900', marginLeft: 8 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { color: THEME.text, fontWeight: '900', fontSize: 17 },
  emptyDesc: { color: THEME.muted, marginTop: 5, textAlign: 'center' },
});
