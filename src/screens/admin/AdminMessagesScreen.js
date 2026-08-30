// ============================================================
// YUMURCAK — AdminMessagesScreen.js
// FAZ 16: Son 20 görüşme + okunmamış badge
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { safeUnread } from '../../utils/messageHelpers';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
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
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('all');
  const [drawerQuery, setDrawerQuery] = useState('');

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

  const allContacts = useMemo(() => {
    return Object.entries(users)
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
          unread: safeUnread(meta, adminId),
          meta,
        };
      })
      .sort((a, b) => Number(b.sonMesajAt || 0) - Number(a.sonMesajAt || 0) || getUserName(a).localeCompare(getUserName(b), 'tr'));
  }, [users, children, classes, conversations, adminId, kresId]);

  const contacts = useMemo(() => {
    return allContacts.filter((user) => tab === 'all' || user.role === tab).slice(0, 20);
  }, [allContacts, tab]);

  const drawerContacts = useMemo(() => {
    const q = drawerQuery.trim().toLocaleLowerCase('tr-TR');
    return allContacts
      .filter((user) => drawerTab === 'all' || user.role === drawerTab)
      .filter((user) => !q || getUserName(user).toLocaleLowerCase('tr-TR').includes(q) || (user.childInfo || '').toLocaleLowerCase('tr-TR').includes(q));
  }, [allContacts, drawerTab, drawerQuery]);

  const openChat = async (contact) => {
    const now = Date.now();
    const conversationMeta = {
      ...(conversations[contact.conversationId] || {}),
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

    setNewMessageOpen(false);
    navigation.navigate('MessageDetail', {
      conversationId: contact.conversationId,
      conversationMeta,
      title: getUserName(contact),
      subtitle: contact.role === 'veli' ? `Veli · ${contact.childInfo || kres?.ad || ''}` : `Öğretmen · ${contact.childInfo || kres?.ad || ''}`,
    });

    try {
      await update(ref(database, `mesajKonusmalari/${contact.conversationId}`), conversationMeta);
    } catch (error) {
      console.warn('Konuşma meta verisi güncellenemedi:', error?.message || error);
    }
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
          <Text style={styles.heroDesc}>{kres?.ad || 'Kurum'} son 20 görüşme</Text>
          <TouchableOpacity style={styles.newMessageButton} onPress={() => setNewMessageOpen(true)} activeOpacity={0.85}>
            <Text style={styles.newMessageButtonText}>✎ Yeni Mesaj</Text>
          </TouchableOpacity>
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
                  <Text style={[styles.name, contact.unread > 0 && styles.nameUnread]} numberOfLines={1}>{getUserName(contact)}</Text>
                  {contact.unread > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{contact.unread > 99 ? '99+' : contact.unread}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.desc} numberOfLines={1}>{contact.childInfo || 'Kurum kullanıcısı'}</Text>
                <Text style={[styles.lastMessage, contact.unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>{contact.sonMesaj || 'Henüz mesaj yok'}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={newMessageOpen} transparent animationType="slide" onRequestClose={() => setNewMessageOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setNewMessageOpen(false)} />
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>Yeni Mesaj Başlat</Text>
                <Text style={styles.drawerSubtitle}>Veli veya öğretmen seç, sohbete direkt başla</Text>
              </View>
              <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setNewMessageOpen(false)} activeOpacity={0.85}>
                <Text style={styles.drawerCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerSearchBox}>
              <Text style={styles.drawerSearchIcon}>⌕</Text>
              <TextInput
                style={styles.drawerSearchInput}
                value={drawerQuery}
                onChangeText={setDrawerQuery}
                placeholder="Kişi ara..."
                placeholderTextColor="#8A8EA3"
              />
            </View>

            <View style={styles.tabs}>
              <TabButton label="Tümü" active={drawerTab === 'all'} onPress={() => setDrawerTab('all')} />
              <TabButton label="Veliler" active={drawerTab === 'veli'} onPress={() => setDrawerTab('veli')} />
              <TabButton label="Öğretmenler" active={drawerTab === 'ogretmen'} onPress={() => setDrawerTab('ogretmen')} />
            </View>

            <ScrollView style={styles.drawerList} showsVerticalScrollIndicator={false}>
              {drawerContacts.length === 0 ? (
                <View style={styles.drawerEmpty}>
                  <Text style={styles.drawerEmptyIcon}>📭</Text>
                  <Text style={styles.drawerEmptyTitle}>Kişi bulunamadı</Text>
                </View>
              ) : (
                drawerContacts.map((contact) => (
                  <TouchableOpacity key={`${contact.role}_${contact.id}_drawer`} style={styles.drawerContactRow} onPress={() => openChat(contact)} activeOpacity={0.85}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{contact.role === 'veli' ? '👨‍👩‍👧' : '👩‍🏫'}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.drawerContactTitle} numberOfLines={1}>{getUserName(contact)}</Text>
                      <Text style={styles.drawerContactSub} numberOfLines={1}>{contact.childInfo || 'Kurum kullanıcısı'}</Text>
                    </View>
                    {contact.unread > 0 ? <Text style={styles.drawerUnread}>{contact.unread > 99 ? '99+' : contact.unread}</Text> : null}
                    <Text style={styles.arrow}>›</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  newMessageButton: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  newMessageButtonText: { color: '#FFF', fontWeight: '900' },
  drawerOverlay: { flex: 1, justifyContent: 'flex-end' },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,20,0.45)' },
  drawerSheet: { backgroundColor: THEME.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, maxHeight: '82%' },
  drawerHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: THEME.border, alignSelf: 'center', marginBottom: 14 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  drawerTitle: { fontSize: 19, fontWeight: '900', color: THEME.text },
  drawerSubtitle: { color: THEME.muted, fontWeight: '700', marginTop: 3, fontSize: 12 },
  drawerCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },
  drawerCloseText: { fontSize: 18, color: THEME.muted, fontWeight: '900', lineHeight: 18 },
  drawerSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, marginBottom: 12 },
  drawerSearchIcon: { color: THEME.muted, marginRight: 8, fontSize: 16 },
  drawerSearchInput: { flex: 1, paddingVertical: 10, color: THEME.text, fontWeight: '700' },
  drawerList: { marginTop: 4 },
  drawerContactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: 16, padding: 12, marginBottom: 9, borderWidth: 1, borderColor: THEME.border },
  drawerContactTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  drawerContactSub: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 2 },
  drawerUnread: { backgroundColor: '#FF4D6D', color: '#FFF', fontWeight: '900', fontSize: 11, minWidth: 20, height: 20, borderRadius: 10, textAlign: 'center', textAlignVertical: 'center', marginRight: 6, overflow: 'hidden' },
  drawerEmpty: { alignItems: 'center', paddingVertical: 30 },
  drawerEmptyIcon: { fontSize: 36, marginBottom: 8 },
  drawerEmptyTitle: { color: THEME.muted, fontWeight: '800' },
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
  nameUnread: { color: THEME.primary },
  desc: { color: THEME.muted, marginTop: 4, fontWeight: '700' },
  lastMessage: { color: THEME.muted, marginTop: 5, fontSize: 12, fontWeight: '600' },
  lastMessageUnread: { color: THEME.text, fontWeight: '900' },
  arrow: { color: THEME.primary, fontSize: 28, fontWeight: '900', marginLeft: 8 },
  unreadBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  unreadText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { color: THEME.text, fontWeight: '900', fontSize: 17 },
  emptyDesc: { color: THEME.muted, marginTop: 5, textAlign: 'center' },
});
