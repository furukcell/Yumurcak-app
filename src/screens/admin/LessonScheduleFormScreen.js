// ============================================================
// YUMURCAK — LessonScheduleFormScreen.js
// Sınıf bazlı haftalık ders programı — serbest metin girişi
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  muted: '#707386',
  text: '#191A23',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const GUNLER = [
  { key: 'pazartesi', label: 'Pazartesi' },
  { key: 'sali', label: 'Salı' },
  { key: 'carsamba', label: 'Çarşamba' },
  { key: 'persembe', label: 'Perşembe' },
  { key: 'cuma', label: 'Cuma' },
  { key: 'cumartesi', label: 'Cumartesi' },
  { key: 'pazar', label: 'Pazar' },
];

export default function LessonScheduleFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kullanici } = useAuth();

  const sinifId = route.params?.sinifId;
  const sinifAd = route.params?.sinifAd || 'Sınıf';

  const [gunVerileri, setGunVerileri] = useState(
    GUNLER.reduce((acc, g) => ({ ...acc, [g.key]: '' }), {})
  );
  const [loading, setLoading] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!sinifId) {
      setLoading(false);
      return;
    }
    const programRef = ref(database, `dersProgramlari/${sinifId}`);
    const unsub = onValue(programRef, (snap) => {
      const data = snap.val();
      if (data && data.gunler) {
        setGunVerileri((prev) => ({ ...prev, ...data.gunler }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [sinifId]);

  const handleKaydet = async () => {
    if (!sinifId) {
      Alert.alert('Hata', 'Sınıf bilgisi bulunamadı.');
      return;
    }
    setKaydediliyor(true);
    try {
      const programRef = ref(database, `dersProgramlari/${sinifId}`);
      await set(programRef, {
        kresId: kullanici?.kresId || '',
        sinifId,
        gunler: gunVerileri,
        updatedAt: Date.now(),
      });
      setSuccessToast(true);
      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (err) {
      Alert.alert('Hata', 'Kaydedilirken bir sorun oluştu: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast
        visible={successToast}
        message="Ders programı kaydedildi"
        onHide={() => setSuccessToast(false)}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.baslik}>🏫 {sinifAd}</Text>
        <Text style={styles.altBaslik}>Her gün için programı serbest metin olarak yazabilirsin. Örn: 09:00 Serbest Oyun, 10:00 İngilizce</Text>

        {GUNLER.map((gun) => (
          <View key={gun.key} style={styles.gunBlok}>
            <Text style={styles.gunBaslik}>{gun.label}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={`${gun.label} programını buraya yaz...`}
              placeholderTextColor="#A6A8B8"
              value={gunVerileri[gun.key]}
              onChangeText={(text) =>
                setGunVerileri((prev) => ({ ...prev, [gun.key]: text }))
              }
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.kaydetBtn, kaydediliyor && styles.kaydetBtnDisabled]}
          onPress={handleKaydet}
          disabled={kaydediliyor}
          activeOpacity={0.85}
        >
          {kaydediliyor ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.kaydetBtnText}>Programı Kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  scrollContent: { padding: 18, paddingBottom: 50 },

  baslik: { fontSize: 19, fontWeight: '900', color: THEME.text, marginBottom: 4 },
  altBaslik: { fontSize: 12, color: THEME.muted, marginBottom: 18, lineHeight: 17 },

  gunBlok: { marginBottom: 16 },
  gunBaslik: { fontSize: 14, fontWeight: '800', color: THEME.primary, marginBottom: 6 },
  textArea: {
    backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.border,
    padding: 12, fontSize: 13, color: THEME.text, minHeight: 80, textAlignVertical: 'top',
  },

  kaydetBtn: {
    backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, shadowColor: THEME.primary,
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  kaydetBtnDisabled: { opacity: 0.6 },
  kaydetBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});