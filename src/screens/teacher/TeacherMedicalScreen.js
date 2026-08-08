// ============================================================
// YUMURCAK — TeacherMedicalScreen.js
// FAZ 8.1: "Medikal" artık tek giriş noktası. Üstte çekmeceli (chip) çocuk
// seçici var; seçilen çocuk için 2 sekme gösteriliyor:
//   1) Alerjiler  — alerji kutuları (+ ile çoğalır), genel ilaç/not bilgisi
//   2) İlaç Takip — o çocuğa ait ilaç takip formları (eski ayrı ekranın
//      yerini burada aldı; formu oluşturma/detay için hâlâ
//      TeacherMedicationFormEdit / TeacherMedicationFormDetail kullanılıyor)
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { ref, update, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import AllergyBoxEditor from '../../components/AllergyBoxEditor';
import SegmentedTabs from '../../components/SegmentedTabs';
import { getMedicineIcon } from '../../utils/medicineIcon';

function splitItems(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUpdatedLabel(value) {
  if (!value) return 'Henüz güncellenmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Henüz güncellenmedi';
  return date.toLocaleString('tr-TR');
}

function formatDateTr(dateKey) {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return dateKey || '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function TeacherMedicalScreen() {
  const navigation = useNavigation();
  const { kullanici, teacherId, loading, classChildren, medicalMap, currentClass, kresId } = useTeacherData();

  const [selectedChildId, setSelectedChildId] = useState(null);
  const [activeTab, setActiveTab] = useState('alerjiler');
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Bilgiler güncellendi');

  const [medicationForms, setMedicationForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);

  useEffect(() => {
    if (!selectedChildId && classChildren.length > 0) {
      setSelectedChildId(classChildren[0].id);
    }
  }, [classChildren, selectedChildId]);

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

  useEffect(() => {
    if (!kresId) {
      setLoadingForms(false);
      return undefined;
    }
    const q = query(ref(database, 'ilacTakipFormlari'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, value]) => ({ id, ...value }))
        .filter((item) => item.aktif !== false)
        .sort((a, b) => String(b.baslangicTarihi || '').localeCompare(String(a.baslangicTarihi || '')));
      setMedicationForms(list);
      setLoadingForms(false);
    }, () => setLoadingForms(false));
    return () => unsub();
  }, [kresId]);

  const teacherName = `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Öğretmen';

  const selectedChild = classChildren.find((c) => c.id === selectedChildId) || null;
  const draft = drafts[selectedChildId] || { alerjiler: '', ilaclar: '', notlar: '', ogretmenNotu: '' };
  const info = medicalMap[selectedChildId] || {};
  const allergyItems = splitItems(draft.alerjiler);
  const medicineItems = splitItems(draft.ilaclar);
  const hasAllergy = allergyItems.length > 0;
  const childForms = useMemo(
    () => medicationForms.filter((f) => f.cocukId === selectedChildId),
    [medicationForms, selectedChildId]
  );

  const setDraftValue = (key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [selectedChildId]: {
        ...(prev[selectedChildId] || {}),
        [key]: value,
      },
    }));
  };

  const saveInfo = async () => {
    if (!selectedChild?.id) return;
    setSaving(true);
    try {
      await update(ref(database, `medikalBilgiler/${selectedChild.id}`), {
        kresId: selectedChild.kresId || kresId || '',
        cocukId: selectedChild.id,
        sinifId: selectedChild.sinifId || currentClass?.id || '',
        alerjiler: draft.alerjiler || '',
        ilaclar: draft.ilaclar || '',
        notlar: draft.notlar || '',
        ogretmenNotu: draft.ogretmenNotu || '',
        guncelleyenOgretmenId: teacherId || '',
        guncelleyenOgretmenAdi: teacherName,
        updatedAt: Date.now(),
      });

      setSuccessMessage(`${getChildName(selectedChild)} için bilgiler güncellendi`);
      setSuccessToast(true);
    } catch (error) {
      console.error('Medikal bilgi kaydetme hatası:', error);
      Alert.alert('Hata', 'Bilgiler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Medikal bilgiler hazırlanıyor..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={successMessage} onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title="Medikal" subtitle="Alerji, ilaç ve ilaç takip formları" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {classChildren.length === 0 ? (
          <EmptyState icon="🩺" title="Çocuk yok" desc="Sınıfa çocuk bağlanınca medikal bilgiler görünür." />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childRow}
              style={styles.childRowWrap}
            >
              {classChildren.map((child) => {
                const active = child.id === selectedChildId;
                const childHasAllergy = splitItems((medicalMap[child.id] || {}).alerjiler).length > 0;
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.childChip, active && styles.childChipActive]}
                    onPress={() => setSelectedChildId(child.id)}
                    activeOpacity={0.85}
                  >
                    {childHasAllergy ? <Text style={styles.childChipDot}>⚠️</Text> : null}
                    <Text style={[styles.childChipText, active && styles.childChipTextActive]}>{getChildName(child)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.heroCard}>
                <View style={styles.heroIconBox}><Text style={styles.heroIcon}>🩺</Text></View>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.name} numberOfLines={1}>{selectedChild ? getChildName(selectedChild) : ''}</Text>
                  <Text style={styles.subText} numberOfLines={1}>{currentClass?.ad || selectedChild?.sinifAdi || 'Sınıf bilgisi yok'}</Text>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.heroBadge, hasAllergy ? styles.alertBadge : styles.safeBadge]}>{hasAllergy ? '⚠️ Alerji Var' : '✅ Alerji Yok'}</Text>
                    <Text style={[styles.heroBadge, styles.safeBadge]}>✅ Güncel</Text>
                  </View>
                </View>
              </View>

              <SegmentedTabs
                accentColor={THEME.primary}
                activeKey={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { key: 'alerjiler', icon: '⚠️', label: 'Alerjiler' },
                  { key: 'surekliIlaclar', icon: '💊', label: 'Sürekli İlaçlar', badge: medicineItems.length || null },
                  { key: 'ilacTakip', icon: '📋', label: 'İlaç Takip', badge: childForms.length || null },
                ]}
              />

              {activeTab === 'alerjiler' ? (
                <>
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIconBox, styles.redIconBox]}><Text style={styles.sectionIcon}>⚠️</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Alerjiler</Text>
                        <Text style={styles.sectionSubtitle}>Her alerji kendi kutusuna yazılır</Text>
                      </View>
                    </View>
                    <View style={styles.sectionBody}>
                      <AllergyBoxEditor
                        value={draft.alerjiler}
                        onChange={(text) => setDraftValue('alerjiler', text)}
                        accentColor="#D92929"
                      />
                    </View>
                  </View>

                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIconBox, styles.purpleIconBox]}><Text style={styles.sectionIcon}>📝</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Genel Notlar</Text>
                        <Text style={styles.sectionSubtitle}>Veli ve yönetici için özel notlar</Text>
                      </View>
                    </View>
                    <View style={styles.sectionBody}>
                      <TextInput
                        style={styles.input}
                        value={draft.notlar}
                        onChangeText={(text) => setDraftValue('notlar', text)}
                        placeholder="Veli ve yönetici için özel notlar..."
                        placeholderTextColor={THEME.muted}
                        multiline
                      />
                    </View>
                  </View>

                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIconBox, styles.yellowIconBox]}><Text style={styles.sectionIcon}>🙂</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Öğretmen Gözlem Notu</Text>
                        <Text style={styles.sectionSubtitle}>Bugünkü gözlem veya hatırlatma notu</Text>
                      </View>
                    </View>
                    <View style={styles.sectionBody}>
                      <View style={styles.teacherNoteBox}>
                        <TextInput
                          style={styles.teacherNoteInput}
                          value={draft.ogretmenNotu}
                          onChangeText={(text) => setDraftValue('ogretmenNotu', text)}
                          placeholder="Bugünkü gözleminizi veya hatırlatmanızı yazın..."
                          placeholderTextColor="#9B7A29"
                          multiline
                        />
                        <Text style={styles.pencilIcon}>✎</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.updatedText}>🕒 Son güncelleme: {getUpdatedLabel(info.updatedAt)}</Text>
                  <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={saveInfo} disabled={saving} activeOpacity={0.85}>
                    <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : '▣ Bilgileri Kaydet'}</Text>
                  </TouchableOpacity>
                </>
              ) : activeTab === 'surekliIlaclar' ? (
                <>
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIconBox, styles.blueIconBox]}><Text style={styles.sectionIcon}>💊</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Sürekli İlaçlar</Text>
                        <Text style={styles.sectionSubtitle}>Tarihsiz, düzenli kullanılan ilaçlar (kür dışı)</Text>
                      </View>
                    </View>
                    <View style={styles.sectionBody}>
                      {medicineItems.length > 0 ? (
                        <View style={styles.medicineList}>{medicineItems.map((item, medIndex) => <View key={`${item}-${medIndex}`} style={styles.medicineRow}><Text style={styles.medicineIcon}>{getMedicineIcon(item)}</Text><View style={{ flex: 1 }}><Text style={styles.medicineName}>{item}</Text><Text style={styles.medicineMeta}>Kayıtlı kullanım bilgisi</Text></View></View>)}</View>
                      ) : (
                        <Text style={styles.emptyText}>Kayıtlı ilaç bilgisi yok.</Text>
                      )}
                      <TextInput
                        style={styles.input}
                        value={draft.ilaclar}
                        onChangeText={(text) => setDraftValue('ilaclar', text)}
                        placeholder="Örn: Şurup - Sabah/Akşam 5 ml"
                        placeholderTextColor={THEME.muted}
                        multiline
                      />
                    </View>
                  </View>

                  <Text style={styles.updatedText}>🕒 Son güncelleme: {getUpdatedLabel(info.updatedAt)}</Text>
                  <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={saveInfo} disabled={saving} activeOpacity={0.85}>
                    <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : '▣ Bilgileri Kaydet'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.newFormButton}
                    onPress={() => navigation.navigate('TeacherMedicationFormEdit', { cocukId: selectedChildId })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.newFormButtonText}>+ Yeni İlaç Takip Formu</Text>
                  </TouchableOpacity>

                  {loadingForms ? (
                    <ActivityIndicator color={THEME.primary} style={{ marginTop: 20 }} />
                  ) : childForms.length === 0 ? (
                    <EmptyState icon="💊" title="Aktif ilaç takip formu yok" desc="Bu çocuk için ilaç kürü başladığında buradan form oluşturabilirsin." />
                  ) : (
                    childForms.map((form) => (
                      <TouchableOpacity
                        key={form.id}
                        style={styles.formCard}
                        onPress={() => navigation.navigate('TeacherMedicationFormDetail', { formId: form.id })}
                        activeOpacity={0.85}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formCardTitle}>{getMedicineIcon(form.ilacAdi)} {form.ilacAdi}</Text>
                          <Text style={styles.formCardMeta}>{formatDateTr(form.baslangicTarihi)} - {formatDateTr(form.bitisTarihi)}</Text>
                          {form.hatirlaticiSaat ? <Text style={styles.formCardMeta}>⏰ Hatırlatma: {form.hatirlaticiSaat}</Text> : null}
                          <Text style={styles.formCardApproval}>{form.veliOnayi ? '✅ Veli onayı alındı' : '⏳ Veli onayı bekleniyor'}</Text>
                        </View>
                        <Text style={styles.formCardArrow}>›</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  childRowWrap: { flexGrow: 0, marginTop: 4 },
  childRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.card },
  childChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  childChipDot: { fontSize: 11 },
  childChipText: { fontWeight: '800', fontSize: 13, color: THEME.text },
  childChipTextActive: { color: '#fff' },
  content: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  heroCard: { backgroundColor: THEME.card, borderRadius: 28, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  heroIconBox: { width: 86, height: 86, borderRadius: 26, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  heroIcon: { fontSize: 44 },
  heroTextWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 24, fontWeight: '900', color: THEME.primary },
  subText: { color: THEME.muted, fontWeight: '800', marginTop: 3, fontSize: 15 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  heroBadge: { borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 7, fontWeight: '900', fontSize: 12 },
  alertBadge: { backgroundColor: '#FFE8E8', color: '#E44040' },
  safeBadge: { backgroundColor: '#E8F8EE', color: '#188A42' },
  sectionCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 9, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionIconBox: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  redIconBox: { backgroundColor: '#FFEDED' },
  blueIconBox: { backgroundColor: '#EAF6FF' },
  purpleIconBox: { backgroundColor: '#F1E8FF' },
  yellowIconBox: { backgroundColor: '#FFF5D9' },
  sectionIcon: { fontSize: 30 },
  sectionTitle: { color: THEME.text, fontWeight: '900', fontSize: 19 },
  sectionSubtitle: { color: THEME.muted, fontWeight: '700', marginTop: 3 },
  sectionBody: { marginTop: 12 },
  emptyText: { color: THEME.muted, fontWeight: '800' },
  medicineList: { gap: 8, marginBottom: 10 },
  medicineRow: { backgroundColor: '#F5FBFF', borderWidth: 1, borderColor: '#CDEBFF', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center' },
  medicineIcon: { fontSize: 26, marginRight: 10 },
  medicineName: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  medicineMeta: { color: '#31527D', fontWeight: '700', fontSize: 11, marginTop: 3 },
  teacherNoteBox: { backgroundColor: '#FFF9EA', borderWidth: 1, borderColor: '#FFE0A3', borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'flex-start' },
  teacherNoteInput: { flex: 1, minHeight: 58, color: THEME.text, textAlignVertical: 'top', fontWeight: '700', fontSize: 14, paddingVertical: 11 },
  pencilIcon: { color: '#F0A400', fontSize: 22, paddingTop: 12, marginLeft: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border, borderRadius: 14, minHeight: 70, padding: 12, color: THEME.text, textAlignVertical: 'top', fontSize: 14, fontWeight: '700' },
  updatedText: { color: THEME.muted, fontSize: 13, fontWeight: '800', marginTop: 8, marginBottom: 12, textAlign: 'center' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 15, alignItems: 'center', shadowColor: THEME.primary, shadowOpacity: 0.22, shadowRadius: 10, elevation: 3 },
  saveButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  disabledButton: { opacity: 0.6 },
  newFormButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  newFormButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  formCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 10 },
  formCardTitle: { fontSize: 14, fontWeight: '900', color: THEME.text },
  formCardMeta: { fontSize: 12, fontWeight: '700', color: THEME.muted, marginTop: 3 },
  formCardApproval: { fontSize: 11, fontWeight: '700', color: THEME.primary, marginTop: 3 },
  formCardArrow: { fontSize: 22, color: THEME.muted, fontWeight: '900', marginLeft: 8 },
});
