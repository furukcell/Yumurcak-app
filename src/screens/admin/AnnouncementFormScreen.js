// ============================================================
// YUMURCAK — AnnouncementFormScreen.js
// Duyuru oluşturma/düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { ref, set, push, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function AnnouncementFormScreen() {
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { announcementId } = route.params || {};
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!announcementId);

  useEffect(() => {
    if (announcementId) {
      const announcementRef = ref(database, `duyurular/${announcementId}`);
      get(announcementRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
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
      Alert.alert('Hata', 'Başlık ve mesaj alanları boş olamaz.');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        message: message.trim(),
        kresId: kullanici?.kresId || 'default-kres',
        sentBy: 'admin',
        priority: isUrgent ? 'urgent' : 'normal',
        targetRole: 'all',
        createdAt: Date.now(),
      };

      if (announcementId) {
        await set(ref(database, `duyurular/${announcementId}`), data);
      } else {
        await push(ref(database, 'duyurular'), data);
      }

      Alert.alert('Başarılı', 'Duyuru gönderildi!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Bir sorun oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27500A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Başlık *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Duyuru başlığı"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mesaj *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Duyuru mesajı"
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Acil Duyuru</Text>
            <Switch
              value={isUrgent}
              onValueChange={setIsUrgent}
              trackColor={{ false: '#ddd', true: '#ffcccc' }}
              thumbColor={isUrgent ? '#ff0000' : '#f4f3f4'}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {announcementId ? 'Güncelle' : 'Gönder'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#ddd',
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveButton: { backgroundColor: '#27500A', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
