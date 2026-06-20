// ============================================================
// YUMURCAK — TeacherMessagesScreen.js
// Öğretmen mesajlar ekranı - FAZ 1 gerçek mesajlaşma
// ============================================================
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { EmptyState, LoadingState, ScreenHeader, THEME, getChildName, getUserName, useTeacherData } from './teacherShared';

export default function TeacherMessagesScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, classChildren, users } = useTeacherData();

  const parentContacts = useMemo(() => {
    const list = [];
    classChildren.forEach((child) => {
      const veliIds = Array.isArray(child.veliIds) ? child.veliIds : [];
      veliIds.forEach((veliId) => {
        const veli = users[veliId];
        if (!veli) return;
        list.push({ veliId, veli, child, title: getUserName(veli), subtitle: getChildName(child) });
      });
    });
    return list.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  }, [classChildren, users]);

  if (loading) return <LoadingState text="Mesajlar hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Mesajlar" subtitle={currentClass?.ad || 'Sınıfım'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Veli Mesajları</Text>
          <Text style={styles.infoDesc}>Sınıfındaki çocukların velileriyle buradan yazışabilirsin.</Text>
        </View>

        {parentContacts.length === 0 ? (
          <EmptyState icon="💬" title="Veli bulunamadı" desc="Çocuklara veli bağlanınca mesajlaşma listesi oluşur." />
        ) : (
          parentContacts.map((contact) => (
            <TouchableOpacity key={`${contact.veliId}_${contact.child.id}`} style={styles.contactCard} onPress={() => openConversation(contact)} activeOpacity={0.85}>
              <Text style={styles.contactIcon}>👨‍👩‍👧</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>{contact.title}</Text>
                <Text style={styles.contactSubtitle}>{contact.subtitle}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );

  async function openConversation(contact) {
    if (!teacherId || !contact?.veliId || !contact?.child?.id) return;
    const child = contact.child;
    const conversationId = `veli_${contact.veliId}_ogretmen_${teacherId}_cocuk_${child.id}`;
    const meta = {
      kresId: child.kresId || kresId || '',
      sinifId: child.sinifId || currentClass?.id || '',
      cocukId: child.id,
      veliId: contact.veliId,
      ogretmenId: teacherId,
      konuTipi: 'veli_ogretmen',
      katilimcilar: { [contact.veliId]: true, [teacherId]: true },
      aktif: true,
      updatedAt: Date.now(),
    };
    await update(ref(database, `mesajKonusmalari/${conversationId}`), meta);
    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta: meta,
      title: contact.title,
      subtitle: getChildName(child),
    });
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  infoCard: { backgroundColor: THEME.primarySoft, borderRadius: 18, padding: 15, marginBottom: 14 },
  infoTitle: { color: THEME.primaryDark, fontWeight: '900', fontSize: 16 },
  infoDesc: { color: THEME.muted, fontWeight: '700', marginTop: 4 },
  contactCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  contactIcon: { fontSize: 30, marginRight: 12 },
  contactTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  contactSubtitle: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  arrow: { color: THEME.primary, fontSize: 26, fontWeight: '900' },
});
