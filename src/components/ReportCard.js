import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';

export default function ReportCard({ report }) {
  const getMoodIcon = (mood) => {
    if (mood === 'happy') return '😊';
    if (mood === 'neutral') return '';
    if (mood === 'sad') return '😢';
    return '';
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{report.date}</Text>
        <Text style={styles.mood}>{getMoodIcon(report.mood)}</Text>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.info}>
          🍽️ Kahvaltı: {report.yemek?.breakfast ? '✅' : '❌'} &nbsp; 
          Öğle: {report.yemek?.lunch ? '✅' : '❌'}
        </Text>
        <Text style={styles.info}>
          💤 Uyku: {report.uyku?.duration} Saat &nbsp; 
          🚽 Tuv: {report.tuvalet?.count}
        </Text>
        {report.note ? <Text style={styles.note}>📝 {report.note}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  date: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#3C3489',
  },
  mood: {
    fontSize: 20,
  },
  body: {},
  info: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  note: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});
