import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐣 Yumurcak</Text>
      <Text style={styles.sub}>Giriş ekranı — Aşama 2'de tamamlanacak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9F0' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 12 },
  sub: { fontSize: 14, color: '#999' },
});
