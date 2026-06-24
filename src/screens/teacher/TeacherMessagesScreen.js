// ============================================================
// YUMURCAK — TeacherMessagesScreen.js
// Öğretmen mesaj merkezi - modern inbox görünümü
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View, Text, SafeAreaView, ScrollView, StyleSheet, TextInput } from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName, getUserName } from './teacherShared';
import { safeUnread } from '../../utils/messageHelpers';

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;

  if (date.getTime() >= startToday) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (date.getTime() >= startYesterday) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function normalizeText(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

export default function TeacherMessagesScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, kurum, currentClass, classChildren, users } = useTeacherData();
  const [conversations, setConversations] = useState({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(database, 'mesajKonusmalari'), (snap) => {
      setConversations(snap.val() || {});
    });

    return () => unsub();
  }, []);

  const adminId = kurum?.yoneticiId || Object.entries(users || {}).find(([, u]) => u?.rol === 'yonetici' && (!u.kresId || u.kresId === kresId))?.[0] || null;

  const adminConversationId = teacherId && adminId ? `admin_${adminId}_ogretmen_${teacherId}` : null;
  const adminMeta = adminConversationId ? conversations[adminConversationId] || {} : {};
  const adminUnread = safeUnread(adminMeta, teacherId);

  const parentContacts = useMemo(() => {
    const list = [];

    classChildren.forEach((child) => {
      const veliIds = Array.isArray(child.veliIds) ? child.veliIds : [];
      veliIds.forEach((veliId) => {
        const veli = users[veliId];
        if (!veli) return;

        const conversationId = `veli_${veliId}_ogretmen_${teacherId}_cocuk_${child.id}`;
        const meta = conversations[conversationId] || {};
        const title = getUserName(veli);
        const childName = getChildName(child);
        const desc = meta.sonMesaj || 'Henüz mesaj yok';

        list.push({
          type: 'parent',
          veliId,
          veli,
          child,
          childName,
          conversationId,
          meta,
          unread: safeUnread(meta, teacherId),
          title,
          desc,
          sonMesajAt: meta.sonMesajAt || meta.updatedAt || 0,
        });
      });
    });

    return list
      .sort((a, b) => Number(b.sonMesajAt || 0) - Number(a.sonMesajAt || 0) || a.title.localeCompare(b.title, 'tr'))
      .slice(0, 40);
  }, [classChildren, users, conversations, teacherId]);

  const filteredContacts = useMemo(() => {
    const search = normalizeText(query);

    return parentContacts.filter((contact) => {
      if (filter === 'unread' && contact.unread <= 0) return false;
      if (filter === 'parents' && contact.type !== 'parent') return false;
      if (search) {
        const haystack = normalizeText(`${contact.title} ${contact.childName} ${contact.desc}`);
        return haystack.includes(search);
      }
      return true;
    });
  }, [parentContacts, query, filter]);

  const unreadTotal = useMemo(() => {
    return adminUnread + parentContacts.reduce((sum, item) => sum + Number(item.unread || 0), 0);
  }, [adminUnread, parentContacts]);

  if (loading) return <LoadingState text="Mesajlar hazırlanıyor..." />;

  const openAdminChat = async () => {
    if (!teacherId || !adminId) {
      Alert.alert('Eksik Bilgi', 'Yönetici bilgisi bulunamadı.');
      return;
    }

    const conversationId = `admin_${adminId}_ogretmen_${teacherId}`;
    const now = Date.now();

    const conversationMeta = {
      ...(conversations[conversationId] || {}),
      id: conversationId,
      tip: 'admin_ogretmen',
      kresId: kresId || '',
      adminId,
      hedefId: teacherId,
      hedefRol: 'ogretmen',
      katilimcilar: {
        [adminId]: true,
        [teacherId]: true,
      },
      roller: {
        [adminId]: 'yonetici',
        [teacherId]: 'ogretmen',
      },
      baslik: `${currentClass?.ad || 'Sınıf'} · Öğretmen`,
      aktif: true,
      updatedAt: now,
    };

    await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);

    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title: kurum?.yoneticiAd || 'Yönetim',
      subtitle: kurum?.ad || 'Kurum yönetimi',
    });
  };

  const openParentChat = async (contact) => {
    if (!teacherId || !contact?.veliId || !contact?.child?.id) {
      Alert.alert('Eksik Bilgi', 'Veli veya çocuk bilgisi bulunamadı.');
      return;
    }

    const conversationId = `veli_${contact.veliId}_ogretmen_${teacherId}_cocuk_${contact.child.id}`;
    const now = Date.now();

    const conversationMeta = {
      ...(conversations[conversationId] || {}),
      id: conversationId,
      tip: 'veli_ogretmen',
      kresId: kresId || '',
      sinifId: contact.child.sinifId || currentClass?.id || '',
      cocukId: contact.child.id,
      veliId: contact.veliId,
      ogretmenId: teacherId,
      katilimcilar: {
        [contact.veliId]: true,
        [teacherId]: true,
      },
      roller: {
        [contact.veliId]: 'veli',
        [teacherId]: 'ogretmen',
      },
      baslik: `${getChildName(contact.child)} · ${getUserName(contact.veli)}`,
      aktif: true,
      updatedAt: now,
    };

    await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);

    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title: getUserName(contact.veli),
      subtitle: `${getChildName(contact.child)} velisi`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Mesajlar" subtitle={currentClass?.ad || 'Sınıfım'} rightText="✎ Yeni" onRightPress={() => setFilter('parents')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Kişi veya çocuk ara..."
            placeholderTextColor="#8A8EA3"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.85}>
              <Text style={styles.clearSearch}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <FilterChip active={filter === 'all'} label="Tümü" onPress={() => setFilter('all')} />
          <FilterChip active={filter === 'unread'} label={`Okunmamış${unreadTotal ? ` ${unreadTotal}` : ''}`} onPress={() => setFilter('unread')} />
          <FilterChip active={filter === 'parents'} label="Veliler" onPress={() => setFilter('parents')} />
          <FilterChip active={filter === 'management'} label="Yönetim" onPress={() => setFilter('management')} />
        </View>

        {showInfo ? (
          <View style={styles.infoBanner}>
            <View style={styles.infoIconBox}><Text style={styles.infoIcon}>💬</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Mesajlaşmayı kolaylaştırın</Text>
              <Text style={styles.infoText}>Kurum yönetimi ve sınıf velileriyle hızlıca iletişim kurabilirsiniz.</Text>
            </View>
            <TouchableOpacity onPress={() => setShowInfo(false)} activeOpacity={0.85}>
              <Text style={styles.closeInfo}>×</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filter !== 'parents' && filter !== 'unread' ? (
          <ContactCard
            icon="🏫"
            title="Kurum Yönetimi"
            desc={adminMeta.sonMesaj || kurum?.ad || 'Yönetim ile yazış'}
            sub="İdari ve sınıf konuları"
            unread={adminUnread}
            time={formatMessageTime(adminMeta.sonMesajAt || adminMeta.updatedAt)}
            tag="Resmi"
            highlight
            onPress={openAdminChat}
          />
        ) : null}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Sınıf Velileri</Text>
          <Text style={styles.sectionAction}>{filteredContacts.length} kişi</Text>
        </View>

        {filteredContacts.length === 0 ? (
          <EmptyState icon="👨‍👩‍👧" title="Mesaj bulunamadı" desc="Arama veya filtreyi değiştirerek tekrar deneyebilirsin." />
        ) : (
          <View style={styles.parentListWrap}>
            {filteredContacts.map((contact) => (
              <ContactCard
                key={`${contact.veliId}_${contact.child.id}`}
                icon="👨‍👩‍👧"
                title={contact.title}
                desc={contact.desc}
                sub={`${contact.childName} velisi`}
                unread={contact.unread}
                time={formatMessageTime(contact.sonMesajAt)}
                onPress={() => openParentChat(contact)}
              />
            ))}
          </View>
        )}

        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}><Text style={styles.securityIcon}>🔒</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Güvenli İletişim</Text>
            <Text style={styles.securityText}>Mesajlar sadece ilgili kurum, öğretmen ve veli hesapları arasında görüntülenir.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ContactCard({ icon, title, desc, sub, unread, time, tag, highlight, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, highlight && styles.managementCard]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconBox, highlight && styles.managementIconBox]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread > 0 && styles.titleUnread]} numberOfLines={1}>{title}</Text>
          {tag ? <Text style={styles.tagPill}>{tag}</Text> : null}
        </View>
        <Text style={styles.subLine} numberOfLines={1}>{sub}</Text>
        <Text style={[styles.desc, unread > 0 && styles.descUnread]} numberOfLines={1}>{desc}</Text>
      </View>
      <View style={styles.rightCol}>
        {time ? <Text style={styles.timeText}>{time}</Text> : null}
        {unread > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 36 },
  searchBox: { backgroundColor: THEME.card, borderRadius: 20, paddingHorizontal: 14, minHeight: 58, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  searchIcon: { color: THEME.muted, fontSize: 28, marginRight: 8, marginTop: -2 },
  searchInput: { flex: 1, color: THEME.text, fontWeight: '800', fontSize: 15, paddingVertical: 10 },
  clearSearch: { color: THEME.muted, fontSize: 26, fontWeight: '900', paddingHorizontal: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { backgroundColor: '#F7FCFF', borderWidth: 1, borderColor: '#D9E8FF', borderRadius: 99, paddingHorizontal: 13, paddingVertical: 9 },
  filterChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: '#FFF' },
  infoBanner: { backgroundColor: '#F3EEFF', borderWidth: 1, borderColor: '#DFD3FF', borderRadius: 24, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  infoIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E5DAFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoIcon: { fontSize: 32 },
  infoTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  infoText: { color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 19 },
  closeInfo: { color: THEME.text, fontSize: 28, paddingHorizontal: 6, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: THEME.text },
  sectionAction: { color: THEME.primary, fontWeight: '900', fontSize: 13 },
  parentListWrap: { borderRadius: 24, overflow: 'hidden', marginBottom: 12 },
  card: { backgroundColor: THEME.card, borderRadius: 24, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 11, elevation: 2 },
  managementCard: { minHeight: 108, marginBottom: 18 },
  iconBox: { width: 62, height: 62, borderRadius: 20, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  managementIconBox: { width: 72, height: 72, borderRadius: 22 },
  icon: { fontSize: 31 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: THEME.text, fontSize: 17, fontWeight: '900' },
  titleUnread: { color: THEME.primary },
  tagPill: { backgroundColor: THEME.primarySoft, color: THEME.primary, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontWeight: '900', fontSize: 11 },
  subLine: { color: THEME.muted, marginTop: 5, fontWeight: '800', fontSize: 13 },
  desc: { color: THEME.muted, marginTop: 5, fontWeight: '700', fontSize: 13 },
  descUnread: { color: THEME.text, fontWeight: '900' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8, minWidth: 44 },
  timeText: { color: THEME.muted, fontWeight: '900', fontSize: 12, marginBottom: 6 },
  arrow: { color: THEME.primary, fontSize: 30, fontWeight: '900', marginTop: 2 },
  unreadBadge: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginBottom: 2 },
  unreadText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  securityCard: { backgroundColor: '#F3EEFF', borderWidth: 1, borderColor: '#DFD3FF', borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  securityIconBox: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#E5DAFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  securityIcon: { fontSize: 30 },
  securityTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  securityText: { color: THEME.muted, fontWeight: '700', lineHeight: 18, marginTop: 4 },
});