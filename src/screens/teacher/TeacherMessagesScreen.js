// ============================================================
// YUMURCAK — TeacherMessagesScreen.js
// FAZ 16: Okunmamış badge + son mesaj desteği
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName, getUserName } from './teacherShared';
import { safeUnread } from '../../utils/messageHelpers';

export default function TeacherMessagesScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, kurum, currentClass, classChildren, users } = useTeacherData();
  const [conversations, setConversations] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(database, 'mesajKonusmalari'), (snap) => {
      setConversations(snap.val() || {});
    });

    return () => unsub();
  }, []);

  const adminId = kurum?.yoneticiId || Object.entries(users || {}).find(([, u]) => u?.rol === 'yonetici' && (!u.kresId || u.kresId === kresId))?.[0] || null;

  const adminConversationId = teacherId && adminId ? `admin_${adminId}_ogretmen_${teacherId}` : null;
  const adminMeta = adminConversationId ? conversations[adminConversationId] || {} : {};

  const parentContacts = useMemo(() => {
    const list = [];

    classChildren.forEach((child) => {
      const veliIds = Array.isArray(child.veliIds) ? child.veliIds : [];
      veliIds.forEach((veliId) => {
        const veli = users[veliId];
        if (!veli) return;

        const conversationId = `veli_${veliId}_ogretmen_${teacherId}_cocuk_${child.id}`;
        const meta = conversations[conversationId] || {};

        list.push({
          type: 'parent',
          veliId,
          veli,
          child,
          conversationId,
          meta,
          unread: safeUnread(meta, teacherId),
          title: getUserName(veli),
          desc: meta.sonMesaj || getChildName(child),
          sonMesajAt: meta.sonMesajAt || 0,
        });
      });
    });

    return list
      .sort((a, b) => Number(b.sonMesajAt || 0) - Number(a.sonMesajAt || 0) || a.title.localeCompare(b.title, 'tr'))
      .slice(0, 20);
  }, [classChildren, users, conversations, teacherId]);

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
      <ScreenHeader navigation={navigation} title="Mesajlar" subtitle={currentClass?.ad || 'Sınıfım'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ContactCard
          icon="🏫"
          title="Kurum Yönetimi"
          desc={adminMeta.sonMesaj || kurum?.ad || 'Yönetim ile yazış'}
          sub="İdari ve sınıf konuları"
          unread={safeUnread(adminMeta, teacherId)}
          onPress={openAdminChat}
        />

        <Text style={styles.sectionTitle}>Sınıf Velileri</Text>
        {parentContacts.length === 0 ? (
          <EmptyState icon="👨‍👩‍👧" title="Veli bulunamadı" desc="Sınıfındaki çocuklara veli bağlanınca burada görünür." />
        ) : (
          parentContacts.map((contact) => (
            <ContactCard
              key={`${contact.veliId}_${contact.child.id}`}
              icon="👨‍👩‍👧"
              title={contact.title}
              desc={contact.desc}
              sub="Veli görüşmesi"
              unread={contact.unread}
              onPress={() => openParentChat(contact)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactCard({ icon, title, desc, sub, unread, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.desc} numberOfLines={1}>{desc}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 36 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 25 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: THEME.text, fontSize: 16, fontWeight: '900' },
  desc: { color: THEME.muted, marginTop: 3, fontWeight: '700' },
  sub: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: '600' },
  arrow: { color: THEME.primary, fontSize: 30, fontWeight: '900', marginLeft: 8 },
  unreadBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  unreadText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
});
