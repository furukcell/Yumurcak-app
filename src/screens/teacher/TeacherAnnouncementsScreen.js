// ============================================================
// YUMURCAK — TeacherAnnouncementsScreen.js
// FAZ 3: Öğretmen kendi sınıfı velilerine duyuru oluşturabilir
// Hedef filtreleme eklendi
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
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate } from './teacherShared';

export default function TeacherAnnouncementsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, announcements } = useTeacherData();

  const [showForm, setShowForm] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [icerik, setIcerik] = useState('');
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    if (!currentClass?.id) return [];

    return announcements
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        const targetRole = item.targetRole || item.hedefRol || item.hedefTipi || 'all';
        const itemClassId = item.sinifId || item.classId || '';

        // Öğretmenin kendi oluşturduğu sınıf velisi duyuruları listede kalsın
        if (item.olusturanRol === 'ogretmen' && itemClassId === currentClass.id) {
          return true;
        }

        // Admin sadece velilere gönderdiyse öğretmen görmesin
        if (targetRole === 'veli') {
          return false;
        }

        // Admin sadece öğretmenlere gönderdiyse öğretmen görsün
        if (targetRole === 'ogretmen') {
          return true;
        }

        // Sınıf bazlı duyuru ise sadece öğretmenin kendi sınıfıysa görsün
        if (targetRole === 'sinif') {
          return itemClassId === currentClass.id;
        }

        // Eski/tüm kurum duyuruları:
        // sinifId yoksa tüm kurum, varsa sadece kendi sınıfı
        return !itemClassId || itemClassId === currentClass.id;
      })
      .sort((a, b) => String(b.createdAt || b.tarih || '').localeCompare(String(a.createdAt || a.tarih || '')));
  }, [announcements, currentClass?.id, kresId]);

  if (loading) return <LoadingState text="Duyurular hazırlanıyor..." />;

  const saveAnnouncement = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!baslik.trim() || !icerik.trim()) return Alert.alert('Eksik Bilgi', 'Başlık ve duyuru metni zorunludur.');

    setSaving(true);
    try {
      await push(ref(database, 'duyurular'), {
        kresId: kresId || currentClass.kresId || '',
        sinifId: currentClass.id,
        olusturanId: teacherId || '',
        olusturanRol: 'ogretmen',
        hedefRol: 'veli',
        targetRole: 'veli',
        baslik: baslik.trim(),
        title: baslik.trim(),
        icerik: icerik.trim(),
        message: icerik.trim(),
        tarih: new Date().toISOString().split('T')[0],
        aktif: true,
        createdAt: Date.now(),
      });

      setBaslik('');
      setIcerik('');
      setShowForm(false);
      Alert.alert('Başarılı', 'Duyuru sınıf velilerine gönderildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Duyuru kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const getBadgeText = (item) => {
    const targetRole = item.targetRole || item.hedefRol || item.hedefTipi || 'all';

    if (item.olusturanRol === 'ogretmen') return 'Sınıf Velilerine';
    if (targetRole === 'ogretmen') return 'Öğretmen Duyurusu';
    if (targetRole === 'sinif') return 'Sınıf Duyurusu';

    return 'Kurum Duyurusu';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        navigation={navigation}
        title="Duyurular"
        subtitle={currentClass?.ad || 'Sınıfım'}
        rightText={showForm ? 'Kapat' : '+ Ekle'}
        onRightPress={() => setShowForm((v) => !v)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sınıf Velilerine Duyuru</Text>
            <TextInput
              style={styles.input}
              value={baslik}
              onChangeText={setBaslik}
              placeholder="Duyuru başlığı"
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={icerik}
              onChangeText={setIcerik}
              placeholder="Duyuru metni"
              multiline
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveAnnouncement} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Duyuruyu Gönder</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState icon="📣" title="Duyuru yok" desc="Sınıfına duyuru eklediğinde burada görünür." />
        ) : (
          visible.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.badge}>{getBadgeText(item)}</Text>
                <Text style={styles.date}>{formatDate(item.tarih)}</Text>
              </View>
              <Text style={styles.title}>{item.baslik || item.title || 'Duyuru'}</Text>
              <Text style={styles.body}>{item.icerik || item.message || item.metin || item.aciklama || '-'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  formCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  formTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  date: { color: THEME.muted, fontWeight: '800', fontSize: 12 },
  title: { fontSize: 17, fontWeight: '900', color: THEME.text },
  body: { color: THEME.muted, marginTop: 6, lineHeight: 19, fontWeight: '600' },
});
