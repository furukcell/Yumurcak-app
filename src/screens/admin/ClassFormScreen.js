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
import { Sinif } from '../../types/database';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AdminStackNavigationProp } from '../../navigation/AdminStack';

type RouteParams = { classId?: string };
type NavigationProp = AdminStackNavigationProp<'ClassForm'>;

export default function ClassFormScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { classId } = route.params as RouteParams;

  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!classId);

  useEffect(() => {
    if (classId) {
      const classRef = ref(db, `siniflar/${classId}`);
      get(classRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as Sinif;
          setName(data.name);
          setAgeGroup(data.ageGroup);
        }
        setFetching(false);
      });
    }
  }, [classId]);

  const handleSave = async () => {
    if (!name.trim() || !ageGroup.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const id = classId || generateId();
      const classData: Partial<Sinif> = {
        name: name.trim(),
        ageGroup: ageGroup.trim(),
        teacherIds: [],
        kresId: 'default-kres', // TODO: Gerçek kres ID'si
        createdAt: Date.now(),
      };

      await set(ref(db, `siniflar/${id}`), classData);
      Alert.alert('Başarılı', 'Sınıf kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Sınıf kaydedilemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3C3489" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Sınıf Adı</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Örn: Papatya Sınıfı"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Yaş Grubu</Text>
          <TextInput
            style={styles.input}
            value={ageGroup}
            onChangeText={setAgeGroup}
            placeholder="Örn: 2-3 yaş"
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
              {classId ? 'Güncelle' : 'Oluştur'}
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
    backgroundColor: '#3C3489',
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
