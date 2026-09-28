// ============================================================
// YUMURCAK — LanguageCard.js
// Dil seçici kartı (ParentProfileScreen'deki seçicinin ortak hali).
// Anahtarlar parent.profile.* altındaki mevcut çevirileri kullanır.
// ============================================================
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../i18n';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  text: '#191A23',
  muted: '#707386',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

export const LANGUAGES = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

export default function LanguageCard() {
  const { t, i18n } = useTranslation();
  const [changingLang, setChangingLang] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === i18n.language);

  const changeLanguage = async (lng) => {
    setMenuOpen(false);
    if (lng === i18n.language || changingLang) return;
    setChangingLang(true);
    try {
      const { restartNeeded } = await setAppLanguage(lng);
      if (restartNeeded) {
        Alert.alert(t('parent.profile.restartRequiredTitle'), t('parent.profile.restartRequiredDesc'), [
          { text: t('parent.profile.restartLater'), style: 'cancel' },
          {
            text: t('parent.profile.restartNow'),
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (error) {
                console.warn('Yeniden başlatma başarısız (muhtemelen dev ortamı):', error?.message || error);
              }
            },
          },
        ]);
      }
    } finally {
      setChangingLang(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🌐 {t('parent.profile.languageTitle')}</Text>
      <Text style={styles.cardText}>{t('parent.profile.languageDesc')}</Text>

      <TouchableOpacity style={styles.trigger} onPress={() => setMenuOpen(true)} disabled={changingLang} activeOpacity={0.85}>
        <Text style={styles.triggerText}>
          {current?.flag || '🌐'}{'  '}{current?.label || i18n.language}
        </Text>
        {changingLang ? <ActivityIndicator size="small" color={THEME.primary} /> : <Text style={styles.chevron}>▾</Text>}
      </TouchableOpacity>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.sheet}>
            {LANGUAGES.map((lang) => {
              const active = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => changeLanguage(lang.code)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.itemFlag}>{lang.flag}</Text>
                  <Text style={[styles.itemText, active && styles.itemTextActive]}>{lang.label}</Text>
                  {active ? <Text style={styles.itemCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  cardTitle: { color: THEME.text, fontSize: 17, fontWeight: '900', marginBottom: 4 },
  cardText: { color: THEME.muted, fontSize: 13, lineHeight: 19, fontWeight: '600', marginBottom: 10 },
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.primarySoft, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  triggerText: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  chevron: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(25,26,35,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: THEME.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingVertical: 10, paddingHorizontal: 8, paddingBottom: 28 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginVertical: 3 },
  itemActive: { backgroundColor: THEME.primarySoft },
  itemFlag: { fontSize: 20, marginRight: 12 },
  itemText: { flex: 1, color: THEME.text, fontWeight: '700', fontSize: 15 },
  itemTextActive: { color: THEME.primary, fontWeight: '900' },
  itemCheck: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
});
