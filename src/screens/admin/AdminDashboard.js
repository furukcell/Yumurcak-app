import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yönetici Paneli</Text>
      <Text style={styles.sub}>Aşama 4'te geliştirilecek</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  sub: { fontSize: 14, color: '#999', marginTop: 8 },
});
