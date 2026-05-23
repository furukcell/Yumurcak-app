import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { ref, push, set, get, serverTimestamp } from 'firebase/database';
import { db, auth } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute } from '@react-navigation/native';

export default function AnnouncementFormScreen() {
  const route = useRoute();
  const { announcementId } = route.params || {};

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!announcementId);

  useEffect(() => {
    if (announcementId) {
      const annRef = ref(db, `duyurular/${announcementId}`);
      get(annRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setTitle(data.title);
          setMessage(data.message);
          setIsUrgent(data.priority === 'urgent');
        }
        setFetching(false);
      });
    }
  }, [announcementId]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      return Alert.alert('Hata', 'Başlık ve mesaj alanları boş olamaz.');
    }

    setLoading(true);
    try {
      const id = announcementId || generateId(); // Yeni ise ID üret, varsa mevcut ID
      const data = {
        title,
        message,
        kresId: 'default-kres', // Admin için varsayılan
        sentBy: auth.currentUser.uid,
        priority: isUrgent ? 'urgent' : 'normal',
        targetRole: 'all', // Şimdilik herkese açık MVP
        createdAt: serverTimestamp() || Date.now()
      };

      if (announcementId) {
        await set(ref(db, `duyurular/${announcementId}`), data);
      } else {
        await push(ref(db, 'duyurular'), data);
      }

      Alert.alert('Başarılı', 'Duyuru gönderildi!', [
        { text: 'Tamam', onPress: () => navigation?.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Bir sorun oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Başlık</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Yarım Gün Tatil" />

      <Text style={styles.label}>Mesaj</Text>
      <TextInput style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} placeholder="Detayları buraya yazın..." multiline />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Acil Durum Bildirimi?</Text>
        <Switch value={isUrgent} onValueChange={setIsUrgent} />
      </View>

      <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>{announcementId ? 'Güncelle' : 'Duyuruyu Gönder'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 5 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  textArea: { height: 120, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  sendBtn: { backgroundColor: '#27500A', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
