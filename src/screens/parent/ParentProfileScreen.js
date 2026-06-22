// ============================================================
// YUMURCAK — ParentProfileScreen.js
// FAZ 8: Galeriden profil fotoğrafı seçme + Firebase Storage upload
// Kayıt:
// - Storage: profilFotograflari/veliler/{parentId}.jpg
// - RTDB: kullanicilar/{parentId}/profilFotoUrl
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref as dbRef, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { ScreenShell, InfoRow, EmptyState, LoadingScreen, useParentBase, styles, THEME } from './parentShared';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function ParentProfileScreen({ navigation }) {
  const { loading, selectedChild, childName, parentName, kullanici, parentId, parentPhotoUrl, sinif, ogretmen, cikisYap } = useParentBase();
  const [photoUrl, setPhotoUrl] = useState(parentPhotoUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successToast, setSuccessToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    setPhotoUrl(parentPhotoUrl || '');
  }, [parentPhotoUrl]);

  if (loading) return <LoadingScreen text="Profil hazırlanıyor..." />;

  const showSuccessToast = (message) => {
    setSuccessToast({ visible: true, message });
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
      showSuccessToast('Profil fotoğrafı yüklendi');
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
            showSuccessToast('Profil fotoğrafı kaldırıldı');
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
    <>
      <AppSuccessToast
        visible={successToast.visible}
        message={successToast.message}
        onHide={() => setSuccessToast({ visible: false, message: '' })}
      />

      <ScreenShell title="Profil" emoji="👤" navigation={navigation}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil Resmi</Text>
          <Text style={local.hintText}>Seçtiğin fotoğraf anasayfa ve özet ekranındaki profil alanlarında otomatik görünür.</Text>

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
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={local.primaryButtonText}>Galeriden Fotoğraf Seç</Text>
            )}
          </TouchableOpacity>

          {photoUrl ? (
            <TouchableOpacity style={local.removeButton} onPress={removePhoto} disabled={saving || uploading}>
              <Text style={local.removeButtonText}>{saving ? 'Kaldırılıyor...' : 'Fotoğrafı Kaldır'}</Text>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚖️ Yasal Metinler</Text>
          <Text style={styles.cardText}>
            Kullanım şartları, gizlilik politikası ve KVKK aydınlatma metni.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('LegalDocuments')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Yasal Metinleri Gör</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>↩ Çıkış Yap</Text>
        </TouchableOpacity>
      </ScreenShell>
    </>
  );
}

const local = {
  avatarWrap: { alignItems: 'center', marginVertical: 12 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: THEME.primarySoft },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 44 },
  hintText: { color: THEME.muted, fontWeight: '700', marginTop: 6, lineHeight: 18 },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '900' },
  removeButton: {
    backgroundColor: '#FFE8EC',
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: { color: '#FF4D6D', fontWeight: '900' },
};
