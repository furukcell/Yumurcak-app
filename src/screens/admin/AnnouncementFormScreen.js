// ============================================================
// YUMURCAK — AnnouncementFormScreen.js
// Duyuru oluşturma/düzenleme formu
// Hedef seçimi: tüm kurum / veliler / öğretmenler / sınıf
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { ref, set, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { createRoleNotification } from '../../services/notificationCenter';
import AppSuccessToast from '../../components/AppSuccessToast';

const TARGET_OPTIONS = [
  { key: 'all', label: 'Tüm Kurum', icon: '🏫' },
  { key: 'veli', label: 'Veliler', icon: '👨‍👩‍👧' },
  { key: 'ogretmen', label: 'Öğretmenler', icon: '👩‍🏫' },
  { key: 'sinif', label: 'Sınıf', icon: '📚' },
];

export default function AnnouncementFormScreen() {
  const route = useRoute();
  const { kullanici } = useAuth();
  const navigation = useNavigation();
  const { announcementId } = route.params || {};

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [targetRole, setTargetRole] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!announcementId);
  const [successToast, setSuccessToast] = useState(false);

  const kresId = kullanici?.kresId || 'default-kres';

  useEffect(() => {
    const loadClasses = async () => {
      try {
        // Artık tüm 'siniflar' node'u çekilmiyor, sadece bu kreşe ait sınıflar sorgulanıyor.
        const q = query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId));
        const snapshot = await get(q);
        const data = snapshot.val() || {};

        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => String(a.ad || '').localeCompare(String(b.ad || ''), 'tr'));

        setClasses(list);
      } catch (err) {
        console.warn('Sınıflar yüklenemedi:', err);
      }
    };

    loadClasses();
  }, [kresId]);

  useEffect(() => {
    if (announcementId) {
      const announcementRef = ref(database, `duyurular/${announcementId}`);

      get(announcementRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          setTitle(data.title || data.baslik || '');
          setMessage(data.message || data.icerik || '');
          setIsUrgent(data.priority === 'urgent');

          if (data.targetRole) {
            setTargetRole(data.targetRole);
          }

          if (data.sinifId) {
            setSelectedClassId(data.sinifId);
          }
        }

        setFetching(false);
      });
    }
  }, [announcementId]);

  const getNotificationRoles = () => {
    if (targetRole === 'veli') return ['veli'];
    if (targetRole === 'ogretmen') return ['ogretmen'];
    return ['veli', 'ogretmen'];
  };

  const getTargetText = () => {
    if (targetRole === 'veli') return 'Bu duyuru sadece velilere gönderilecek.';
    if (targetRole === 'ogretmen') return 'Bu duyuru sadece öğretmenlere gönderilecek.';
    if (targetRole === 'sinif') return 'Bu duyuru seçilen sınıfa bağlı kişilere gönderilecek.';
    return 'Bu duyuru tüm kuruma gönderilecek.';
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Hata', 'Başlık ve mesaj alanları boş olamaz.');
      return;
    }

    if (targetRole === 'sinif' && !selectedClassId) {
      Alert.alert('Hata', 'Sınıf bazlı duyuru için bir sınıf seçmelisin.');
      return;
    }

    setLoading(true);

    try {
      const data = {
        title: title.trim(),
        baslik: title.trim(),
        message: message.trim(),
        icerik: message.trim(),
        kresId,
        sentBy: 'admin',
        priority: isUrgent ? 'urgent' : 'normal',
        targetRole,
        sinifId: targetRole === 'sinif' ? selectedClassId : '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (announcementId) {
        await set(ref(database, `duyurular/${announcementId}`), data);
      } else {
        await push(ref(database, 'duyurular'), data);
      }

      if (!announcementId) {
        const roles = getNotificationRoles();

        await createRoleNotification({
          kresId: data.kresId,
          roles,
          baslik: isUrgent ? '🚨 Acil duyuru' : '📢 Yeni duyuru',
          mesaj: title.trim(),
          tip: 'duyuru',
          routeName: targetRole === 'ogretmen' ? 'TeacherAnnouncements' : 'ParentAnnouncements',
          createdBy: kullanici?.uid || kullanici?.id || '',
          targetRole,
          sinifId: targetRole === 'sinif' ? selectedClassId : '',
        });
      }

      setSuccessToast(true);

      setTimeout(() => {
        navigation.goBack();
      }, 900);
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
    <View style={styles.screen}>
      <AppSuccessToast
        visible={successToast}
        message={announcementId ? 'Duyuru güncellendi' : 'Duyuru gönderildi'}
        onHide={() => setSuccessToast(false)}
      />

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
            <Text style={styles.label}>Duyuru Hedefi</Text>

            <View style={styles.targetGrid}>
              {TARGET_OPTIONS.map((item) => {
                const active = targetRole === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.targetButton, active && styles.targetButtonActive]}
                    onPress={() => setTargetRole(item.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.targetIcon}>{item.icon}</Text>
                    <Text style={[styles.targetText, active && styles.targetTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.targetInfo}>{getTargetText()}</Text>
          </View>

          {targetRole === 'sinif' && (
            <View style={styles.field}>
              <Text style={styles.label}>Sınıf Seç</Text>

              {classes.length === 0 ? (
                <Text style={styles.emptyText}>Henüz sınıf bulunamadı.</Text>
              ) : (
                <View style={styles.classGrid}>
                  {classes.map((item) => {
                    const active = selectedClassId === item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.classButton, active && styles.classButtonActive]}
                        onPress={() => setSelectedClassId(item.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.classText, active && styles.classTextActive]}>
                          {item.ad || item.name || 'Sınıf'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
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
  textArea: { height: 120, textAlignVertical: 'top' },

  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  targetButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  targetButtonActive: {
    backgroundColor: '#EAF5E4',
    borderColor: '#27500A',
  },
  targetIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  targetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  targetTextActive: {
    color: '#27500A',
  },
  targetInfo: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
    marginTop: 2,
  },

  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  classButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  classButtonActive: {
    backgroundColor: '#27500A',
    borderColor: '#27500A',
  },
  classText: {
    color: '#333',
    fontWeight: '700',
  },
  classTextActive: {
    color: '#fff',
  },
  emptyText: {
    color: '#777',
    fontWeight: '600',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveButton: { backgroundColor: '#27500A', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
