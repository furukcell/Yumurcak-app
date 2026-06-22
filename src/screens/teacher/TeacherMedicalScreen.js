// ============================================================
// YUMURCAK — TeacherMedicalScreen.js
// FAZ 3: Öğretmen medikal bilgileri görür ve gözlem notu ekler
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';

export default function TeacherMedicalScreen() {
  const navigation = useNavigation();
  const { kullanici, teacherId, loading, classChildren, medicalMap, currentClass, kresId } = useTeacherData();

  const [drafts, setDrafts] = useState({});
  const [savingChildId, setSavingChildId] = useState(null);

  useEffect(() => {
    const nextDrafts = {};
    classChildren.forEach((child) => {
      const info = medicalMap[child.id] || {};
      nextDrafts[child.id] = {
        alerjiler: info.alerjiler || '',
        ilaclar: info.ilaclar || '',
        notlar: info.notlar || '',
        ogretmenNotu: info.ogretmenNotu || '',
      };
    });
    setDrafts((prev) => ({ ...nextDrafts, ...prev }));
  }, [classChildren, medicalMap]);

  const teacherName = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Öğretmen';

  const setDraftValue = (childId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [key]: value,
      },
    }));
  };

  const saveInfo = async (child) => {
    if (!child?.id) return;
    const draft = drafts[child.id] || {};
    setSavingChildId(child.id);

    try {
      await update(ref(database, `medikalBilgiler/${child.id}`), {
        kresId: child.kresId || kresId || '',
        cocukId: child.id,
        sinifId: child.sinifId || currentClass?.id || '',
        alerjiler: draft.alerjiler || '',
        ilaclar: draft.ilaclar || '',
        notlar: draft.notlar || '',
        ogretmenNotu: draft.ogretmenNotu || '',
        guncelleyenOgretmenId: teacherId || '',
        guncelleyenOgretmenAdi: teacherName,
        updatedAt: Date.now(),
      });

      Alert.alert('Kaydedildi', `${getChildName(child)} için bilgiler güncellendi.`);
    } catch (error) {
      console.error('Medikal bilgi kaydetme hatası:', error);
      Alert.alert('Hata', 'Bilgiler kaydedilemedi.');
    } finally {
      setSavingChildId(null);
    }
  };

  if (loading) return <LoadingState text="Medikal bilgiler hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader navigation={navigation} title="Medikal Bilgiler" subtitle="Alerji, ilaç ve öğretmen gözlem notları" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="🩺" title="Çocuk yok" desc="Sınıfa çocuk bağlanınca medikal bilgiler görünür." />
        ) : (
          classChildren.map((child) => {
            const draft = drafts[child.id] || {};
            const info = medicalMap[child.id] || {};
            const isSaving = savingChildId === child.id;

            return (
              <View key={child.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🩺</Text>
                  </View>
                  <View style={styles.titleWrap}>
                    <Text style={styles.name} numberOfLines={1}>{getChildName(child)}</Text>
                    <Text style={styles.subText} numberOfLines={1}>{currentClass?.ad || child.sinifAdi || 'Sınıf bilgisi yok'}</Text>
                  </View>
                </View>

                <Text style={styles.label}>Alerjiler</Text>
                <TextInput
                  style={styles.input}
                  value={draft.alerjiler}
                  onChangeText={(text) => setDraftValue(child.id, 'alerjiler', text)}
                  placeholder="Örn: Süt alerjisi, polen..."
                  placeholderTextColor={THEME.muted}
                  multiline
                />

                <Text style={styles.label}>İlaç Bilgisi</Text>
                <TextInput
                  style={styles.input}
                  value={draft.ilaclar}
                  onChangeText={(text) => setDraftValue(child.id, 'ilaclar', text)}
                  placeholder="Veli/yönetici tarafından paylaşılan ilaç bilgisi..."
                  placeholderTextColor={THEME.muted}
                  multiline
                />

                <Text style={styles.label}>Genel Notlar</Text>
                <TextInput
                  style={styles.input}
                  value={draft.notlar}
                  onChangeText={(text) => setDraftValue(child.id, 'notlar', text)}
                  placeholder="Veli ve yönetici için özel notlar..."
                  placeholderTextColor={THEME.muted}
                  multiline
                />

                <Text style={styles.label}>Öğretmen Gözlem Notu</Text>
                <TextInput
                  style={styles.input}
                  value={draft.ogretmenNotu}
                  onChangeText={(text) => setDraftValue(child.id, 'ogretmenNotu', text)}
                  placeholder="Bugünkü gözlem veya hatırlatma notu..."
                  placeholderTextColor={THEME.muted}
                  multiline
                />

                {info.updatedAt ? (
                  <Text style={styles.updatedText}>Son güncelleme: {new Date(info.updatedAt).toLocaleString('tr-TR')}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={() => saveInfo(child)}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>{isSaving ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 23 },
  titleWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '900', color: THEME.primary },
  subText: { color: THEME.muted, fontWeight: '700', marginTop: 2 },
  label: { color: THEME.muted, fontWeight: '900', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border, borderRadius: 14, minHeight: 62, padding: 12, color: THEME.text, textAlignVertical: 'top', fontSize: 14, fontWeight: '700' },
  updatedText: { color: THEME.muted, fontSize: 12, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  saveButtonText: { color: '#fff', fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
});