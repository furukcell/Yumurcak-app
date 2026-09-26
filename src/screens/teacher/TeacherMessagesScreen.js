// ============================================================
// YUMURCAK — TeacherMessagesScreen.js
// Öğretmen mesaj merkezi - çekmeceli yeni mesaj seçimi
// FAZ 18: Artık tüm 'mesajKonusmalari' node'u çekilmiyor, sadece
// bu öğretmeni ilgilendiren (deterministik id'li) konuşmalar tek tek dinleniyor.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, TouchableOpacity, View, Text, SafeAreaView, ScrollView, StyleSheet, TextInput, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName, getUserName } from './teacherShared';
import { safeUnread } from '../../utils/messageHelpers';

function formatMessageTime(value, t, lang) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;

  if (date.getTime() >= startToday) return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (date.getTime() >= startYesterday) return t('parent.messages.yesterday');
  return date.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' });
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

export default function TeacherMessagesScreen() {
  const { t, i18n } = useTranslation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
  const navigation = useNavigation();
  const { loading, teacherId, kresId, kurum, currentClass, classChildren, users } = useTeacherData();
  const [conversations, setConversations] = useState({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showInfo, setShowInfo] = useState(true);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const adminId = kurum?.yoneticiId || Object.entries(users || {}).find(([, u]) => u?.rol === 'yonetici' && (!u.kresId || u.kresId === kresId))?.[0] || null;
  const adminConversationId = teacherId && adminId ? `admin_${adminId}_ogretmen_${teacherId}` : null;

  // Bu öğretmeni ilgilendiren konuşma id'leri deterministik olarak hesaplanıyor,
  // tüm 'mesajKonusmalari' node'u çekilmeden sadece bu id'ler tek tek dinleniyor.
  const conversationIds = useMemo(() => {
    const ids = [];
    if (adminConversationId) ids.push(adminConversationId);

    classChildren.forEach((child) => {
      const veliIds = Array.isArray(child.veliIds) ? child.veliIds : [];
      veliIds.forEach((veliId) => {
        if (!users[veliId]) return;
        ids.push(`veli_${veliId}_ogretmen_${teacherId}_cocuk_${child.id}`);
      });
    });

    return ids;
  }, [adminConversationId, classChildren, users, teacherId]);

  useEffect(() => {
    if (conversationIds.length === 0) {
      setConversations({});
      return undefined;
    }

    const map = {};
    const unsubs = conversationIds.map((id) => onValue(ref(database, `mesajKonusmalari/${id}`), (snap) => {
      const val = snap.val();
      if (val) map[id] = val;
      else delete map[id];
      setConversations({ ...map });
    }, () => {
      delete map[id];
      setConversations({ ...map });
    }));

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [conversationIds.join('|')]);

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
        const desc = meta.sonMesaj || t('teacher.messages.noMessageYet');

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
  }, [classChildren, users, conversations, teacherId, t]);

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

  if (loading) return <LoadingState text={t('teacher.messages.loading')} />;

  const openAdminChat = async () => {
    if (!teacherId || !adminId) {
      Alert.alert(t('teacher.messages.missingInfoTitle'), t('teacher.messages.missingAdminDesc'));
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

    setNewMessageOpen(false);
    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title: kurum?.yoneticiAd || t('teacher.messages.adminTitleFallback'),
      subtitle: kurum?.ad || t('teacher.messages.adminSubtitleFallback'),
    });

    try {
      await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);
    } catch (error) {
      console.warn('Konuşma meta verisi güncellenemedi:', error?.message || error);
    }
  };

  const openParentChat = async (contact) => {
    if (!teacherId || !contact?.veliId || !contact?.child?.id) {
      Alert.alert(t('teacher.messages.missingInfoTitle'), t('teacher.messages.missingParentChildDesc'));
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

    // FAZ FIX — "Mesajlara girince veli ile sohbete tıklayınca tepki yok
    // hiç girmiyor" hatası: burada daha önce hiç var olmayan bir
    // "drawerQuery" state'ini setDrawerQuery('') ile sıfırlamaya
    // çalışıyorduk. drawerQuery hiç tanımlı değildi, bu yüzden bu satır
    // her tıklamada ReferenceError fırlatıp navigation.navigate'e hiç
    // ulaşılmasını engelliyordu — kullanıcı tıklıyor ama ekran hiç açılmıyordu.
    // Ayrıca navigasyonu artık veritabanı yazma işleminin (await update)
    // başarılı olmasına bağımlı tutmuyoruz: önce sohbete giriyoruz, meta
    // güncellemesi arka planda devam ediyor — bir ağ/izin sorunu olsa bile
    // tıklama artık "tepkisiz" kalmıyor.
    setNewMessageOpen(false);
    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta,
      title: getUserName(contact.veli),
      subtitle: t('teacher.messages.parentSubtitle', { childName: getChildName(contact.child) }),
    });

    try {
      await update(ref(database, `mesajKonusmalari/${conversationId}`), conversationMeta);
    } catch (error) {
      console.warn('Konuşma meta verisi güncellenemedi:', error?.message || error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View onLayout={onHeaderLayout}>
        <ScreenHeader navigation={navigation} title={t('teacher.messages.title')} subtitle={currentClass?.ad || t('teacher.messages.classFallback')} rightText={t('teacher.messages.newButton')} onRightPress={() => setNewMessageOpen(true)} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('teacher.messages.searchPlaceholder')}
            placeholderTextColor="#8A8EA3"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.85}>
              <Text style={styles.clearSearch}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <FilterChip active={filter === 'all'} label={t('teacher.messages.filterAll')} onPress={() => setFilter('all')} />
          <FilterChip active={filter === 'unread'} label={`${t('teacher.messages.filterUnread')}${unreadTotal ? ` ${unreadTotal}` : ''}`} onPress={() => setFilter('unread')} />
          <FilterChip active={filter === 'parents'} label={t('teacher.messages.filterParents')} onPress={() => setFilter('parents')} />
          <FilterChip active={filter === 'management'} label={t('teacher.messages.filterManagement')} onPress={() => setFilter('management')} />
        </View>

        {showInfo ? (
          <View style={styles.infoBanner}>
            <View style={styles.infoIconBox}><Text style={styles.infoIcon}>💬</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{t('teacher.messages.infoTitle')}</Text>
              <Text style={styles.infoText}>{t('teacher.messages.infoText')}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowInfo(false)} activeOpacity={0.85}>
              <Text style={styles.closeInfo}>×</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filter !== 'parents' && filter !== 'unread' ? (
          <ContactCard
            icon="🏫"
            title={t('teacher.messages.adminCardTitle')}
            desc={adminMeta.sonMesaj || kurum?.ad || t('teacher.messages.adminCardDesc')}
            sub={t('teacher.messages.adminCardSub')}
            unread={adminUnread}
            time={formatMessageTime(adminMeta.sonMesajAt || adminMeta.updatedAt, t, i18n.language)}
            tag={t('teacher.messages.officialTag')}
            highlight
            onPress={openAdminChat}
          />
        ) : null}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('teacher.messages.sectionTitle')}</Text>
          <Text style={styles.sectionAction}>{filteredContacts.length} {t('teacher.messages.peopleCountSuffix')}</Text>
        </View>

        {filteredContacts.length === 0 ? (
          <EmptyState icon="👨‍👩‍👧" title={t('teacher.messages.emptyTitle')} desc={t('teacher.messages.emptyDesc')} />
        ) : (
          <View style={styles.parentListWrap}>
            {filteredContacts.map((contact) => (
              <ContactCard
                key={`${contact.veliId}_${contact.child.id}`}
                icon="👨‍👩‍👧"
                title={contact.title}
                desc={contact.desc}
                sub={t('teacher.messages.parentSubtitle', { childName: contact.childName })}
                unread={contact.unread}
                time={formatMessageTime(contact.sonMesajAt, t, i18n.language)}
                onPress={() => openParentChat(contact)}
              />
            ))}
          </View>
        )}

        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}><Text style={styles.securityIcon}>🔒</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>{t('teacher.messages.securityTitle')}</Text>
            <Text style={styles.securityText}>{t('teacher.messages.securityText')}</Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={newMessageOpen} transparent animationType="slide" onRequestClose={() => setNewMessageOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setNewMessageOpen(false)} />
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>{t('teacher.messages.drawerTitle')}</Text>
                <Text style={styles.drawerSubtitle}>{t('teacher.messages.drawerSubtitle')}</Text>
              </View>
              <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setNewMessageOpen(false)} activeOpacity={0.85}>
                <Text style={styles.drawerCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.drawerAdminCard} onPress={openAdminChat} activeOpacity={0.85}>
              <View style={styles.drawerIconBox}><Text style={styles.drawerIcon}>🏫</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerContactTitle}>{t('teacher.messages.adminCardTitle')}</Text>
                <Text style={styles.drawerContactSub}>{t('teacher.messages.adminCardSub')}</Text>
              </View>
              <Text style={styles.drawerArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.drawerSectionRow}>
              <Text style={styles.drawerSectionTitle}>{t('teacher.messages.sectionTitle')}</Text>
              <Text style={styles.drawerCount}>{parentContacts.length} {t('teacher.messages.peopleCountSuffix')}</Text>
            </View>

            <ScrollView style={styles.drawerList} showsVerticalScrollIndicator={false}>
              {parentContacts.length === 0 ? (
                <View style={styles.drawerEmpty}>
                  <Text style={styles.drawerEmptyIcon}>👨‍👩‍👧</Text>
                  <Text style={styles.drawerEmptyTitle}>{t('teacher.messages.drawerEmptyTitle')}</Text>
                  <Text style={styles.drawerEmptyText}>{t('teacher.messages.drawerEmptyText')}</Text>
                </View>
              ) : (
                parentContacts.map((contact) => (
                  <TouchableOpacity key={`${contact.veliId}_${contact.child.id}_drawer`} style={styles.drawerContactRow} onPress={() => openParentChat(contact)} activeOpacity={0.85}>
                    <View style={styles.drawerParentIconBox}><Text style={styles.drawerParentIcon}>👨‍👩‍👧</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.drawerContactTitle} numberOfLines={1}>{contact.title}</Text>
                      <Text style={styles.drawerContactSub} numberOfLines={1}>{t('teacher.messages.parentSubtitle', { childName: contact.childName })}</Text>
                    </View>
                    {contact.unread > 0 ? <Text style={styles.drawerUnread}>{contact.unread > 99 ? '99+' : contact.unread}</Text> : null}
                    <Text style={styles.drawerArrow}>›</Text>
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
  drawerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject },
  drawerSheet: { maxHeight: '86%', backgroundColor: THEME.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16, paddingBottom: 24, borderWidth: 1, borderColor: THEME.border },
  drawerHandle: { width: 52, height: 5, borderRadius: 99, backgroundColor: '#D5D9E8', alignSelf: 'center', marginBottom: 12 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  drawerTitle: { color: THEME.text, fontWeight: '900', fontSize: 21 },
  drawerSubtitle: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  drawerCloseButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  drawerCloseText: { color: THEME.text, fontSize: 26, fontWeight: '700', marginTop: -2 },
  drawerSearchBox: { backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 12, minHeight: 54, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  drawerAdminCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  drawerIconBox: { width: 58, height: 58, borderRadius: 19, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  drawerIcon: { fontSize: 29 },
  drawerSectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  drawerSectionTitle: { flex: 1, color: THEME.text, fontWeight: '900', fontSize: 17 },
  drawerCount: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  drawerList: { maxHeight: 430 },
  drawerContactRow: { backgroundColor: THEME.card, borderRadius: 18, padding: 11, marginBottom: 9, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  drawerParentIconBox: { width: 52, height: 52, borderRadius: 17, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  drawerParentIcon: { fontSize: 25 },
  drawerContactTitle: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  drawerContactSub: { color: THEME.muted, fontWeight: '700', marginTop: 4, fontSize: 12 },
  drawerUnread: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: THEME.primary, color: '#FFF', overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', fontSize: 12, marginRight: 6 },
  drawerArrow: { color: THEME.primary, fontSize: 28, fontWeight: '900', marginLeft: 6 },
  drawerEmpty: { alignItems: 'center', paddingVertical: 24 },
  drawerEmptyIcon: { fontSize: 36, marginBottom: 8 },
  drawerEmptyTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  drawerEmptyText: { color: THEME.muted, fontWeight: '700', marginTop: 4, textAlign: 'center' },
});
