import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ref, set, get } from 'firebase/database';
import { db } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ChildFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { childId } = route.params || {};

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sinifId, setSinifId] = useState('');
  const [parentIds, setParentIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!childId);

  useEffect(() => {
    if (childId) {
      const childRef = ref(db, `cocuklar/${childId}`);
      get(childRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setName(data.name);
          setBirthDate(data.birthDate);
          setSinifId(data.sinifId);
          setParentIds(data.parentIds?.join(', ') || '');
        }
        setFetching(false);
      });
    }
  }, [childId]);

  const handleSave = async () => {
    if (!name.trim() || !birthDate.trim() || !sinifId.trim()) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const id = childId || generateId();
      const parentIdsArray = parentIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);

      const childData = {
        name: name.trim(),
        birthDate: birthDate.trim(),
        sinifId: sinifId.trim(),
        kresId: 'default-kres',
        parentIds: parentIdsArray,
        createdAt: Date.now(),
      };

      await set(ref(db, `cocuklar/${id}`), childData);
      Alert.alert('Başarılı', 'Çocuk kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Çocuk kaydedilemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#712B13" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Çocuk Adı *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Örn: Ali Yılmaz"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Doğum Tarihi (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="2022-05-15"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sınıf ID *</Text>
          <TextInput
            style={styles.input}
            value={sinifId}
            onChangeText={setSinifId}
            placeholder="Sınıf Firebase ID"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Veli ID'ler (virgülle ayırın)</Text>
          <TextInput
            style={styles.input}
            value={parentIds}
            onChangeText={setParentIds}
            placeholder="user1, user2"
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {childId ? 'Güncelle' : 'Oluştur'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#712B13',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
