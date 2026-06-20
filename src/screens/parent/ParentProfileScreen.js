// ============================================================
// YUMURCAK — ParentProfileScreen.js
// FAZ 8: Galeriden profil fotoğrafı seçme + Firebase Storage upload
// Gereken dependency package.json'da zaten var: expo-image-picker
// Kayıt:
// - Storage: profilFotograflari/veliler/{parentId}.jpg
// - RTDB: kullanicilar/{parentId}/profilFotoUrl
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref as dbRef, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { ScreenShell, InfoRow, EmptyState, LoadingScreen, useParentBase, styles, THEME } from './parentShared';

export default function ParentProfileScreen({ navigation }) {
  const { loading, selectedChild, childName, parentName, kullanici, parentId, sinif, ogretmen, cikisYap } = useParentBase();
  const [photoUrl, setPhotoUrl] = useState(kullanici?.profilFotoUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (loading) return <LoadingScreen text="Profil hazırlanıyor..." />;

  const savePhotoUrl = async (urlValue = photoUrl) => {
    if (!parentId) return Alert.alert('Hata', 'Veli hesabı bulunamadı.');
    if (!urlValue.trim()) return Alert.alert('Eksik Bilgi', 'Fotoğraf URL alanı boş.');

    setSaving(true);
    try {
      await update(dbRef(database, `kullanicilar/${parentId}`), {
        profilFotoUrl: urlValue.trim(),
        updatedAt: Date.now(),
      });
      setPhotoUrl(urlValue.trim());
      Alert.alert('Başarılı', 'Profil resmi kaydedildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Profil resmi kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    if (!parentId) return Alert.alert('Hata', 'Veli hesabı bulunamadı.');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin Gerekli', 'Profil fotoğrafı seçmek için galeri izni vermen gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      setUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileRef = storageRef(storage, `profilFotograflari/veliler/${parentId}.jpg`);
      await uploadBytes(fileRef, blob, {
        contentType: 'image/jpeg',
      });

      const downloadUrl = await getDownloadURL(fileRef);

      await update(dbRef(database, `kullanicilar/${parentId}`), {
        profilFotoUrl: downloadUrl,
        profilFotoUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      });

      setPhotoUrl(downloadUrl);
      Alert.alert('Başarılı', 'Profil fotoğrafı yüklendi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Profil fotoğrafı yüklenemedi. Storage ayarlarını kontrol et.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!parentId) return Alert.alert('Hata', 'Veli hesabı bulunamadı.');

    Alert.alert('Profil Fotoğrafı', 'Fotoğrafı profilden kaldırmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await update(dbRef(database, `kullanicilar/${parentId}`), {
              profilFotoUrl: '',
              profilFotoUpdatedAt: Date.now(),
              updatedAt: Date.now(),
            });
            setPhotoUrl('');
          } catch (err) {
            console.error(err);
            Alert.alert('Hata', 'Fotoğraf kaldırılamadı.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
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

        <TouchableOpacity style={local.primaryButton} onPress={pickAndUploadPhoto} disabled={uploading || saving}>
          {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={local.primaryButtonText}>Galeriden Fotoğraf Seç</Text>}
        </TouchableOpacity>

        <Text style={local.orText}>veya URL ile ekle</Text>

        <TextInput
          style={local.input}
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="Profil fotoğraf URL'si"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <TouchableOpacity style={[styles.secondaryButton, saving && { opacity: 0.6 }]} onPress={() => savePhotoUrl()} disabled={saving || uploading}>
          <Text style={styles.secondaryButtonText}>{saving ? 'Kaydediliyor...' : 'URL Fotoğrafı Kaydet'}</Text>
        </TouchableOpacity>

        {photoUrl ? (
          <TouchableOpacity style={local.removeButton} onPress={removePhoto} disabled={saving || uploading}>
            <Text style={local.removeButtonText}>Fotoğrafı Kaldır</Text>
          </TouchableOpacity>
        ) : null}
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
  avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: THEME.primarySoft },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 44 },
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
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '900' },
  orText: { color: THEME.muted, textAlign: 'center', fontWeight: '700', marginBottom: 10 },
  removeButton: {
    backgroundColor: '#FFE8EC',
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  removeButtonText: { color: '#FF4D6D', fontWeight: '900' },
};
