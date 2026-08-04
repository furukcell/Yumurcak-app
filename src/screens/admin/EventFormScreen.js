// ============================================================
// YUMURCAK — EventFormScreen.js
// Etkinlik ekle/düzenle — çoklu sınıf seçimi
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { ref, onValue, push, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { parseChildBirthDate, normalizeChildBirthDate, formatChildBirthDate } from '../../utils/childDates';
import AppSuccessToast from '../../components/AppSuccessToast';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  muted: '#707386',
  text: '#191A23',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  red: '#FF4D6D',
};

export default function EventFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kullanici } = useAuth();

  const etkinlikId = route.params?.etkinlikId || null;
  const duzenlemeModu = !!etkinlikId;

  const [baslik, setBaslik] = useState('');
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [aktif, setAktif] = useState(true);
  const [seciliSiniflar, setSeciliSiniflar] = useState([]);

  const [siniflar, setSiniflar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    const kresId = kullanici?.kresId;
    if (!kresId) {
      setSiniflar([]);
      if (!duzenlemeModu) setLoading(false);
      return undefined;
    }

    // FAZ 5 FIX — 'siniflar' düğümünün Firebase kuralı sadece
    // orderByChild('kresId').equalTo(...) SORGUSUNA izin veriyor.
    // Filtresiz `ref(database, 'siniflar')` okuması reddediliyordu ve
    // onValue'nun success callback'i hiç tetiklenmediği için loading
    // sonsuza kadar true kalıyordu (beyaz ekran / sonsuz döngü).
    const sinifQuery = query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId));
    const sinifUnsub = onValue(
      sinifQuery,
      (snap) => {
        const data = snap.val() || {};
        const liste = Object.entries(data).map(([id, s]) => ({
          id,
          ad: s?.ad || 'İsimsiz Sınıf',
        }));
        setSiniflar(liste);

        if (!duzenlemeModu) {
          setLoading(false);
        }
      },
      () => {
        setSiniflar([]);
        if (!duzenlemeModu) setLoading(false);
      }
    );

    return () => sinifUnsub();
  }, [kullanici?.kresId]);

  useEffect(() => {
    if (!duzenlemeModu) return;
    const eventRef = ref(database, `etkinlikler/${etkinlikId}`);
    const unsub = onValue(eventRef, (snap) => {
      const data = snap.val();
      if (data) {
        setBaslik(data.baslik || '');
        setTarih(data.tarih ? formatChildBirthDate(data.tarih) : '');
        setSaat(data.saat || '');
        setAciklama(data.aciklama || '');
        setAktif(data.aktif !== false);
        setSeciliSiniflar(data.sinifIds || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [etkinlikId]);

  const toggleSinif = (sinifId) => {
    setSeciliSiniflar((prev) =>
      prev.includes(sinifId)
        ? prev.filter((id) => id !== sinifId)
        : [...prev, sinifId]
    );
  };

  const handleKaydet = async () => {
    if (!baslik.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen etkinlik başlığını gir.');
      return;
    }
    if (!tarih.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen etkinlik tarihini gir. (örn: 25.06.2026)');
      return;
    }
    if (!parseChildBirthDate(tarih)) {
      Alert.alert('Hata', 'Tarihi 25.06.2026 formatında gir.');
      return;
    }
    if (seciliSiniflar.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az bir sınıf seç.');
      return;
    }

    setKaydediliyor(true);
    try {
      const veri = {
        kresId: kullanici?.kresId || '',
        baslik: baslik.trim(),
        tarih: normalizeChildBirthDate(tarih),
        saat: saat.trim(),
        sinifIds: seciliSiniflar,
        aciklama: aciklama.trim(),
        aktif,
      };

      if (duzenlemeModu) {
        await update(ref(database, `etkinlikler/${etkinlikId}`), veri);
      } else {
        const yeniRef = push(ref(database, 'etkinlikler'));
        await set(yeniRef, { ...veri, createdAt: Date.now() });
      }

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

  const handleSil = () => {
    Alert.alert(
      'Etkinliği Sil',
      'Bu etkinliği silmek istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(ref(database, `etkinlikler/${etkinlikId}`));
              navigation.goBack();
            } catch (err) {
              Alert.alert('Hata', 'Silinirken bir sorun oluştu: ' + err.message);
            }
          },
        },
      ]
    );
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
        message="Etkinlik kaydedildi"
        onHide={() => setSuccessToast(false)}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>

        <Text style={styles.label}>Etkinlik Başlığı</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Piknik Etkinliği"
          placeholderTextColor="#A6A8B8"
          value={baslik}
          onChangeText={setBaslik}
        />

        <Text style={styles.label}>Tarih</Text>
        <TextInput
          style={styles.input}
          placeholder="25.06.2026"
          placeholderTextColor="#A6A8B8"
          value={tarih}
          onChangeText={setTarih}
        />

        <Text style={styles.label}>Saat (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          placeholder="10:00"
          placeholderTextColor="#A6A8B8"
          value={saat}
          onChangeText={setSaat}
        />

        <Text style={styles.label}>Açıklama (opsiyonel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Etkinlik hakkında detay yaz..."
          placeholderTextColor="#A6A8B8"
          value={aciklama}
          onChangeText={setAciklama}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Sınıflar (birden fazla seçilebilir)</Text>
        <View style={styles.sinifListesi}>
          {siniflar.length === 0 ? (
            <Text style={styles.bilgiMetni}>Henüz sınıf eklenmemiş.</Text>
          ) : (
            siniflar.map((s) => {
              const secili = seciliSiniflar.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sinifChip, secili && styles.sinifChipSecili]}
                  onPress={() => toggleSinif(s.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sinifChipText, secili && styles.sinifChipTextSecili]}>
                    {secili ? '✓ ' : ''}{s.ad}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.aktifSatir}>
          <Text style={styles.label}>Etkinlik Aktif</Text>
          <Switch
            value={aktif}
            onValueChange={setAktif}
            trackColor={{ false: '#ddd', true: THEME.primarySoft }}
            thumbColor={aktif ? THEME.primary : '#fff'}
          />
        </View>

        <TouchableOpacity
          style={[styles.kaydetBtn, kaydediliyor && styles.kaydetBtnDisabled]}
          onPress={handleKaydet}
          disabled={kaydediliyor}
          activeOpacity={0.85}
        >
          {kaydediliyor ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.kaydetBtnText}>
              {duzenlemeModu ? 'Değişiklikleri Kaydet' : 'Etkinliği Oluştur'}
            </Text>
          )}
        </TouchableOpacity>

        {duzenlemeModu ? (
          <TouchableOpacity style={styles.silBtn} onPress={handleSil} activeOpacity={0.85}>
            <Text style={styles.silBtnText}>Etkinliği Sil</Text>
          </TouchableOpacity>
        ) : null}

      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  scrollContent: { padding: 18, paddingBottom: 50 },

  label: { fontSize: 13, fontWeight: '800', color: THEME.text, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: THEME.text,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  sinifListesi: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bilgiMetni: { fontSize: 13, color: THEME.muted },
  sinifChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border,
    marginRight: 8, marginBottom: 8,
  },
  sinifChipSecili: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  sinifChipText: { fontSize: 13, fontWeight: '700', color: THEME.text },
  sinifChipTextSecili: { color: '#fff' },

  aktifSatir: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 18,
  },

  kaydetBtn: {
    backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 24, shadowColor: THEME.primary,
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  kaydetBtnDisabled: { opacity: 0.6 },
  kaydetBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  silBtn: {
    borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: THEME.red,
  },
  silBtnText: { color: THEME.red, fontSize: 14, fontWeight: '800' },
});
