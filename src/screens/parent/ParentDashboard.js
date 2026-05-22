import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ParentDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Veli Paneli</Text>
      <Text style={styles.sub}>Aşama 6'da geliştirilecek</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  sub: { fontSize: 14, color: '#999', marginTop: 8 },
});
