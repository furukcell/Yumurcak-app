// ============================================================
// YUMURCAK — TeacherMedicalScreen.js
// Öğretmen medikal bilgileri kartlı görür ve alanları açarak günceller
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

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

export default function TeacherMedicalScreen() {
  const navigation = useNavigation();
  const { kullanici, teacherId, loading, classChildren, medicalMap, currentClass, kresId } = useTeacherData();

  const [drafts, setDrafts] = useState({});
  const [savingChildId, setSavingChildId] = useState(null);
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Bilgiler güncellendi');
  const [openMap, setOpenMap] = useState({});

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

  const toggleSection = (childId, sectionKey) => {
    const mapKey = `${childId}_${sectionKey}`;
    setOpenMap((prev) => ({ ...prev, [mapKey]: !prev[mapKey] }));
  };

  const isOpen = (childId, sectionKey) => !!openMap[`${childId}_${sectionKey}`];

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

      setSuccessMessage(`${getChildName(child)} için bilgiler güncellendi`);
      setSuccessToast(true);
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
      <AppSuccessToast visible={successToast} message={successMessage} onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title="Medikal Bilgiler" subtitle="Alerji, ilaç ve öğretmen gözlem notları" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classChildren.length === 0 ? (
          <EmptyState icon="🩺" title="Çocuk yok" desc="Sınıfa çocuk bağlanınca medikal bilgiler görünür." />
        ) : (
          classChildren.map((child, index) => {
            const draft = drafts[child.id] || {};
            const info = medicalMap[child.id] || {};
            const isSaving = savingChildId === child.id;
            const allergyItems = splitItems(draft.alerjiler);
            const medicineItems = splitItems(draft.ilaclar);
            const hasAllergy = allergyItems.length > 0;
            const compact = index > 0 && !isOpen(child.id, 'main');

            if (compact) {
              return (
                <TouchableOpacity key={child.id} style={styles.compactChildCard} onPress={() => toggleSection(child.id, 'main')} activeOpacity={0.85}>
                  <View style={styles.compactAvatar}><Text style={styles.avatarText}>🩺</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compactName}>{getChildName(child)}</Text>
                    <Text style={styles.compactClass}>{currentClass?.ad || child.sinifAdi || 'Sınıf bilgisi yok'}</Text>
                  </View>
                  <Text style={[styles.compactBadge, hasAllergy ? styles.warningMiniBadge : styles.safeMiniBadge]}>{hasAllergy ? 'Alerji Var' : 'Alerji Yok'}</Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            }

            return (
              <View key={child.id} style={styles.childCard}>
                {index > 0 ? (
                  <TouchableOpacity style={styles.closeChildButton} onPress={() => toggleSection(child.id, 'main')} activeOpacity={0.85}>
                    <Text style={styles.closeChildText}>Kartı küçült</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.heroCard}>
                  <View style={styles.heroIconBox}><Text style={styles.heroIcon}>🩺</Text></View>
                  <View style={styles.heroTextWrap}>
                    <Text style={styles.name} numberOfLines={1}>{getChildName(child)}</Text>
                    <Text style={styles.subText} numberOfLines={1}>{currentClass?.ad || child.sinifAdi || 'Sınıf bilgisi yok'}</Text>
                    <View style={styles.badgeRow}>
                      <Text style={[styles.heroBadge, hasAllergy ? styles.alertBadge : styles.safeBadge]}>{hasAllergy ? '⚠️ Alerji Var' : '✅ Alerji Yok'}</Text>
                      <Text style={[styles.heroBadge, styles.safeBadge]}>✅ Güncel</Text>
                    </View>
                  </View>
                </View>

                <InfoSection
                  icon="⚠️"
                  title="Alerjiler"
                  subtitle="Çocuğun bilinen alerjileri"
                  open={isOpen(child.id, 'alerjiler')}
                  onPress={() => toggleSection(child.id, 'alerjiler')}
                  accent="red"
                >
                  {allergyItems.length > 0 ? (
                    <View style={styles.tagWrap}>{allergyItems.map((item, tagIndex) => <Text key={`${item}-${tagIndex}`} style={styles.allergyTag}>{item}</Text>)}</View>
                  ) : (
                    <Text style={styles.emptyText}>Kayıtlı alerji yok.</Text>
                  )}
                  {isOpen(child.id, 'alerjiler') ? (
                    <TextInput
                      style={styles.input}
                      value={draft.alerjiler}
                      onChangeText={(text) => setDraftValue(child.id, 'alerjiler', text)}
                      placeholder="Örn: Yumurta, polen, süt"
                      placeholderTextColor={THEME.muted}
                      multiline
                    />
                  ) : null}
                </InfoSection>

                <InfoSection
                  icon="💊"
                  title="İlaç Bilgisi"
                  subtitle="Veli/yönetici tarafından paylaşılan ilaç bilgileri"
                  open={isOpen(child.id, 'ilaclar')}
                  onPress={() => toggleSection(child.id, 'ilaclar')}
                  accent="blue"
                >
                  {medicineItems.length > 0 ? (
                    <View style={styles.medicineList}>{medicineItems.map((item, medIndex) => <View key={`${item}-${medIndex}`} style={styles.medicineRow}><Text style={styles.medicineIcon}>{medIndex % 2 === 0 ? '🧴' : '💊'}</Text><View style={{ flex: 1 }}><Text style={styles.medicineName}>{item}</Text><Text style={styles.medicineMeta}>Kayıtlı kullanım bilgisi</Text></View></View>)}</View>
                  ) : (
                    <Text style={styles.emptyText}>Kayıtlı ilaç bilgisi yok.</Text>
                  )}
                  {isOpen(child.id, 'ilaclar') ? (
                    <TextInput
                      style={styles.input}
                      value={draft.ilaclar}
                      onChangeText={(text) => setDraftValue(child.id, 'ilaclar', text)}
                      placeholder="Örn: Şurup - Sabah/Akşam 5 ml"
                      placeholderTextColor={THEME.muted}
                      multiline
                    />
                  ) : null}
                </InfoSection>

                <InfoSection
                  icon="📝"
                  title="Genel Notlar"
                  subtitle="Veli ve yönetici için özel notlar"
                  open={isOpen(child.id, 'notlar')}
                  onPress={() => toggleSection(child.id, 'notlar')}
                  accent="purple"
                >
                  <View style={styles.noteBox}><Text style={styles.noteText}>{draft.notlar || 'Genel not eklenmedi.'}</Text></View>
                  {isOpen(child.id, 'notlar') ? (
                    <TextInput
                      style={styles.input}
                      value={draft.notlar}
                      onChangeText={(text) => setDraftValue(child.id, 'notlar', text)}
                      placeholder="Veli ve yönetici için özel notlar..."
                      placeholderTextColor={THEME.muted}
                      multiline
                    />
                  ) : null}
                </InfoSection>

                <InfoSection
                  icon="🙂"
                  title="Öğretmen Gözlem Notu"
                  subtitle="Bugünkü gözlem veya hatırlatma notu"
                  open={isOpen(child.id, 'ogretmenNotu')}
                  onPress={() => toggleSection(child.id, 'ogretmenNotu')}
                  accent="yellow"
                >
                  <View style={styles.teacherNoteBox}>
                    <TextInput
                      style={styles.teacherNoteInput}
                      value={draft.ogretmenNotu}
                      onChangeText={(text) => setDraftValue(child.id, 'ogretmenNotu', text)}
                      placeholder="Bugünkü gözleminizi veya hatırlatmanızı yazın..."
                      placeholderTextColor="#9B7A29"
                      multiline
                    />
                    <Text style={styles.pencilIcon}>✎</Text>
                  </View>
                </InfoSection>

                <Text style={styles.updatedText}>🕒 Son güncelleme: {getUpdatedLabel(info.updatedAt)}</Text>
                <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={() => saveInfo(child)} disabled={isSaving} activeOpacity={0.85}>
                  <Text style={styles.saveButtonText}>{isSaving ? 'Kaydediliyor...' : '▣ Bilgileri Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoSection({ icon, title, subtitle, open, onPress, accent, children }) {
  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.sectionIconBox, styles[`${accent}IconBox`]]}><Text style={styles.sectionIcon}>{icon}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.chevron}>{open ? '⌄' : '›'}</Text>
      </TouchableOpacity>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  childCard: { marginBottom: 18 },
  closeChildButton: { alignSelf: 'flex-end', marginBottom: 8, backgroundColor: THEME.primarySoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  closeChildText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  heroCard: { backgroundColor: THEME.card, borderRadius: 28, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  heroIconBox: { width: 86, height: 86, borderRadius: 26, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  heroIcon: { fontSize: 44 },
  heroTextWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 28, fontWeight: '900', color: THEME.primary },
  subText: { color: THEME.muted, fontWeight: '800', marginTop: 3, fontSize: 16 },
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
  chevron: { color: THEME.muted, fontWeight: '900', fontSize: 28, marginLeft: 8 },
  sectionBody: { marginTop: 12 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyTag: { backgroundColor: '#FFF0F0', color: '#D92929', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8, fontWeight: '900', borderWidth: 1, borderColor: '#FFD2D2' },
  emptyText: { color: THEME.muted, fontWeight: '800' },
  medicineList: { gap: 8 },
  medicineRow: { backgroundColor: '#F5FBFF', borderWidth: 1, borderColor: '#CDEBFF', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center' },
  medicineIcon: { fontSize: 26, marginRight: 10 },
  medicineName: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  medicineMeta: { color: '#31527D', fontWeight: '700', fontSize: 11, marginTop: 3 },
  noteBox: { backgroundColor: '#FBF7FF', borderWidth: 1, borderColor: '#DDC8FF', borderRadius: 15, padding: 12 },
  noteText: { color: '#3D2D62', fontWeight: '700', lineHeight: 20 },
  teacherNoteBox: { backgroundColor: '#FFF9EA', borderWidth: 1, borderColor: '#FFE0A3', borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'flex-start' },
  teacherNoteInput: { flex: 1, minHeight: 58, color: THEME.text, textAlignVertical: 'top', fontWeight: '700', fontSize: 14, paddingVertical: 11 },
  pencilIcon: { color: '#F0A400', fontSize: 22, paddingTop: 12, marginLeft: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border, borderRadius: 14, minHeight: 70, padding: 12, color: THEME.text, textAlignVertical: 'top', fontSize: 14, fontWeight: '700', marginTop: 10 },
  updatedText: { color: THEME.muted, fontSize: 13, fontWeight: '800', marginTop: 8, marginBottom: 12, textAlign: 'center' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 15, alignItems: 'center', shadowColor: THEME.primary, shadowOpacity: 0.22, shadowRadius: 10, elevation: 3 },
  saveButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  disabledButton: { opacity: 0.6 },
  compactChildCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  compactAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 24 },
  compactName: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  compactClass: { color: THEME.muted, fontWeight: '700', marginTop: 2 },
  compactBadge: { borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontWeight: '900', fontSize: 11 },
  warningMiniBadge: { backgroundColor: '#FFE8E8', color: '#D92929' },
  safeMiniBadge: { backgroundColor: '#E8F8EE', color: '#188A42' },
});