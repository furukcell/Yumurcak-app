// ============================================================
// YUMURCAK — ParentMessagesScreen.js
// Veli mesajlar ekranı - FAZ 1 gerçek mesajlaşma
// ============================================================
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { EmptyState, LoadingScreen, ScreenShell, THEME, useParentBase } from './parentShared';

export default function ParentMessagesScreen() {
  const navigation = useNavigation();
  const { loading, parentId, selectedChild, childName, kresId, sinifId, sinif, ogretmen } = useParentBase();

  const ogretmenId = useMemo(() => {
    if (!selectedChild) return null;
    if (selectedChild.ogretmenId) return selectedChild.ogretmenId;
    if (sinif?.ogretmenIds?.[0]) return sinif.ogretmenIds[0];
    if (sinif?.ogretmenId) return sinif.ogretmenId;
    return null;
  }, [selectedChild, sinif]);

  if (loading) return <LoadingScreen text="Mesajlar hazırlanıyor..." />;

  if (!selectedChild) {
    return (
      <ScreenShell title="Mesajlar" emoji="💬" navigation={navigation}>
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Mesajlaşma için çocuğunuzun sınıfa bağlı olması gerekir." />
      </ScreenShell>
    );
  }

  const contactTitle = ogretmen
    ? `${ogretmen.ad || ''} ${ogretmen.soyad || ''}`.trim() || 'Sınıf Öğretmeni'
    : 'Sınıf Öğretmeni';

  return (
    <ScreenShell title="Mesajlar" emoji="💬" navigation={navigation}>
      <View style={localStyles.infoCard}>
        <Text style={localStyles.infoTitle}>Çocuk: {childName}</Text>
        <Text style={localStyles.infoDesc}>Öğretmeninizle buradan yazışabilirsiniz.</Text>
      </View>

      {!ogretmenId ? (
        <EmptyState icon="💬" title="Öğretmen bulunamadı" desc="Sınıfa öğretmen bağlanınca mesajlaşma aktif olur." />
      ) : (
        <TouchableOpacity style={localStyles.contactCard} onPress={openTeacherChat} activeOpacity={0.85}>
          <Text style={localStyles.contactIcon}>👩‍🏫</Text>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.contactTitle}>{contactTitle}</Text>
            <Text style={localStyles.contactSubtitle}>{sinif?.ad || 'Sınıf öğretmeni'}</Text>
          </View>
          <Text style={localStyles.arrow}>›</Text>
        </TouchableOpacity>
      )}
    </ScreenShell>
  );

  async function openTeacherChat() {
    if (!parentId || !selectedChild?.id || !ogretmenId) return;
    const conversationId = `veli_${parentId}_ogretmen_${ogretmenId}_cocuk_${selectedChild.id}`;
    const meta = {
      kresId: kresId || selectedChild.kresId || '',
      sinifId: sinifId || selectedChild.sinifId || '',
      cocukId: selectedChild.id,
      veliId: parentId,
      ogretmenId,
      konuTipi: 'veli_ogretmen',
      katilimcilar: { [parentId]: true, [ogretmenId]: true },
      aktif: true,
      updatedAt: Date.now(),
    };
    await update(ref(database, `mesajKonusmalari/${conversationId}`), meta);
    navigation.navigate('MessageDetail', {
      conversationId,
      conversationMeta: meta,
      title: contactTitle,
      subtitle: sinif?.ad || childName,
    });
  }
}

const localStyles = {
  infoCard: { backgroundColor: THEME.primarySoft, borderRadius: 18, padding: 15, marginBottom: 14 },
  infoTitle: { color: THEME.primaryDark, fontWeight: '900', fontSize: 16 },
  infoDesc: { color: THEME.muted, fontWeight: '700', marginTop: 4 },
  contactCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  contactIcon: { fontSize: 31, marginRight: 12 },
  contactTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  contactSubtitle: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  arrow: { color: THEME.primary, fontSize: 26, fontWeight: '900' },
};
