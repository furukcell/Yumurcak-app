// ============================================================
// YUMURCAK — TeacherProfileScreen.js
// FAZ 3: Öğretmen profil + profesyonel yasal metin kartı
// FAZ 10: Galeriden profil fotoğrafı seçme + Firebase Storage upload
// Kayıt:
// - Storage: profilFotograflari/ogretmenler/{teacherId}.jpg
// - RTDB: kullanicilar/{teacherId}/profilFotoUrl
// ============================================================
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { launchSafeImagePicker } from '../../utils/safeImagePicker';
import { showPickerFailureGuidance } from '../../utils/miuiAutostart';
import { logGalleryEvent, logGalleryError } from '../../utils/galleryErrorLogger';
import { ref as dbRef, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, InfoRow, getUserName } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import ChangePasswordCard from '../../components/ChangePasswordCard';

export default function TeacherProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { loading, kullanici, teacherId, cikisYap, currentClass, kurum } = useTeacherData();
  const [photoUrl, setPhotoUrl] = useState(kullanici?.profilFotoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [successToast, setSuccessToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    setPhotoUrl(kullanici?.profilFotoUrl || '');
  }, [kullanici?.profilFotoUrl]);

  if (loading) return <LoadingState text={t('teacher.profile.loading')} />;

  const showSuccess = (message) => setSuccessToast({ visible: true, message });

  const pickAndUploadPhoto = async () => {
    if (!teacherId) return Alert.alert(t('teacher.profile.errorTitle'), t('teacher.profile.accountNotFoundDesc'));

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('teacher.profile.permissionTitle'), t('teacher.profile.permissionDesc'));
        return;
      }

      const result = await launchSafeImagePicker({
        userId: teacherId,
        kresId: kullanici?.kresId || kurum?.id || '',
        mode: 'teacher_profile',
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      await logGalleryEvent({ stage: 'PROFILE_ASSET_RECEIVED', userId: teacherId, kresId: kullanici?.kresId || kurum?.id || '', mode: 'teacher_profile', asset });
      setUploading(true);

      await logGalleryEvent({ stage: 'PROFILE_URI_READ_START', userId: teacherId, kresId: kullanici?.kresId || kurum?.id || '', mode: 'teacher_profile', asset });
      const response = await fetch(uri);
      const blob = await response.blob();
      await logGalleryEvent({ stage: 'PROFILE_URI_READ_DONE', userId: teacherId, kresId: kullanici?.kresId || kurum?.id || '', mode: 'teacher_profile', asset, extra: { blobSize: blob?.size || 0 } });

      const fileRef = storageRef(storage, `profilFotograflari/ogretmenler/${teacherId}.jpg`);
      await logGalleryEvent({ stage: 'PROFILE_UPLOAD_START', userId: teacherId, kresId: kullanici?.kresId || kurum?.id || '', mode: 'teacher_profile', asset });
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
      await logGalleryEvent({ stage: 'PROFILE_UPLOAD_DONE', userId: teacherId, kresId: kullanici?.kresId || kurum?.id || '', mode: 'teacher_profile', asset });

      const downloadUrl = await getDownloadURL(fileRef);

      await update(dbRef(database, `kullanicilar/${teacherId}`), {
        profilFotoUrl: downloadUrl,
        profilFotoUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      });

      setPhotoUrl(downloadUrl);
      showSuccess(t('teacher.profile.photoUploadedSuccess'));
    } catch (err) {
      await logGalleryError({ stage: 'PROFILE_FLOW_ERROR', error: err, userId: teacherId, kresId: kullanici?.kresId || kurum?.id || '', mode: 'teacher_profile' });
      console.error(err);
      if (err?.code === 'PICKER_TIMEOUT') {
        showPickerFailureGuidance({ isTimeout: true });
      } else {
        Alert.alert(t('teacher.profile.errorTitle'), t('teacher.profile.uploadErrorDesc'));
      }
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    if (!teacherId) return Alert.alert(t('teacher.profile.errorTitle'), t('teacher.profile.accountNotFoundDesc'));

    Alert.alert(t('teacher.profile.removeConfirmTitle'), t('teacher.profile.removeConfirmDesc'), [
      { text: t('teacher.profile.cancelButton'), style: 'cancel' },
      {
        text: t('teacher.profile.removeButton'),
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await update(dbRef(database, `kullanicilar/${teacherId}`), {
              profilFotoUrl: '',
              profilFotoUpdatedAt: Date.now(),
              updatedAt: Date.now(),
            });
            setPhotoUrl('');
            showSuccess(t('teacher.profile.photoRemovedSuccess'));
          } catch (err) {
            console.error(err);
            Alert.alert(t('teacher.profile.errorTitle'), t('teacher.profile.removeErrorDesc'));
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast.visible}
        message={successToast.message}
        onHide={() => setSuccessToast({ visible: false, message: '' })}
      />
      <ScreenHeader navigation={navigation} title={t('teacher.profile.title')} subtitle={t('teacher.profile.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatar}>👩‍🏫</Text>
          )}
          <Text style={styles.name} numberOfLines={1}>{getUserName(kullanici)}</Text>
          <Text style={styles.sub} numberOfLines={1}>{currentClass?.ad || t('teacher.profile.classNotAssigned')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('teacher.profile.photoCardTitle')}</Text>
          <Text style={styles.hintText}>{t('teacher.profile.photoHint')}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={pickAndUploadPhoto} disabled={uploading || removing} activeOpacity={0.85}>
            {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{t('teacher.profile.pickPhotoButton')}</Text>}
          </TouchableOpacity>

          {photoUrl ? (
            <TouchableOpacity style={styles.removeButton} onPress={removePhoto} disabled={uploading || removing} activeOpacity={0.85}>
              <Text style={styles.removeButtonText}>{removing ? t('teacher.profile.removingLabel') : t('teacher.profile.removePhotoButton')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('teacher.profile.infoCardTitle')}</Text>
          <InfoRow icon="🏫" label={t('teacher.profile.infoInstitution')} value={kurum?.ad || '-'} />
          <InfoRow icon="📚" label={t('teacher.profile.infoClass')} value={currentClass?.ad || '-'} />
          <InfoRow icon="☎️" label={t('teacher.profile.infoPhone')} value={kullanici?.telefon || '-'} />
          <InfoRow icon="👤" label={t('teacher.profile.infoUsername')} value={kullanici?.kullaniciAdi || '-'} />
        </View>

        <ChangePasswordCard userId={teacherId} primaryColor={THEME.primary} />

        <View style={styles.legalCard}>
          <View style={styles.legalHeader}>
            <View style={styles.legalIconBox}>
              <Text style={styles.legalIcon}>💬</Text>
            </View>
            <View style={styles.legalHeaderText}>
              <Text style={styles.cardTitle}>{t('teacher.profile.supportBannerTitle')}</Text>
              <Text style={styles.legalDesc}>
                {t('teacher.profile.supportBannerDesc')}
              </Text>
            </View>
          </View>

          <LegalLink
            icon="✉️"
            title={t('teacher.profile.supportLinkTitle')}
            desc={t('teacher.profile.supportLinkDesc')}
            onPress={() => navigation.navigate('TeacherSupport')}
          />
        </View>

        <View style={styles.legalCard}>
          <View style={styles.legalHeader}>
            <View style={styles.legalIconBox}>
              <Text style={styles.legalIcon}>⚖️</Text>
            </View>
            <View style={styles.legalHeaderText}>
              <Text style={styles.cardTitle}>{t('teacher.profile.legalTitle')}</Text>
              <Text style={styles.legalDesc}>
                {t('teacher.profile.legalDesc')}
              </Text>
            </View>
          </View>

          <LegalLink
            icon="📄"
            title={t('teacher.profile.termsTitle')}
            desc={t('teacher.profile.termsDesc')}
            onPress={() => navigation.navigate('LegalDocuments', { docKey: 'terms' })}
          />
          <LegalLink
            icon="🔐"
            title={t('teacher.profile.privacyTitle')}
            desc={t('teacher.profile.privacyDesc')}
            onPress={() => navigation.navigate('LegalDocuments', { docKey: 'privacy' })}
          />
          <LegalLink
            icon="🛡️"
            title={t('teacher.profile.kvkkTitle')}
            desc={t('teacher.profile.kvkkDesc')}
            onPress={() => navigation.navigate('LegalDocuments', { docKey: 'kvkk' })}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.logoutText}>↩ {t('teacher.profile.logoutButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegalLink({ icon, title, desc, onPress }) {
  return (
    <TouchableOpacity style={styles.legalLink} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.legalLinkIcon}>{icon}</Text>
      <View style={styles.legalLinkTextBlock}>
        <Text style={styles.legalLinkTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.legalLinkDesc} numberOfLines={1}>{desc}</Text>
      </View>
      <Text style={styles.legalArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 22, alignItems: 'center', marginBottom: 14 },
  avatar: { fontSize: 52, marginBottom: 8 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, marginBottom: 8, backgroundColor: '#FFF' },
  name: { color: '#FFF', fontSize: 21, fontWeight: '900', maxWidth: '100%' },
  sub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '700', maxWidth: '100%' },
  card: { backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  cardTitle: { color: THEME.text, fontSize: 17, fontWeight: '900' },
  hintText: { color: THEME.muted, fontWeight: '700', marginTop: 6, marginBottom: 12, lineHeight: 18 },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '900' },
  removeButton: { backgroundColor: '#FFE8EC', borderRadius: 14, padding: 13, alignItems: 'center', marginTop: 8 },
  removeButtonText: { color: '#FF4D6D', fontWeight: '900' },
  legalCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  legalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  legalIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  legalIcon: { fontSize: 24 },
  legalHeaderText: { flex: 1, minWidth: 0 },
  legalDesc: { color: THEME.muted, fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 4 },
  legalLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bg, borderRadius: 15, padding: 12, marginTop: 8, borderWidth: 1, borderColor: THEME.border },
  legalLinkIcon: { fontSize: 20, marginRight: 10 },
  legalLinkTextBlock: { flex: 1, minWidth: 0 },
  legalLinkTitle: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  legalLinkDesc: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 2 },
  legalArrow: { color: THEME.primary, fontSize: 26, fontWeight: '900', marginLeft: 8 },
  logoutButton: { backgroundColor: THEME.red, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
