// ============================================================
// YUMURCAK — DashboardScreen.js
// Yönetici ana paneli
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
  const navigation = useNavigation();

  const menuItems = [
    { title: 'Sınıflar', icon: '🏫', screen: 'ClassList', color: '#0C447C' },
    { title: 'Çocuklar', icon: '👶', screen: 'ChildList', color: '#712B13' },
    { title: 'Öğretmenler', icon: '‍', screen: 'TeacherList', color: '#633806' },
    { title: 'Duyurular', icon: '📢', screen: 'AnnouncementList', color: '#27500A' },
    { title: 'Veliler', icon: '👨‍👩‍👧', screen: 'VeliList', color: '#1a6b3c' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Hoş Geldiniz 👋</Text>
        <Text style={styles.subtitleText}>Yumurcak Kreş Yönetim Paneli</Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.menuCard, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Hızlı İstatistikler</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Sınıf</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Çocuk</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Öğretmen</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#3C3489', padding: 24, paddingTop: 40 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitleText: { fontSize: 16, color: '#CECBF6' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, justifyContent: 'space-between' },
  menuCard: { width: '47%', aspectRatio: 1, borderRadius: 16, padding: 20, marginBottom: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  menuIcon: { fontSize: 48, marginBottom: 12 },
  menuTitle: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center' },
  statsContainer: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, elevation: 2 },
  statsTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#333' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 32, fontWeight: 'bold', color: '#3C3489' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },
});
