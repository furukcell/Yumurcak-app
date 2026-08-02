// ============================================================
// YUMURCAK — ClassFormScreen.js
// Sınıf ekleme/düzenleme formu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { generateId } from '../../utils/id';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';
import { YAS_GRUPLARI } from '../../constants';

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

export default function ClassFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const { classId } = route.params || {};

  const [ad, setAd] = useState('');
  const [yasGrubu, setYasGrubu] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!classId);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (classId) {
      const classRef = ref(database, `siniflar/${classId}`);

      get(classRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setAd(data.ad || '');
          setYasGrubu(data.yasGrubu || '');
        }

        setFetching(false);
      }).catch((error) => {
        console.error(error);
        setFetching(false);
        Alert.alert('Hata', 'Sınıf bilgileri yüklenemedi');
      });
    }
  }, [classId]);

  const handleSave = async () => {
    if (!ad.trim() || !yasGrubu.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);

    try {
      const id = classId || generateId();
      const classRef = ref(database, `siniflar/${id}`);
      const existingSnap = classId ? await get(classRef) : null;
      const existingData = existingSnap?.exists?.() ? (existingSnap.val() || {}) : {};
      const existingTeacherIds = asArray(existingData.ogretmenIds);
      const now = Date.now();
      const nextKresId = existingData.kresId || kullanici?.kresId || 'default-kres';

      const classData = {
        ...existingData,
        ad: ad.trim(),
        yasGrubu: yasGrubu.trim(),
        ogretmenIds: existingTeacherIds,
        kresId: nextKresId,
        createdAt: existingData.createdAt || now,
        updatedAt: now,
      };

      const updates = {
        [`siniflar/${id}`]: classData,
        [`kresSiniflari/${nextKresId}/${id}`]: true,
      };

      if (existingData.kresId && existingData.kresId !== nextKresId) {
        updates[`kresSiniflari/${existingData.kresId}/${id}`] = null;
      }

      existingTeacherIds.forEach((teacherId) => {
        if (teacherId) updates[`ogretmenSiniflari/${teacherId}/${id}`] = true;
      });

      await update(ref(database), updates);

      setSuccessToast(true);

      setTimeout(() => {
        navigation.goBack();
      }, 900);
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
    <View style={styles.screen}>
      <AppSuccessToast
        visible={successToast}
        message={classId ? 'Sınıf bilgileri güncellendi' : 'Sınıf kaydedildi'}
        onHide={() => setSuccessToast(false)}
      />

      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Sınıf Adı *</Text>
            <TextInput
              style={styles.input}
              value={ad}
              onChangeText={setAd}
              placeholder="Örn: Papatya Sınıfı"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Yaş Grubu *</Text>
            <View style={styles.chipWrap}>
              {YAS_GRUPLARI.map((item) => {
                const active = yasGrubu === item.label;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.yasChip, active && styles.yasChipActive]}
                    onPress={() => setYasGrubu(item.label)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.yasChipText, active && styles.yasChipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yasChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  yasChipActive: { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  yasChipText: { fontWeight: '700', fontSize: 13, color: '#333' },
  yasChipTextActive: { color: '#fff' },
  saveButton: {
    backgroundColor: '#3C3489',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
