// ============================================================
// YUMURCAK — TeacherPhysicalDevelopmentScreen.js
// Öğretmen kendi sınıfındaki çocuklara fiziksel gelişim kaydı girer
// + Sınıf geçmişi tabı
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ref, push, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';

function toList(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([id, item]) => ({ id, ...(item || {}) }));
}

function formatDate(value) {
  if (!value) return '-';
  const raw = String(value).slice(0, 10);
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

export default function TeacherPhysicalDevelopmentScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, classChildren } = useTeacherData();

  const [tab, setTab] = useState('form');
  const [records, setRecords] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [boy, setBoy] = useState('');
  const [kilo, setKilo] = useState('');
  const [basCevresi, setBasCevresi] = useState('');
  const [not, setNot] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kresId) {
      setRecords([]);
      return undefined;
    }
    // Artık tüm 'fizikselGelisim' node'u çekilmiyor, sadece bu kreşe ait kayıtlar sorgulanıyor.
    const q = query(ref(database, 'fizikselGelisim'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      setRecords(toList(snap.val()));
    }, () => setRecords([]));

    return () => unsub();
  }, [kresId]);

  const selectedChild = useMemo(() => {
    return classChildren.find((child) => child.id === selectedChildId) || null;
  }, [classChildren, selectedChildId]);

  const classChildIds = useMemo(() => {
    return new Set(classChildren.map((child) => String(child.id)));
  }, [classChildren]);

  const classRecords = useMemo(() => {
    return records
      .filter((item) => {
        if (currentClass?.id && item.sinifId) return String(item.sinifId) === String(currentClass.id);
        return classChildIds.has(String(item.cocukId || ''));
      })
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [records, currentClass?.id, classChildIds]);

  const selectedChildRecords = useMemo(() => {
    if (!selectedChildId) return [];
    return classRecords.filter((item) => String(item.cocukId || '') === String(selectedChildId)).slice(0, 5);
  }, [classRecords, selectedChildId]);

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
      setTab('history');

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
      <ScreenHeader navigation={navigation} title="Fiziksel Gelişim" subtitle={currentClass?.ad || 'Sınıfım'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={localStyles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title="Sınıf bulunamadı" desc="Ölçüm girmek için öğretmen hesabı bir sınıfa bağlı olmalı." />
        ) : classChildren.length === 0 ? (
          <EmptyState icon="👧" title="Çocuk yok" desc="Sınıfa çocuk eklendiğinde burada listelenecek." />
        ) : (
          <>
            <View style={localStyles.tabRow}>
              <TouchableOpacity style={[localStyles.tabButton, tab === 'form' && localStyles.tabButtonActive]} onPress={() => setTab('form')} activeOpacity={0.85}>
                <Text style={[localStyles.tabText, tab === 'form' && localStyles.tabTextActive]}>Kayıt Gir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[localStyles.tabButton, tab === 'history' && localStyles.tabButtonActive]} onPress={() => setTab('history')} activeOpacity={0.85}>
                <Text style={[localStyles.tabText, tab === 'history' && localStyles.tabTextActive]}>Geçmiş</Text>
              </TouchableOpacity>
            </View>

            {tab === 'form' ? (
              <>
                <View style={localStyles.card}>
                  <Text style={localStyles.cardTitle}>Çocuk Seç</Text>
                  <View style={localStyles.childGrid}>
                    {classChildren.map((child) => {
                      const active = selectedChildId === child.id;
                      return (
                        <TouchableOpacity key={child.id} style={[localStyles.childButton, active && localStyles.childButtonActive]} onPress={() => setSelectedChildId(child.id)} activeOpacity={0.85}>
                          <Text style={[localStyles.childText, active && localStyles.childTextActive]}>{getChildName(child)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={localStyles.card}>
                  <Text style={localStyles.cardTitle}>Ölçüm Bilgileri</Text>
                  <Text style={localStyles.helpText}>{selectedChild ? `${getChildName(selectedChild)} için kayıt giriyorsun.` : 'Önce çocuk seç.'}</Text>

                  {selectedChildRecords.length > 0 ? (
                    <View style={localStyles.lastRecordBox}>
                      <Text style={localStyles.lastRecordTitle}>Son kayıt: {formatDate(selectedChildRecords[0].tarih || selectedChildRecords[0].createdAt)}</Text>
                      <Text style={localStyles.lastRecordText}>Boy: {selectedChildRecords[0].boy || '-'} cm · Kilo: {selectedChildRecords[0].kilo || '-'} kg · Baş: {selectedChildRecords[0].basCevresi || '-'} cm</Text>
                    </View>
                  ) : null}

                  <TextInput style={localStyles.input} value={boy} onChangeText={setBoy} placeholder="Boy (cm)" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  <TextInput style={localStyles.input} value={kilo} onChangeText={setKilo} placeholder="Kilo (kg)" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  <TextInput style={localStyles.input} value={basCevresi} onChangeText={setBasCevresi} placeholder="Baş çevresi (cm) - opsiyonel" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  <TextInput style={[localStyles.input, localStyles.textArea]} value={not} onChangeText={setNot} placeholder="Not - opsiyonel" placeholderTextColor="#999" multiline />

                  <TouchableOpacity style={[localStyles.saveButton, saving && localStyles.saveButtonDisabled]} onPress={saveGrowth} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={localStyles.saveText}>Kaydı Ekle</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={localStyles.card}>
                <View style={localStyles.historyHeader}>
                  <View>
                    <Text style={localStyles.cardTitle}>Sınıf Gelişim Geçmişi</Text>
                    <Text style={localStyles.helpText}>{classRecords.length} kayıt</Text>
                  </View>
                  <Text style={localStyles.historyIcon}>📈</Text>
                </View>

                {classRecords.length === 0 ? (
                  <EmptyState icon="📈" title="Henüz kayıt yok" desc="Boy, kilo veya baş çevresi kaydı girildiğinde burada listelenecek." />
                ) : (
                  classRecords.map((item) => (
                    <View key={item.id} style={localStyles.recordCard}>
                      <View style={localStyles.recordTopRow}>
                        <Text style={localStyles.recordName}>{item.cocukAdi || getChildName(classChildren.find((child) => child.id === item.cocukId))}</Text>
                        <Text style={localStyles.recordDate}>{formatDate(item.tarih || item.createdAt)}</Text>
                      </View>
                      <View style={localStyles.metricRow}>
                        <Metric label="Boy" value={item.boy ? `${item.boy} cm` : '-'} />
                        <Metric label="Kilo" value={item.kilo ? `${item.kilo} kg` : '-'} />
                        <Metric label="Baş" value={item.basCevresi ? `${item.basCevresi} cm` : '-'} />
                      </View>
                      {item.not ? <Text style={localStyles.recordNote}>📝 {item.not}</Text> : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={localStyles.metricBox}>
      <Text style={localStyles.metricLabel}>{label}</Text>
      <Text style={localStyles.metricValue}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  tabRow: { flexDirection: 'row', backgroundColor: THEME.card, borderRadius: 18, padding: 5, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  tabButton: { flex: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  tabButtonActive: { backgroundColor: THEME.primary },
  tabText: { color: THEME.primary, fontWeight: '900' },
  tabTextActive: { color: '#FFF' },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  cardTitle: { color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 8 },
  helpText: { color: THEME.muted, fontWeight: '700', marginBottom: 10 },
  childGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  childButton: { backgroundColor: THEME.bg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: THEME.border, marginRight: 8, marginBottom: 8 },
  childButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  childText: { color: THEME.text, fontWeight: '800' },
  childTextActive: { color: '#FFF' },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#FFF', fontWeight: '900' },
  lastRecordBox: { backgroundColor: THEME.primarySoft, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  lastRecordTitle: { color: THEME.primary, fontWeight: '900', marginBottom: 4 },
  lastRecordText: { color: THEME.text, fontWeight: '700', lineHeight: 18 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyIcon: { fontSize: 30 },
  recordCard: { backgroundColor: THEME.bg, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  recordTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recordName: { flex: 1, color: THEME.text, fontWeight: '900', fontSize: 15 },
  recordDate: { color: THEME.muted, fontWeight: '800', fontSize: 12 },
  metricRow: { flexDirection: 'row', gap: 8 },
  metricBox: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: THEME.border },
  metricLabel: { color: THEME.muted, fontWeight: '800', fontSize: 11, marginBottom: 4 },
  metricValue: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  recordNote: { color: THEME.text, fontWeight: '700', marginTop: 9, lineHeight: 18 },
});
