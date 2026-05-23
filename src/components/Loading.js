import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Loading({ color = '#3C3489', size = 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
