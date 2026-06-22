// ============================================================
// YUMURCAK — TeacherProfileScreen.js
// FAZ 3: Öğretmen profil + profesyonel yasal metin kartı
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
          <Text style={styles.name} numberOfLines={1}>{getUserName(kullanici)}</Text>
          <Text style={styles.sub} numberOfLines={1}>{currentClass?.ad || 'Sınıf atanmamış'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Öğretmen Bilgileri</Text>
          <InfoRow icon="🏫" label="Kurum" value={kurum?.ad || '-'} />
          <InfoRow icon="📚" label="Sınıf" value={currentClass?.ad || '-'} />
          <InfoRow icon="☎️" label="Telefon" value={kullanici?.telefon || '-'} />
          <InfoRow icon="👤" label="Kullanıcı Adı" value={kullanici?.kullaniciAdi || '-'} />
        </View>

        <View style={styles.legalCard}>
          <View style={styles.legalHeader}>
            <View style={styles.legalIconBox}>
              <Text style={styles.legalIcon}>⚖️</Text>
            </View>
            <View style={styles.legalHeaderText}>
              <Text style={styles.cardTitle}>Yasal Bilgiler</Text>
              <Text style={styles.legalDesc}>
                Kullanım şartları, gizlilik politikası ve KVKK metinlerine buradan ulaşabilirsiniz.
              </Text>
            </View>
          </View>

          <LegalLink
            icon="📄"
            title="Kullanım Şartları"
            desc="Uygulama kullanım kuralları"
            onPress={() => navigation.navigate('LegalDocuments', { docKey: 'terms' })}
          />
          <LegalLink
            icon="🔐"
            title="Gizlilik Politikası"
            desc="Veri işleme ve gizlilik esasları"
            onPress={() => navigation.navigate('LegalDocuments', { docKey: 'privacy' })}
          />
          <LegalLink
            icon="🛡️"
            title="KVKK Aydınlatma Metni"
            desc="Kişisel veriler hakkında bilgilendirme"
            onPress={() => navigation.navigate('LegalDocuments', { docKey: 'kvkk' })}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
          <Text style={styles.logoutText}>↩ Çıkış Yap</Text>
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
  name: { color: '#FFF', fontSize: 21, fontWeight: '900', maxWidth: '100%' },
  sub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: '700', maxWidth: '100%' },
  card: { backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  cardTitle: { color: THEME.text, fontSize: 17, fontWeight: '900' },
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