// ============================================================
// YUMURCAK — AdminLanguageScreen.js
// Yönetici paneli Ayarlar > Dil ekranı.
// ============================================================
import React from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LanguageCard from '../../components/LanguageCard';

const THEME = {
  primary: '#6C3DEB',
  text: '#191A23',
  bg: '#F8FAFF',
  border: '#EAEFF8',
};

export default function AdminLanguageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('parent.profile.languageTitle')}</Text>
          <View style={{ width: 36 }} />
        </View>
        <LanguageCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: THEME.primary, fontWeight: '900', marginTop: -2 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: THEME.text },
});
