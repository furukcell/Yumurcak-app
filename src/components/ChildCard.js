import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from './Card';

export default function ChildCard({ child, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{child.name}</Text>
            <Text style={styles.details}>Doğum: {child.birthDate}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3C3489',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  details: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
});
