// ============================================================
// YUMURCAK — ParentMessagesScreen.js
// Veli mesaj merkezi - kurum ve öğretmen sohbetleri
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, LoadingScreen, THEME, useParentBase } from './parentShared';
import { safeUnread } from '../../utils/messageHelpers';

function formatMessageTime(value, t) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;

  if (date.getTime() >= startToday) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (date.getTime() >= startYesterday) return t('parent.messages.yesterday');
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function getLastTime(meta, t) {
  return formatMessageTime(meta?.sonMesajAt || meta?.updatedAt || meta?.createdAt || 0, t);
}

export default function ParentMessagesScreen({ navigation }) {
  const { t } = useTranslation();
  const base = useParentBase();
  const { loading, parentId, selectedChild, childName, kresId, kres, sinif, ogretmen, yonetici, parentName } = base;

  const [conversations, setConversations] = useState({});
  const [showInfo, setShowInfo] = useState(true);

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

  if (loading) return <LoadingScreen text={t('parent.messages.loading')} />;

  const openTeacherChat = async () => {
    if (!parentId || !teacherId || !selectedChild?.id) {
      Alert.alert(t('parent.messages.missingInfoTitle'), t('parent.messages.missingTeacherInfo'));
      return;
    }

    const conversationId = `veli_${parentId}_ogretmen_${teacherId}_cocuk_${selectedChild.id}`;
    const title = getName(ogretmen) || t('parent.messages.teacherFallback');
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
      subtitle: t('parent.messages.teacherConversationSubtitle', { childName }),
    });
  };

  const openAdminChat = async () => {
    if (!parentId || !adminId) {
      Alert.alert(t('parent.messages.missingInfoTitle'), t('parent.messages.missingAdminInfo'));
      return;
    }

    const conversationId = `admin_${adminId}_veli_${parentId}`;
    const title = getName(yonetici) || kres?.yoneticiAd || t('parent.messages.managementFallback');
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
      baslik: `${parentName} · ${kres?.ad || t('parent.messages.institutionFallback')}`,
      aktif: true,
      updatedAt: now,
    };

    await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);

    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title,
      subtitle: t('parent.messages.adminConversationSubtitle', { institution: kres?.ad || t('parent.messages.institutionFallback') }),
    });
  };

  const adminMeta = adminConversationId ? conversations[adminConversationId] || {} : {};
  const teacherMeta = teacherConversationId ? conversations[teacherConversationId] || {} : {};
  const adminUnread = safeUnread(adminMeta, parentId);
  const teacherUnread = safeUnread(teacherMeta, parentId);

  return (
    <ScreenShell title={t('nav.messages')} emoji="💬" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.messages.noChildTitle')} desc={t('parent.messages.noChildDesc')} />
      ) : (
        <>
          {showInfo ? (
            <View style={local.infoBanner}>
              <View style={local.infoIconBox}><Text style={local.infoIcon}>💬</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={local.infoText}>{t('parent.messages.infoBannerText')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInfo(false)} activeOpacity={0.85}>
                <Text style={local.infoClose}>♡</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ContactCard
            icon="🏫"
            title={t('parent.messages.institutionManagement')}
            desc={adminMeta.sonMesaj || kres?.ad || t('parent.messages.chatWithInstitution')}
            sub={t('parent.messages.adminCardSub')}
            unread={adminUnread}
            time={getLastTime(adminMeta, t)}
            tag={t('parent.messages.officialTag')}
            highlight
            onPress={openAdminChat}
          />

          <View style={local.sectionRow}>
            <Text style={local.sectionTitle}>{t('parent.messages.teachersTitle')}</Text>
            <Text style={local.sectionAction}>{t('parent.messages.forChild', { childName: childName || t('parent.messages.childFallback') })}</Text>
          </View>

          <ContactCard
            icon="👩‍🏫"
            title={getName(ogretmen) || t('parent.messages.teacherFallback')}
            desc={teacherMeta.sonMesaj || t('parent.messages.startTeacherChat')}
            sub={t('parent.messages.classTeacherSub')}
            unread={teacherUnread}
            time={getLastTime(teacherMeta, t)}
            onPress={openTeacherChat}
          />

          <View style={local.securityCard}>
            <View style={local.securityIconBox}><Text style={local.securityIcon}>🔒</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={local.securityTitle}>{t('parent.messages.secureCommunicationTitle')}</Text>
              <Text style={local.securityText}>{t('parent.messages.secureCommunicationText')}</Text>
            </View>
            <Text style={local.securityDecor}>🛡️</Text>
          </View>
        </>
      )}
    </ScreenShell>
  );
}

function ContactCard({ icon, title, desc, sub, unread, time, tag, highlight, onPress }) {
  return (
    <TouchableOpacity style={[local.card, highlight && local.managementCard]} onPress={onPress} activeOpacity={0.85}>
      <View style={[local.iconBox, highlight && local.managementIconBox]}>
        <Text style={local.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={local.titleRow}>
          <Text style={[local.title, unread > 0 && local.titleUnread]} numberOfLines={1}>{title}</Text>
          {tag ? <Text style={local.tagPill}>{tag}</Text> : null}
        </View>
        <Text style={local.sub} numberOfLines={1}>{sub}</Text>
        <Text style={[local.desc, unread > 0 && local.descUnread]} numberOfLines={1}>{desc}</Text>
      </View>
      <View style={local.rightCol}>
        {time ? <Text style={local.timeText}>{time}</Text> : null}
        {unread > 0 ? (
          <View style={local.unreadBadge}>
            <Text style={local.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
        <Text style={local.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function getName(user) {
  if (!user) return '';
  return `${user.ad || ''} ${user.soyad || ''}`.trim() || user.kullaniciAdi || '';
}

const local = StyleSheet.create({
  infoBanner: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: '#D9D3FF',
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  infoIconBox: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoIcon: { fontSize: 36 },
  infoText: { color: THEME.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  infoClose: { color: THEME.primary, fontSize: 28, fontWeight: '900', paddingHorizontal: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 21, fontWeight: '900', color: THEME.text },
  sectionAction: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 11,
    elevation: 2,
  },
  managementCard: { minHeight: 108, marginBottom: 20 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  managementIconBox: { width: 74, height: 74, borderRadius: 24 },
  icon: { fontSize: 33 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: THEME.text, fontSize: 18, fontWeight: '900' },
  titleUnread: { color: THEME.primary },
  tagPill: { backgroundColor: THEME.primarySoft, color: THEME.primary, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontWeight: '900', fontSize: 11 },
  sub: { color: THEME.primary, marginTop: 5, fontWeight: '900', fontSize: 14 },
  desc: { color: THEME.muted, marginTop: 6, fontWeight: '700', fontSize: 13 },
  descUnread: { color: THEME.text, fontWeight: '900' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8, minWidth: 44 },
  timeText: { color: THEME.muted, fontWeight: '900', fontSize: 12, marginBottom: 7 },
  arrow: { color: THEME.primary, fontSize: 32, fontWeight: '900', marginTop: 2 },
  unreadBadge: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginBottom: 3 },
  unreadText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  securityCard: {
    backgroundColor: '#F3FAFF',
    borderWidth: 1,
    borderColor: '#BEE3FF',
    borderRadius: 24,
    padding: 14,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#DCEFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  securityIcon: { fontSize: 31 },
  securityTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  securityText: { color: THEME.text, fontWeight: '700', lineHeight: 19, marginTop: 4 },
  securityDecor: { color: THEME.primary, fontSize: 28, marginLeft: 8 },
});
