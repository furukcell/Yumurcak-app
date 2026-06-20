// ============================================================
// YUMURCAK — ParentProfileScreen.js
// FAZ 4: Veli profil resmi URL alanı eklendi
// Not: Build bozmamak için image-picker bağımlılığı eklenmedi.
// Fotoğraf URL'si kullanicilar/{veliId}/profilFotoUrl olarak kaydolur.
// ============================================================
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, InfoRow, EmptyState, LoadingScreen, useParentBase, styles, THEME } from './parentShared';

export default function ParentProfileScreen({ navigation }) {
  const { loading, selectedChild, childName, parentName, kullanici, parentId, sinif, ogretmen, cikisYap } = useParentBase();
  const [photoUrl, setPhotoUrl] = useState(kullanici?.profilFotoUrl || '');
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingScreen text="Profil hazırlanıyor..." />;

  const savePhoto = async () => {
    if (!parentId) return Alert.alert('Hata', 'Veli hesabı bulunamadı.');
    setSaving(true);
    try {
      await update(ref(database, `kullanicilar/${parentId}`), {
        profilFotoUrl: photoUrl.trim(),
        updatedAt: Date.now(),
      });
      Alert.alert('Başarılı', 'Profil resmi kaydedildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Profil resmi kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell title="Profil" emoji="👤" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profil Resmi</Text>
        <View style={local.avatarWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={local.avatarImage} />
          ) : (
            <View style={local.avatarPlaceholder}>
              <Text style={local.avatarEmoji}>👤</Text>
            </View>
          )}
        </View>
        <TextInput
          style={local.input}
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="Profil fotoğraf URL'si"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.secondaryButton, saving && { opacity: 0.6 }]} onPress={savePhoto} disabled={saving}>
          <Text style={styles.secondaryButtonText}>{saving ? 'Kaydediliyor...' : 'Profil Resmini Kaydet'}</Text>
        </TouchableOpacity>
      </View>

      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Yönetici panelinden çocuğa bu veli bağlanmalı." />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👧 {childName}</Text>
          <Text style={styles.cardText}>{selectedChild?.yas || selectedChild?.dogumTarihi || 'Kreş öğrencisi'}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Veli Bilgileri</Text>
        <InfoRow icon="👤" label="Veli" value={parentName} />
        <InfoRow icon="☎️" label="Telefon" value={kullanici?.telefon} />
        <InfoRow icon="✉️" label="Kullanıcı" value={kullanici?.kullaniciAdi} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kurum Bilgileri</Text>
        <InfoRow icon="🏫" label="Sınıf" value={sinif?.ad || selectedChild?.sinifAdi || selectedChild?.sinifId} />
        <InfoRow icon="👩‍🏫" label="Öğretmen" value={`${ogretmen?.ad || ''} ${ogretmen?.soyad || ''}`.trim()} />
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={cikisYap} activeOpacity={0.85}>
        <Text style={styles.secondaryButtonText}>↩ Çıkış Yap</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const local = {
  avatarWrap: { alignItems: 'center', marginVertical: 10 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, backgroundColor: THEME.primarySoft },
  avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 42 },
  input: {
    backgroundColor: THEME.bg,
    borderRadius: 14,
    padding: 12,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    fontWeight: '700',
    marginBottom: 10,
  },
};
