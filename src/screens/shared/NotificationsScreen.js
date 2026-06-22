import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F6FF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#191A23' }}>Bildirimler</Text>
      </View>
    </SafeAreaView>
  );
}
