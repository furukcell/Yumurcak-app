import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isRead, listenNotifications } from '../services/notificationCenter';

export default function AppNotificationButton({ navigation, style }) {
  const { kullanici } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!kullanici) return undefined;
    const off = listenNotifications(kullanici, (items) => {
      setCount(items.filter((x) => !isRead(x, kullanici)).length);
    });
    return () => off();
  }, [kullanici]);

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.82}>
      <Text style={styles.icon}>🔔</Text>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEEAF8' },
  icon: { fontSize: 21 },
  badge: { position: 'absolute', top: -4, right: -5, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4D6D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});
