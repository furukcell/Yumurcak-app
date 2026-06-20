// ============================================================
// YUMURCAK — SuperAdminIndexMigrationScreen.js
// FAZ 17: Mevcut Firebase verilerinden index oluşturma
// ============================================================
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, ref } from 'firebase/database';
import { database } from '../../config/firebase';
import { buildAllIndexUpdates, writeIndexes } from '../../utils/firebaseIndexHelpers';

const THEME = {
  bg: '#0F172A',
  panel: '#111827',
  card: '#1E293B',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#38BDF8',
  green: '#22C55E',
  orange: '#F59E0B',
  red: '#EF4444',
};

export default function SuperAdminIndexMigrationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const runMigration = async () => {
    if (loading) return;

    Alert.alert(
      'Index Oluştur',
      'Mevcut kullanıcı, çocuk, sınıf ve mesaj kayıtlarından Firebase index node’ları oluşturulacak. Ana veriler silinmez, taşınmaz. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Başlat', onPress: startMigration },
      ]
    );
  };

  const startMigration = async () => {
    setLoading(true);

    try {
      const [usersSnap, childrenSnap, classesSnap, conversationsSnap] = await Promise.all([
        get(ref(database, 'kullanicilar')),
        get(ref(database, 'cocuklar')),
        get(ref(database, 'siniflar')),
        get(ref(database, 'mesajKonusmalari')),
      ]);

      const data = {
        kullanicilar: usersSnap.val() || {},
        cocuklar: childrenSnap.val() || {},
        siniflar: classesSnap.val() || {},
        mesajKonusmalari: conversationsSnap.val() || {},
      };

      const updates = buildAllIndexUpdates(data);
      const updateCount = Object.keys(updates).length;

      await writeIndexes(updates);

      const result = {
        users: Object.keys(data.kullanicilar).length,
        children: Object.keys(data.cocuklar).length,
        classes: Object.keys(data.siniflar).length,
        conversations: Object.keys(data.mesajKonusmalari).length,
        updateCount,
      };

      setSummary(result);

      Alert.alert(
        'Tamamlandı',
        `${updateCount} index kaydı yazıldı.\n\nAna veriler değişmedi.`
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Index migration tamamlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Firebase Index</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>FAZ 17</Text>
          <Text style={styles.heroTitle}>Veri Düzeni / Index</Text>
          <Text style={styles.heroDesc}>
            Çalışan ana veriyi bozmadan, kreş bazlı hızlı erişim node’ları oluşturur.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Oluşturulacak indexler</Text>
          <IndexLine text="kresKullanicilari/{kresId}/{rolGrubu}/{userId}" />
          <IndexLine text="kullaniciKresleri/{userId}/{kresId}" />
          <IndexLine text="kresCocuklari/{kresId}/{cocukId}" />
          <IndexLine text="sinifCocuklari/{sinifId}/{cocukId}" />
          <IndexLine text="veliCocuklari/{veliId}/{cocukId}" />
          <IndexLine text="kresSiniflari/{kresId}/{sinifId}" />
          <IndexLine text="ogretmenSiniflari/{ogretmenId}/{sinifId}" />
          <IndexLine text="kullaniciKonusmalari/{userId}/{conversationId}" />
          <IndexLine text="kresKonusmalari/{kresId}/{conversationId}" />
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Güvenli Çalışır</Text>
          <Text style={styles.warningText}>
            Bu işlem kayıtları silmez veya taşımaz. Sadece ek index yollarına true değeri yazar.
          </Text>
        </View>

        {summary ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Son Çalıştırma</Text>
            <SummaryRow label="Kullanıcı" value={summary.users} />
            <SummaryRow label="Çocuk" value={summary.children} />
            <SummaryRow label="Sınıf" value={summary.classes} />
            <SummaryRow label="Konuşma" value={summary.conversations} />
            <SummaryRow label="Yazılan index" value={summary.updateCount} />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.runButton, loading && { opacity: 0.65 }]}
          onPress={runMigration}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.runText}>Indexleri Oluştur / Güncelle</Text>}
        </TouchableOpacity>

        <Text style={styles.note}>
          Bu ekranı yeni veri ekledikten sonra tekrar çalıştırabilirsin. Var olan index kayıtları tekrar true yazılır, sorun olmaz.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function IndexLine({ text }) {
  return (
    <View style={styles.indexLine}>
      <Text style={styles.dot}>•</Text>
      <Text style={styles.indexText}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backButton: { width: 70 },
  backText: { color: THEME.blue, fontWeight: '900', fontSize: 16 },
  headerTitle: { color: THEME.text, fontWeight: '900', fontSize: 18 },
  hero: { backgroundColor: THEME.panel, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: THEME.line, marginBottom: 14 },
  kicker: { color: THEME.blue, fontWeight: '900', letterSpacing: 1.6, fontSize: 11 },
  heroTitle: { color: THEME.text, fontSize: 25, fontWeight: '900', marginTop: 5 },
  heroDesc: { color: THEME.muted, fontWeight: '700', marginTop: 7, lineHeight: 20 },
  card: { backgroundColor: THEME.panel, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: THEME.line, marginBottom: 14 },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  indexLine: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  dot: { color: THEME.blue, fontWeight: '900', marginRight: 8 },
  indexText: { color: THEME.muted, fontWeight: '800', flex: 1, lineHeight: 20 },
  warningBox: { backgroundColor: '#3A2D17', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#6B4A10', marginBottom: 14 },
  warningTitle: { color: THEME.orange, fontWeight: '900', fontSize: 16 },
  warningText: { color: '#FED7AA', fontWeight: '700', lineHeight: 20, marginTop: 6 },
  runButton: { backgroundColor: THEME.green, borderRadius: 18, padding: 17, alignItems: 'center' },
  runText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  note: { color: THEME.muted, lineHeight: 20, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  summaryLabel: { color: THEME.muted, fontWeight: '800' },
  summaryValue: { color: THEME.blue, fontWeight: '900' },
});
