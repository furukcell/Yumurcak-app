// ============================================================
// YUMURCAK — ParentMessagesScreen.js
// FAZ 7: Veli artık öğretmen + yönetici ile mesajlaşabilir
// ============================================================
import React, { useMemo } from 'react';
import { Alert, TouchableOpacity, View, Text } from 'react-native';
import { ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, LoadingScreen, useParentBase, styles, THEME } from './parentShared';

export default function ParentMessagesScreen({ navigation }) {
  const base = useParentBase();
  const { loading, parentId, selectedChild, childName, kresId, kres, sinif, ogretmen, yonetici, parentName } = base;

  const teacherId = useMemo(() => {
    if (selectedChild?.ogretmenId) return selectedChild.ogretmenId;
    if (sinif?.ogretmenIds?.[0]) return sinif.ogretmenIds[0];
    if (sinif?.ogretmenId) return sinif.ogretmenId;
    return ogretmen?.id || null;
  }, [selectedChild, sinif, ogretmen]);

  const adminId = kres?.yoneticiId || yonetici?.id || null;

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

  return (
    <ScreenShell title="Mesajlar" emoji="💬" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bağlantısı yok" desc="Mesajlaşma için çocuğunuzun hesaba bağlı olması gerekir." />
      ) : (
        <>
          <ContactCard
            icon="🏫"
            title="Kurum Yönetimi"
            desc={kres?.ad || 'Kurum ile yazış'}
            sub="Aidat, kayıt ve genel konular"
            onPress={openAdminChat}
          />
          <ContactCard
            icon="👩‍🏫"
            title={getName(ogretmen) || 'Öğretmen'}
            desc={childName}
            sub="Günlük durum ve sınıf konuları"
            onPress={openTeacherChat}
          />
        </>
      )}
    </ScreenShell>
  );
}

function ContactCard({ icon, title, desc, sub, onPress }) {
  return (
    <TouchableOpacity style={local.card} onPress={onPress} activeOpacity={0.85}>
      <View style={local.iconBox}>
        <Text style={local.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={local.title}>{title}</Text>
        <Text style={local.desc}>{desc}</Text>
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
  title: { color: THEME.text, fontSize: 16, fontWeight: '900' },
  desc: { color: THEME.muted, marginTop: 3, fontWeight: '700' },
  sub: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: '600' },
  arrow: { color: THEME.primary, fontSize: 30, fontWeight: '900', marginLeft: 8 },
};
