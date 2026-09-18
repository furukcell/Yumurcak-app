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
  Modal,
} from 'react-native';
import InAppSinglePhotoPicker from '../../components/InAppSinglePhotoPicker';
import { ref as dbRef, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import { database, storage } from '../../config/firebase';
import { setAppLanguage } from '../../i18n';
import { ScreenShell, InfoRow, EmptyState, LoadingScreen, useParentBase, styles, THEME } from './parentShared';
import { useParentChild } from '../../context/ParentChildContext';
import AppSuccessToast from '../../components/AppSuccessToast';
import ChangePasswordCard from '../../components/ChangePasswordCard';

export default function ParentProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { loading, selectedChild, childName, parentName, kullanici, parentId, parentPhotoUrl, sinif, ogretmen, cikisYap } = useParentBase();
  const { children: allChildren, selectChild } = useParentChild();
  const [photoUrl, setPhotoUrl] = useState(parentPhotoUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [successToast, setSuccessToast] = useState({ visible: false, message: '' });

  const LANGUAGES = [
    { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ru', flag: '🇷🇺', label: 'Русский' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
  ];

  useEffect(() => {
    setPhotoUrl(parentPhotoUrl || '');
  }, [parentPhotoUrl]);

  if (loading) return <LoadingScreen text={t('parent.profile.loading')} />;

  const showSuccessToast = (message) => {
    setSuccessToast({ visible: true, message });
  };

  const changeLanguage = async (lng) => {
    setLangMenuOpen(false);
    if (lng === i18n.language || changingLang) return;
    setChangingLang(true);
    try {
      await setAppLanguage(lng);
    } finally {
      setChangingLang(false);
    }
  };

  const pickAndUploadPhoto = async () => {
  const pickAndUploadPhoto = () => {
    if (!parentId) return Alert.alert(t('parent.profile.errorTitle'), t('parent.profile.accountNotFoundDesc'));
    setPhotoPickerVisible(true);
  };

  const handlePhotoPicked = async (uri) => {
    setPhotoPickerVisible(false);
    try {
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
      showSuccessToast(t('parent.profile.photoUploaded'));
    } catch (err) {
      console.error(err);
      Alert.alert(t('parent.profile.errorTitle'), t('parent.profile.uploadFailedDesc'));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!parentId) return Alert.alert(t('parent.profile.errorTitle'), t('parent.profile.accountNotFoundDesc'));

    Alert.alert(t('parent.profile.photoAlertTitle'), t('parent.profile.photoAlertDesc'), [
      { text: t('parent.profile.cancel'), style: 'cancel' },
      {
        text: t('parent.profile.remove'),
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
            showSuccessToast(t('parent.profile.photoRemoved'));
          } catch (err) {
            console.error(err);
            Alert.alert(t('parent.profile.errorTitle'), t('parent.profile.removeFailedDesc'));
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

      <ScreenShell title={t('parent.profile.title')} emoji="👤" navigation={navigation}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('parent.profile.photoTitle')}</Text>
          <Text style={local.hintText}>{t('parent.profile.photoHint')}</Text>

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
              <Text style={local.primaryButtonText}>{t('parent.profile.pickPhotoButton')}</Text>
            )}
          </TouchableOpacity>

          {photoUrl ? (
            <TouchableOpacity style={local.removeButton} onPress={removePhoto} disabled={saving || uploading}>
              <Text style={local.removeButtonText}>{saving ? t('parent.profile.removing') : t('parent.profile.removePhotoButton')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

            {!selectedChild ? (
       <EmptyState
         icon="👧"
         title={t('parent.profile.noChildTitle')}
         desc={t('parent.profile.noChildDesc')}
       />
     ) : (
       <View style={styles.card}>
         {allChildren.length > 1 ? (
           <View style={local.childSwitcherRow}>
             {allChildren.map((child) => {
               const isSelected = String(child.id) === String(selectedChild.id);
               const name = `${child.ad || child.adSoyad || child.isim || 'Çocuk'}`.trim();
               return (
                 <TouchableOpacity
                   key={child.id}
                   onPress={() => selectChild(child.id)}
                   activeOpacity={0.85}
                   style={[local.childPill, isSelected && local.childPillActive]}
                 >
                   <Text style={[local.childPillText, isSelected && local.childPillTextActive]} numberOfLines={1}>{name}</Text>
                 </TouchableOpacity>
               );
             })}
           </View>
         ) : null}
         <Text style={styles.cardTitle}>👧 {childName}</Text>
         <Text style={styles.cardText}>
           {selectedChild?.dogumTarihi
             ? (() => {
                 const [year, month, day] = selectedChild.dogumTarihi.split('-');
                 return `${day}.${month}.${year}`;
               })()
             : t('parent.profile.studentFallback')}
         </Text>
       </View>
     )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('parent.profile.parentInfoTitle')}</Text>
          <InfoRow icon="👤" label={t('parent.profile.parentLabel')} value={parentName} />
          <InfoRow icon="☎️" label={t('parent.profile.phoneLabel')} value={kullanici?.telefon} />
          <InfoRow icon="✉️" label={t('parent.profile.usernameLabel')} value={kullanici?.kullaniciAdi} />
        </View>

        <ChangePasswordCard userId={parentId} primaryColor={THEME.primary} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('parent.profile.institutionInfoTitle')}</Text>
          <InfoRow icon="🏫" label={t('parent.profile.classLabel')} value={sinif?.ad || selectedChild?.sinifAdi || selectedChild?.sinifId} />
          <InfoRow icon="👩‍🏫" label={t('parent.profile.teacherLabel')} value={`${ogretmen?.ad || ''} ${ogretmen?.soyad || ''}`.trim()} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 {t('parent.profile.languageTitle')}</Text>
          <Text style={styles.cardText}>{t('parent.profile.languageDesc')}</Text>

          <TouchableOpacity
            style={local.langDropdownTrigger}
            onPress={() => setLangMenuOpen(true)}
            disabled={changingLang}
            activeOpacity={0.85}
          >
            <Text style={local.langDropdownTriggerText}>
              {LANGUAGES.find((l) => l.code === i18n.language)?.flag || '🌐'}{'  '}
              {LANGUAGES.find((l) => l.code === i18n.language)?.label || i18n.language}
            </Text>
            {changingLang ? (
              <ActivityIndicator size="small" color={THEME.primary} />
            ) : (
              <Text style={local.langDropdownChevron}>▾</Text>
            )}
          </TouchableOpacity>

          <Modal
            visible={langMenuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setLangMenuOpen(false)}
          >
            <TouchableOpacity
              style={local.langModalOverlay}
              activeOpacity={1}
              onPress={() => setLangMenuOpen(false)}
            >
              <View style={local.langModalSheet}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      local.langModalItem,
                      i18n.language === lang.code && local.langModalItemActive,
                    ]}
                    onPress={() => changeLanguage(lang.code)}
                    activeOpacity={0.85}
                  >
                    <Text style={local.langModalItemFlag}>{lang.flag}</Text>
                    <Text
                      style={[
                        local.langModalItemText,
                        i18n.language === lang.code && local.langModalItemTextActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {i18n.language === lang.code && (
                      <Text style={local.langModalItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚖️ {t('parent.profile.legalTitle')}</Text>
          <Text style={styles.cardText}>
            {t('parent.profile.legalDesc')}
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('LegalDocuments')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>{t('parent.profile.legalButton')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌈 Yumurcak</Text>
          <Text style={styles.cardText}>{t('parent.profile.aboutDesc')}</Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ParentAbout')} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>{t('parent.profile.aboutButton')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryButton, local.supportButton]} onPress={() => navigation.navigate('ParentSupport')} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>{t('parent.profile.supportButton')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>↩ {t('parent.profile.logoutButton')}</Text>
        </TouchableOpacity>
      </ScreenShell>
    </>
  );
}

const local = {
  childSwitcherRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  childPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
  },
  childPillActive: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  childPillText: { fontSize: 13, fontWeight: '800', color: THEME.text },
  childPillTextActive: { color: THEME.primary },
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
  supportButton: { marginTop: 10 },
  langDropdownTrigger: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.primarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  langDropdownTriggerText: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  langDropdownChevron: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25,26,35,0.4)',
    justifyContent: 'flex-end',
  },
  langModalSheet: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingBottom: 28,
  },
  langModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 3,
  },
  langModalItemActive: { backgroundColor: THEME.primarySoft },
  langModalItemFlag: { fontSize: 20, marginRight: 12 },
  langModalItemText: { flex: 1, color: THEME.text, fontWeight: '700', fontSize: 15 },
  langModalItemTextActive: { color: THEME.primary, fontWeight: '900' },
  langModalItemCheck: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
};
