// ============================================================
// YUMURCAK — TeacherPhysicalDevelopmentScreen.js
// Öğretmen kendi sınıfındaki çocuklara fiziksel gelişim kaydı girer
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';

export default function TeacherPhysicalDevelopmentScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, classChildren } = useTeacherData();

  const [selectedChildId, setSelectedChildId] = useState('');
  const [boy, setBoy] = useState('');
  const [kilo, setKilo] = useState('');
  const [basCevresi, setBasCevresi] = useState('');
  const [not, setNot] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedChild = useMemo(() => {
    return classChildren.find((child) => child.id === selectedChildId) || null;
  }, [classChildren, selectedChildId]);

  const today = new Date().toISOString().split('T')[0];

  const saveGrowth = async () => {
    if (!currentClass?.id) {
      Alert.alert('Hata', 'Sınıf bilgisi bulunamadı.');
      return;
    }

    if (!selectedChild?.id) {
      Alert.alert('Eksik Bilgi', 'Önce bir çocuk seçmelisin.');
      return;
    }

    if (!boy.trim() && !kilo.trim() && !basCevresi.trim()) {
      Alert.alert('Eksik Bilgi', 'En az boy, kilo veya baş çevresi alanlarından birini gir.');
      return;
    }

    setSaving(true);

    try {
      await push(ref(database, 'fizikselGelisim'), {
        kresId: kresId || selectedChild.kresId || currentClass.kresId || '',
        sinifId: currentClass.id,
        cocukId: selectedChild.id,
        cocukAdi: getChildName(selectedChild),
        ogretmenId: teacherId || '',
        boy: boy.trim(),
        kilo: kilo.trim(),
        basCevresi: basCevresi.trim(),
        not: not.trim(),
        tarih: today,
        createdAt: Date.now(),
      });

      setBoy('');
      setKilo('');
      setBasCevresi('');
      setNot('');

      Alert.alert('Başarılı', 'Fiziksel gelişim kaydı eklendi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Gelişim kaydı eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Fiziksel gelişim hazırlanıyor..." />;

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <ScreenHeader
        navigation={navigation}
        title="Fiziksel Gelişim"
        subtitle={currentClass?.ad || 'Sınıfım'}
      />

      <ScrollView contentContainerStyle={localStyles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title="Sınıf bulunamadı" desc="Ölçüm girmek için öğretmen hesabı bir sınıfa bağlı olmalı." />
        ) : classChildren.length === 0 ? (
          <EmptyState icon="👧" title="Çocuk yok" desc="Sınıfa çocuk eklendiğinde burada listelenecek." />
        ) : (
          <>
            <View style={localStyles.card}>
              <Text style={localStyles.cardTitle}>Çocuk Seç</Text>

              <View style={localStyles.childGrid}>
                {classChildren.map((child) => {
                  const active = selectedChildId === child.id;

                  return (
                    <TouchableOpacity
                      key={child.id}
                      style={[localStyles.childButton, active && localStyles.childButtonActive]}
                      onPress={() => setSelectedChildId(child.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[localStyles.childText, active && localStyles.childTextActive]}>
                        {getChildName(child)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={localStyles.card}>
              <Text style={localStyles.cardTitle}>Ölçüm Bilgileri</Text>
              <Text style={localStyles.helpText}>
                {selectedChild ? `${getChildName(selectedChild)} için kayıt giriyorsun.` : 'Önce çocuk seç.'}
              </Text>

              <TextInput
                style={localStyles.input}
                value={boy}
                onChangeText={setBoy}
                placeholder="Boy (cm)"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <TextInput
                style={localStyles.input}
                value={kilo}
                onChangeText={setKilo}
                placeholder="Kilo (kg)"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <TextInput
                style={localStyles.input}
                value={basCevresi}
                onChangeText={setBasCevresi}
                placeholder="Baş çevresi (cm) - opsiyonel"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[localStyles.input, localStyles.textArea]}
                value={not}
                onChangeText={setNot}
                placeholder="Not - opsiyonel"
                placeholderTextColor="#999"
                multiline
              />

              <TouchableOpacity
                style={[localStyles.saveButton, saving && localStyles.saveButtonDisabled]}
                onPress={saveGrowth}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={localStyles.saveText}>Kaydı Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTitle: {
    color: THEME.primary,
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
  },
  helpText: {
    color: THEME.muted,
    fontWeight: '700',
    marginBottom: 10,
  },
  childGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  childButton: {
    backgroundColor: THEME.bg,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
    marginBottom: 8,
  },
  childButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  childText: {
    color: THEME.text,
    fontWeight: '800',
  },
  childTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: THEME.bg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#FFF',
    fontWeight: '900',
  },
});
