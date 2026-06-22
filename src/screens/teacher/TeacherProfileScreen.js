// ============================================================
// YUMURCAK — TeacherProfileScreen.js
// Öğretmen profil ve çıkış
// ============================================================
import React from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, InfoRow, getUserName } from './teacherShared';

export default function TeacherProfileScreen() {
  const navigation = useNavigation();
  const { loading, kullanici, cikisYap, currentClass, kurum } = useTeacherData();

  if (loading) return <LoadingState text="Profil hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Profil" subtitle="Öğretmen bilgileri" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.avatar}>👩‍🏫</Text>
          <Text style={styles.name}>{getUserName(kullanici)}</Text>
          <Text style={styles.sub}>{currentClass?.ad || 'Sınıf atanmamış'}</Text>
        </View>

        <View style={styles.card}>
          <InfoRow icon="🏫" label="Kurum" value={kurum?.ad || '-'} />
          <InfoRow icon="📚" label="Sınıf" value={currentClass?.ad || '-'} />
          <InfoRow icon="☎️" label="Telefon" value={kullanici?.telefon || '-'} />
          <InfoRow icon="👤" label="Kullanıcı Adı" value={kullanici?.kullaniciAdi || '-'} />
        </View>
        <View style={styles.card}>
       <InfoRow icon="⚖️" label="Yasal Metinler" value="Kullanım Şartları / Gizlilik / KVKK" />

       <TouchableOpacity
       style={styles.legalButton}
       onPress={() => navigation.navigate('LegalDocuments')}
       activeOpacity={0.85}
     >
    <Text style={styles.legalText}>Yasal Metinleri Gör</Text>
  </TouchableOpacity>
</View>
        <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 22, alignItems: 'center', marginBottom: 14 },
  avatar: { fontSize: 52, marginBottom: 8 },
  name: { color: '#FFF', fontSize: 21, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '700' },
  card: { backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 15, borderWidth: 1, borderColor: THEME.border },
  logoutButton: { backgroundColor: THEME.red, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 18 },
  logoutText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
