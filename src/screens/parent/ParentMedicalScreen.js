import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, LoadingScreen, useParentBase, THEME } from './parentShared';
import AppSuccessToast from '../../components/AppSuccessToast';

function splitItems(value) {
  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatUpdatedAt(value) {
  if (!value) return 'Henüz güncellenmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Henüz güncellenmedi';
  return date.toLocaleDateString('tr-TR');
}

function getChildName(child) {
  return child?.adSoyad || child?.ad || child?.isim || child?.name || 'Çocuk';
}

function getClassName(child) {
  return child?.sinifAdi || child?.sinifAd || child?.className || 'Sınıf bilgisi';
}

export default function ParentMedicalScreen({ navigation }) {
  const { loading, selectedChild, kresId, parentId } = useParentBase();
  const [medical, setMedical] = useState(null);
  const [draft, setDraft] = useState({ alerjiler: '', ilaclar: '', notlar: '' });
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!selectedChild?.id) return undefined;
    const r = ref(database, `medikalBilgiler/${selectedChild.id}`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val();
      setMedical(data);
      setDraft({
        alerjiler: data?.alerjiler || '',
        ilaclar: data?.ilaclar || '',
        notlar: data?.notlar || '',
      });
    });
    return () => unsub();
  }, [selectedChild?.id]);

  const allergyTags = useMemo(() => splitItems(draft.alerjiler), [draft.alerjiler]);
  const medicineItems = useMemo(() => splitItems(draft.ilaclar), [draft.ilaclar]);
  const hasAllergy = allergyTags.length > 0;

  const saveMedical = async () => {
    if (!selectedChild?.id) return;
    setSaving(true);
    try {
      await set(ref(database, `medikalBilgiler/${selectedChild.id}`), {
        kresId: kresId || '',
        cocukId: selectedChild.id,
        alerjiler: draft.alerjiler || '',
        ilaclar: draft.ilaclar || '',
        notlar: draft.notlar || '',
        guncelleyenVeliId: parentId || '',
        updatedAt: Date.now(),
      });
      setSuccessToast(true);
    } catch (error) {
      Alert.alert('Hata', 'Medikal bilgiler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen text="Medikal bilgiler hazırlanıyor..." />;

  return (
    <>
      <AppSuccessToast visible={successToast} message="Medikal bilgiler güncellendi" onHide={() => setSuccessToast(false)} />
      <ScreenShell title="Medikal Takip" emoji="🩺" navigation={navigation}>
        {!selectedChild ? (
          <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Medikal bilgi için çocuk bağlantısı gerekir." />
        ) : (
          <>
            <View style={local.profileCard}>
              <View style={local.avatarCircle}><Text style={local.avatarEmoji}>👧</Text></View>
              <View style={local.profileTextWrap}>
                <Text style={local.childName}>{getChildName(selectedChild)}</Text>
                <Text style={local.className}>{getClassName(selectedChild)} ⭐</Text>
                <Text style={local.updatedText}>📅 Son güncelleme: {formatUpdatedAt(medical?.updatedAt)}</Text>
              </View>
              <View style={[local.statusPill, hasAllergy ? local.warnPill : local.okPill]}><Text style={[local.statusPillText, hasAllergy ? local.warnText : local.okText]}>{hasAllergy ? 'Dikkat' : 'Güncel'}</Text></View>
            </View>

            <MedicalCard icon="⚠️" title="Alerjiler" badge={hasAllergy ? 'Dikkat' : 'Yok'} warning={hasAllergy}>
              {hasAllergy ? <View style={local.tagWrap}>{allergyTags.map((item, index) => <Text key={`${item}-${index}`} style={local.allergyTag}>{item}</Text>)}</View> : <Text style={local.emptyText}>Kayıtlı bilgi yok.</Text>}
              <TextInput style={local.editInput} value={draft.alerjiler} onChangeText={(text) => setDraft((p) => ({ ...p, alerjiler: text }))} placeholder="Örn: Fıstık, polen, laktoz" placeholderTextColor="#A2A5B6" multiline />
            </MedicalCard>

            <MedicalCard icon="💊" title="Kullandığı İlaçlar">
              {medicineItems.length > 0 ? <View style={local.medicineList}>{medicineItems.map((item, index) => <View key={`${item}-${index}`} style={local.medicineRow}><Text style={local.medicineIcon}>{index % 2 === 0 ? '🧴' : '💊'}</Text><View style={{ flex: 1 }}><Text style={local.medicineName}>{item}</Text><Text style={local.medicineMeta}>Kayıtlı kullanım bilgisi</Text></View><Text style={local.medicineBadge}>Kayıtlı</Text></View>)}</View> : <Text style={local.emptyText}>Kayıtlı bilgi yok.</Text>}
              <TextInput style={local.editInput} value={draft.ilaclar} onChangeText={(text) => setDraft((p) => ({ ...p, ilaclar: text }))} placeholder="Örn: Şurup - Sabah/Akşam" placeholderTextColor="#A2A5B6" multiline />
            </MedicalCard>

            <MedicalCard icon="📎" title="Notlar">
              <View style={local.noteBox}><TextInput style={local.noteInput} value={draft.notlar} onChangeText={(text) => setDraft((p) => ({ ...p, notlar: text }))} placeholder="Öğretmen ve yönetici için özel notlar..." placeholderTextColor="#7D7199" multiline /></View>
            </MedicalCard>

            <TouchableOpacity style={[local.saveButton, saving && { opacity: 0.65 }]} onPress={saveMedical} disabled={saving} activeOpacity={0.85}>
              <Text style={local.saveButtonText}>{saving ? 'Kaydediliyor...' : '💾 Kaydet'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScreenShell>
    </>
  );
}

function MedicalCard({ icon, title, badge, warning, children }) {
  return <View style={local.medicalCard}><View style={local.cardHeader}><View style={local.cardIconCircle}><Text style={local.cardIcon}>{icon}</Text></View><Text style={local.sectionTitle}>{title}</Text>{badge ? <Text style={[local.cardBadge, warning ? local.cardBadgeWarning : local.cardBadgeOk]}>{badge}</Text> : null}</View>{children}</View>;
}

const local = StyleSheet.create({
  profileCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#CBE9FA', borderRadius: 26, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DDF5FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarEmoji: { fontSize: 38 },
  profileTextWrap: { flex: 1, minWidth: 0 },
  childName: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  className: { color: '#31527D', fontSize: 13, fontWeight: '800', marginTop: 3 },
  updatedText: { color: '#31527D', fontSize: 11, fontWeight: '800', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#CDE8F8' },
  statusPill: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, marginLeft: 8 },
  warnPill: { backgroundColor: '#FFF1EC', borderColor: '#FFC9BB' },
  okPill: { backgroundColor: '#EEFBEF', borderColor: '#CDEFD3' },
  statusPillText: { fontWeight: '900', fontSize: 11 },
  warnText: { color: '#E9462F' },
  okText: { color: '#17843B' },
  medicalCard: { backgroundColor: THEME.card, borderRadius: 25, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 11, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardIcon: { fontSize: 28 },
  sectionTitle: { flex: 1, color: THEME.text, fontSize: 20, fontWeight: '900' },
  cardBadge: { borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7, fontWeight: '900', fontSize: 12 },
  cardBadgeWarning: { backgroundColor: '#FFF2EA', color: '#EA5A2A', borderWidth: 1, borderColor: '#FFD0BB' },
  cardBadgeOk: { backgroundColor: '#EEFBEF', color: '#17843B', borderWidth: 1, borderColor: '#CDEFD3' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  allergyTag: { backgroundColor: '#FFF3F0', color: '#EA4D32', borderWidth: 1, borderColor: '#FFC8BC', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', fontWeight: '900' },
  medicineList: { gap: 9 },
  medicineRow: { backgroundColor: '#F5FBFF', borderWidth: 1, borderColor: '#CDEBFF', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center' },
  medicineIcon: { fontSize: 27, marginRight: 10 },
  medicineName: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  medicineMeta: { color: '#31527D', fontWeight: '700', fontSize: 11, marginTop: 4 },
  medicineBadge: { color: '#1976D2', borderWidth: 1, borderColor: '#A9D7FF', backgroundColor: '#F7FCFF', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, fontWeight: '900', fontSize: 10, marginLeft: 8 },
  noteBox: { backgroundColor: '#FBF7FF', borderWidth: 1, borderColor: '#DCC7FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  noteInput: { minHeight: 86, color: '#4B326D', fontWeight: '700', fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  editInput: { marginTop: 10, backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: THEME.border, borderRadius: 14, minHeight: 78, padding: 11, color: THEME.text, textAlignVertical: 'top', fontSize: 13, fontWeight: '700' },
  emptyText: { color: THEME.muted, fontWeight: '800', marginBottom: 10 },
  saveButton: { backgroundColor: '#5D5FEF', borderRadius: 20, paddingVertical: 17, alignItems: 'center', marginTop: 2, marginBottom: 10, shadowColor: '#5D5FEF', shadowOpacity: 0.25, shadowRadius: 12, elevation: 3 },
  saveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 19 },
});