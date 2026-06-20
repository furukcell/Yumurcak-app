// ============================================================
// YUMURCAK — ParentMessagesScreen.js
// FAZ 16: Okunmamış badge + son mesaj desteği
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View, Text } from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, LoadingScreen, THEME, useParentBase } from './parentShared';
import { safeUnread } from '../../utils/messageHelpers';

export default function ParentMessagesScreen({ navigation }) {
  const base = useParentBase();
  const { loading, parentId, selectedChild, childName, kresId, kres, sinif, ogretmen, yonetici, parentName } = base;

  const [conversations, setConversations] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(database, 'mesajKonusmalari'), (snap) => {
      setConversations(snap.val() || {});
    });

    return () => unsub();
  }, []);

  const teacherId = useMemo(() => {
    if (selectedChild?.ogretmenId) return selectedChild.ogretmenId;
    if (sinif?.ogretmenIds?.[0]) return sinif.ogretmenIds[0];
    if (sinif?.ogretmenId) return sinif.ogretmenId;
    return ogretmen?.id || null;
  }, [selectedChild, sinif, ogretmen]);

  const adminId = kres?.yoneticiId || yonetici?.id || null;

  const teacherConversationId = selectedChild?.id && teacherId && parentId
    ? `veli_${parentId}_ogretmen_${teacherId}_cocuk_${selectedChild.id}`
    : null;

  const adminConversationId = adminId && parentId
    ? `admin_${adminId}_veli_${parentId}`
    : null;

  if (loading) return <LoadingScreen text="Mesajlar hazırlanıyor..." />;

  const openTeacherChat = async () => {
    if (!parentId || !teacherId || !selectedChild?.id) {
      Alert.alert('Eksik Bilgi', 'Öğretmen veya çocuk bağlantısı bulunamadı.');
      return;
    }

    const conversationId = `veli_${parentId}_ogretmen_${teacherId}_cocuk_${selectedChild.id}`;
    const title = getName(ogretmen) || 'Öğretmen';
    const now = Date.now();

    const conversationMeta = {
      ...(conversations[conversationId] || {}),
      id: conversationId,
      tip: 'veli_ogretmen',
      kresId: kresId || '',
      sinifId: selectedChild.sinifId || '',
      cocukId: selectedChild.id,
      veliId: parentId,
      ogretmenId: teacherId,
      katilimcilar: {
        [parentId]: true,
        [teacherId]: true,
      },
      roller: {
        [parentId]: 'veli',
        [teacherId]: 'ogretmen',
      },
      baslik: `${childName} · ${parentName}`,
      aktif: true,
      updatedAt: now,
    };

    await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);

    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title,
      subtitle: `${childName} için öğretmen görüşmesi`,
    });
  };

  const openAdminChat = async () => {
    if (!parentId || !adminId) {
      Alert.alert('Eksik Bilgi', 'Yönetici bilgisi bulunamadı. Kurum bilgilerinden yönetici atanmalı.');
      return;
    }

    const conversationId = `admin_${adminId}_veli_${parentId}`;
    const title = getName(yonetici) || kres?.yoneticiAd || 'Yönetim';
    const now = Date.now();

    const conversationMeta = {
      ...(conversations[conversationId] || {}),
      id: conversationId,
      tip: 'admin_veli',
      kresId: kresId || '',
      adminId,
      hedefId: parentId,
      hedefRol: 'veli',
      katilimcilar: {
        [adminId]: true,
        [parentId]: true,
      },
      roller: {
        [adminId]: 'yonetici',
        [parentId]: 'veli',
      },
      baslik: `${parentName} · ${kres?.ad || 'Kurum'}`,
      aktif: true,
      updatedAt: now,
    };

    await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);

    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title,
      subtitle: `${kres?.ad || 'Kurum'} yönetimi`,
    });
  };

  const adminMeta = adminConversationId ? conversations[adminConversationId] || {} : {};
  const teacherMeta = teacherConversationId ? conversations[teacherConversationId] || {} : {};

  return (
    <ScreenShell title="Mesajlar" emoji="💬" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bağlantısı yok" desc="Mesajlaşma için çocuğunuzun hesaba bağlı olması gerekir." />
      ) : (
        <>
          <ContactCard
            icon="🏫"
            title="Kurum Yönetimi"
            desc={adminMeta.sonMesaj || kres?.ad || 'Kurum ile yazış'}
            sub="Aidat, kayıt ve genel konular"
            unread={safeUnread(adminMeta, parentId)}
            onPress={openAdminChat}
          />
          <ContactCard
            icon="👩‍🏫"
            title={getName(ogretmen) || 'Öğretmen'}
            desc={teacherMeta.sonMesaj || childName}
            sub="Günlük durum ve sınıf konuları"
            unread={safeUnread(teacherMeta, parentId)}
            onPress={openTeacherChat}
          />
        </>
      )}
    </ScreenShell>
  );
}

function ContactCard({ icon, title, desc, sub, unread, onPress }) {
  return (
    <TouchableOpacity style={local.card} onPress={onPress} activeOpacity={0.85}>
      <View style={local.iconBox}>
        <Text style={local.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={local.titleRow}>
          <Text style={local.title} numberOfLines={1}>{title}</Text>
          {unread > 0 ? (
            <View style={local.unreadBadge}>
              <Text style={local.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={local.desc} numberOfLines={1}>{desc}</Text>
        <Text style={local.sub}>{sub}</Text>
      </View>
      <Text style={local.arrow}>›</Text>
    </TouchableOpacity>
  );
}

function getName(user) {
  if (!user) return '';
  return `${user.ad || ''} ${user.soyad || ''}`.trim() || user.kullaniciAdi || '';
}

const local = {
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
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  unreadText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
};
