import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ref, onValue, set, update, push, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, LoadingScreen, useParentBase, THEME } from './parentShared';
import AppSuccessToast from '../../components/AppSuccessToast';
import { createNotification } from '../../services/notificationCenter';
import { normalizeChildBirthDate } from '../../utils/childDates';
import { normalizeTimeInput } from '../../utils/timeFormat';
import AllergyBoxEditor from '../../components/AllergyBoxEditor';
import SegmentedTabs from '../../components/SegmentedTabs';
import { getMedicineIcon } from '../../utils/medicineIcon';

function splitItems(value) {
  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatUpdatedAt(value, t) {
  if (!value) return t('parent.medical.updatedNever');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('parent.medical.updatedNever');
  return date.toLocaleDateString('tr-TR');
}

function formatDateTr(dateKey) {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return dateKey || '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getChildName(child) {
  return child?.adSoyad || child?.ad || child?.isim || child?.name || 'Çocuk';
}

function getClassName(child) {
  return child?.sinifAdi || child?.sinifAd || child?.className || 'Sınıf bilgisi';
}

export default function ParentMedicalScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresId, parentId } = useParentBase();
  const [medical, setMedical] = useState(null);
  const [draft, setDraft] = useState({ alerjiler: '', ilaclar: '', notlar: '' });
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [activeTab, setActiveTab] = useState('alerjiler');

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

  const [allMedicationForms, setAllMedicationForms] = useState([]);
  const [editingFormId, setEditingFormId] = useState(null); // null | 'new' | formId
  const [formDraft, setFormDraft] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    if (!kresId) {
      setAllMedicationForms([]);
      return undefined;
    }
    const q = query(ref(database, 'ilacTakipFormlari'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, value]) => ({ id, ...value }))
        .filter((item) => item.cocukId === selectedChild?.id)
        .sort((a, b) => String(b.baslangicTarihi || '').localeCompare(String(a.baslangicTarihi || '')));
      setAllMedicationForms(list);
    }, () => setAllMedicationForms([]));
    return () => unsub();
  }, [kresId, selectedChild?.id]);

  const medicationForms = useMemo(
    () => allMedicationForms.filter((item) => item.aktif !== false),
    [allMedicationForms]
  );
  const pendingForms = useMemo(
    () => allMedicationForms.filter((item) => item.aktif === false && item.onayDurumu === 'bekliyor'),
    [allMedicationForms]
  );

  async function approveMedicationForm(form) {
    setApprovingId(form.id);
    try {
      await update(ref(database, `ilacTakipFormlari/${form.id}`), {
        aktif: true,
        veliOnayi: true,
        onayDurumu: 'onaylandi',
        onaylayanVeliId: parentId || '',
        onaylanmaTarihi: Date.now(),
        updatedAt: Date.now(),
      });
      if (form.olusturanId) {
        createNotification({
          kresId,
          hedefUserIds: [form.olusturanId],
          baslik: '✅ Veli ilaç takip formunu onayladı',
          mesaj: `${getChildName(selectedChild)} için "${form.ilacAdi || 'İlaç'}" ilaç takip formu onaylandı.`,
          tip: 'ilac_takip',
          routeName: 'TeacherMedicationFormDetail',
          routeParams: { formId: form.id },
          createdBy: parentId || '',
        }).catch((error) => console.log('Öğretmen bildirimi gönderilemedi:', error));
      }
    } catch (error) {
      Alert.alert(t('parent.medical.errorTitle'), t('parent.medical.alertSaveErrorForm'));
    } finally {
      setApprovingId(null);
    }
  }

  async function rejectMedicationForm(form) {
    setApprovingId(form.id);
    try {
      await update(ref(database, `ilacTakipFormlari/${form.id}`), {
        onayDurumu: 'reddedildi',
        reddedilmeTarihi: Date.now(),
        updatedAt: Date.now(),
      });
      if (form.olusturanId) {
        createNotification({
          kresId,
          hedefUserIds: [form.olusturanId],
          baslik: '❌ Veli ilaç takip formunu reddetti',
          mesaj: `${getChildName(selectedChild)} için "${form.ilacAdi || 'İlaç'}" ilaç takip formu talebi reddedildi.`,
          tip: 'ilac_takip',
          createdBy: parentId || '',
        }).catch((error) => console.log('Öğretmen bildirimi gönderilemedi:', error));
      }
    } catch (error) {
      Alert.alert(t('parent.medical.errorTitle'), t('parent.medical.alertSaveErrorForm'));
    } finally {
      setApprovingId(null);
    }
  }

  function startNewForm() {
    setFormDraft({ ilacAdi: '', doz: '', uygulamaSekli: '', baslangicTarihi: '', bitisTarihi: '', hatirlaticiSaat: '', veliOnayi: true });
    setEditingFormId('new');
  }

  function startEditForm(form) {
    setFormDraft({
      ilacAdi: form.ilacAdi || '',
      doz: form.doz || '',
      uygulamaSekli: form.uygulamaSekli || '',
      baslangicTarihi: form.baslangicTarihi || '',
      bitisTarihi: form.bitisTarihi || '',
      hatirlaticiSaat: form.hatirlaticiSaat || '',
      veliOnayi: form.veliOnayi !== false,
    });
    setEditingFormId(form.id);
  }

  function cancelFormEdit() {
    setEditingFormId(null);
    setFormDraft(null);
  }

  async function saveMedicationForm() {
    if (!selectedChild?.id || !formDraft) return;
    if (!formDraft.ilacAdi.trim() || !formDraft.baslangicTarihi.trim() || !formDraft.bitisTarihi.trim()) {
      Alert.alert(t('parent.medical.alertMissingInfoTitle'), t('parent.medical.alertMissingInfoDesc'));
      return;
    }
    if (formDraft.hatirlaticiSaat?.trim() && !normalizeTimeInput(formDraft.hatirlaticiSaat)) {
      Alert.alert(t('parent.medical.alertInvalidTimeTitle'), t('parent.medical.alertInvalidTimeDesc'));
      return;
    }
    setFormSaving(true);
    try {
      const payload = {
        kresId: kresId || '',
        sinifId: selectedChild?.sinifId || null,
        cocukId: selectedChild.id,
        cocukAdi: getChildName(selectedChild),
        ilacAdi: formDraft.ilacAdi.trim(),
        doz: formDraft.doz.trim(),
        uygulamaSekli: formDraft.uygulamaSekli.trim(),
        baslangicTarihi: normalizeChildBirthDate(formDraft.baslangicTarihi),
        bitisTarihi: normalizeChildBirthDate(formDraft.bitisTarihi),
        hatirlaticiSaat: normalizeTimeInput(formDraft.hatirlaticiSaat) || null,
        veliOnayi: formDraft.veliOnayi,
        aktif: true,
        updatedAt: Date.now(),
        duzenleyenVeliId: parentId || '',
      };

      let isNew = editingFormId === 'new';
      if (isNew) {
        const newRef = push(ref(database, 'ilacTakipFormlari'));
        await update(newRef, { ...payload, kayitlar: {}, createdAt: Date.now() });
      } else {
        await update(ref(database, `ilacTakipFormlari/${editingFormId}`), payload);
      }

      setSuccessToast(true);
      cancelFormEdit();

      const sinifId = selectedChild?.sinifId;
      if (sinifId) {
        createNotification({
          kresId,
          hedefRoller: ['ogretmen'],
          hedefSinifIds: [sinifId],
          baslik: isNew ? '💊 Veli yeni ilaç takip formu ekledi' : '💊 Veli ilaç takip formunu güncelledi',
          mesaj: `${getChildName(selectedChild)} için "${formDraft.ilacAdi.trim()}" ${isNew ? 'formu eklendi' : 'formu güncellendi'}.`,
          tip: 'ilac_takip',
          createdBy: parentId || '',
        }).catch((error) => console.log('Öğretmen bildirimi gönderilemedi:', error));
      }
    } catch (error) {
      Alert.alert(t('parent.medical.errorTitle'), t('parent.medical.alertSaveErrorForm'));
    } finally {
      setFormSaving(false);
    }
  }

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
      Alert.alert(t('parent.medical.errorTitle'), t('parent.medical.alertSaveErrorMedical'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen text={t('parent.medical.loading')} />;

  return (
    <>
      <AppSuccessToast visible={successToast} message={t('parent.medical.successToast')} onHide={() => setSuccessToast(false)} />
      <ScreenShell title={t('parent.medical.title')} emoji="🩺" navigation={navigation}>
        {!selectedChild ? (
          <EmptyState icon="👧" title={t('parent.medical.noChildTitle')} desc={t('parent.medical.noChildDesc')} />
        ) : (
          <>
            <View style={local.profileCard}>
              <View style={local.avatarCircle}><Text style={local.avatarEmoji}>👧</Text></View>
              <View style={local.profileTextWrap}>
                <Text style={local.childName}>{getChildName(selectedChild)}</Text>
                <Text style={local.className}>{getClassName(selectedChild)} ⭐</Text>
                <Text style={local.updatedText}>📅 {t('parent.medical.lastUpdate')}: {formatUpdatedAt(medical?.updatedAt, t)}</Text>
              </View>
              <View style={[local.statusPill, hasAllergy ? local.warnPill : local.okPill]}><Text style={[local.statusPillText, hasAllergy ? local.warnText : local.okText]}>{hasAllergy ? t('parent.medical.statusWarning') : t('parent.medical.statusOk')}</Text></View>
            </View>

            <SegmentedTabs
              accentColor="#5D5FEF"
              activeKey={activeTab}
              onChange={setActiveTab}
              tabs={[
                { key: 'alerjiler', icon: '⚠️', label: t('parent.medical.tabAllergies') },
                { key: 'surekliIlaclar', icon: '💊', label: t('parent.medical.tabContinuousMeds'), badge: medicineItems.length || null },
                { key: 'ilacTakip', icon: '📋', label: t('parent.medical.tabTracking'), badge: (medicationForms.length + pendingForms.length) || null },
              ]}
            />

            {activeTab === 'alerjiler' ? (
              <>
                <MedicalCard icon="⚠️" title={t('parent.medical.allergiesTitle')} badge={hasAllergy ? t('parent.medical.statusWarning') : t('parent.medical.allergiesBadgeNone')} warning={hasAllergy}>
                  <AllergyBoxEditor
                    value={draft.alerjiler}
                    onChange={(text) => setDraft((p) => ({ ...p, alerjiler: text }))}
                    accentColor="#EA4D32"
                    placeholder={t('parent.medical.allergyPlaceholder')}
                    addLabel={t('parent.medical.addAllergy')}
                  />
                </MedicalCard>

                <MedicalCard icon="📎" title={t('parent.medical.notesTitle')}>
                  <View style={local.noteBox}><TextInput style={local.noteInput} value={draft.notlar} onChangeText={(text) => setDraft((p) => ({ ...p, notlar: text }))} placeholder={t('parent.medical.notesPlaceholder')} placeholderTextColor="#7D7199" multiline /></View>
                </MedicalCard>

                {medical?.ogretmenNotu ? (
                  <MedicalCard icon="🙂" title={t('parent.medical.teacherNoteTitle')}>
                    <View style={local.teacherNoteReadonlyBox}>
                      <Text style={local.teacherNoteReadonlyText}>{medical.ogretmenNotu}</Text>
                    </View>
                    <Text style={local.teacherNoteHint}>{t('parent.medical.teacherNoteHint')}</Text>
                  </MedicalCard>
                ) : null}

                <TouchableOpacity style={[local.saveButton, saving && { opacity: 0.65 }]} onPress={saveMedical} disabled={saving} activeOpacity={0.85}>
                  <Text style={local.saveButtonText}>{saving ? t('parent.medical.saving') : t('parent.medical.save')}</Text>
                </TouchableOpacity>
              </>
            ) : activeTab === 'surekliIlaclar' ? (
              <>
                <MedicalCard icon="💊" title={t('parent.medical.continuousMedsTitle')}>
                  {medicineItems.length > 0 ? <View style={local.medicineList}>{medicineItems.map((item, index) => <View key={`${item}-${index}`} style={local.medicineRow}><Text style={local.medicineIcon}>{getMedicineIcon(item)}</Text><View style={{ flex: 1 }}><Text style={local.medicineName}>{item}</Text><Text style={local.medicineMeta}>{t('parent.medical.continuousMedsUsageInfo')}</Text></View><Text style={local.medicineBadge}>{t('parent.medical.continuousMedsRegistered')}</Text></View>)}</View> : <Text style={local.emptyText}>{t('parent.medical.continuousMedsEmpty')}</Text>}
                  <TextInput style={local.editInput} value={draft.ilaclar} onChangeText={(text) => setDraft((p) => ({ ...p, ilaclar: text }))} placeholder={t('parent.medical.continuousMedsPlaceholder')} placeholderTextColor="#A2A5B6" multiline />
                </MedicalCard>

                <TouchableOpacity style={[local.saveButton, saving && { opacity: 0.65 }]} onPress={saveMedical} disabled={saving} activeOpacity={0.85}>
                  <Text style={local.saveButtonText}>{saving ? t('parent.medical.saving') : t('parent.medical.save')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <MedicalCard icon="📋" title={t('parent.medical.trackingTitle')} badge={medicationForms.length > 0 ? `${medicationForms.length}` : null}>
                {pendingForms.length > 0 ? (
                  <View style={{ gap: 10, marginBottom: 14 }}>
                    {pendingForms.map((form) => (
                      <View key={form.id} style={local.pendingRow}>
                        <View style={local.trackHeaderRow}>
                          <Text style={local.medicineName}>{form.ilacAdi || 'İlaç'}</Text>
                          <Text style={[local.trackBadge, local.trackBadgeWait]}>{t('parent.medical.trackingPendingApproval')}</Text>
                        </View>
                        {form.doz ? <Text style={local.medicineMeta}>{t('parent.medical.trackingDose')}: {form.doz}</Text> : null}
                        {form.uygulamaSekli ? <Text style={local.medicineMeta}>{form.uygulamaSekli}</Text> : null}
                        <Text style={local.medicineMeta}>
                          {formatDateTr(form.baslangicTarihi)}{form.bitisTarihi ? ` – ${formatDateTr(form.bitisTarihi)}` : ''}
                        </Text>
                        <View style={[local.formRow, { marginTop: 8 }]}>
                          <TouchableOpacity
                            style={[local.formButton, local.formButtonCancel]}
                            onPress={() => rejectMedicationForm(form)}
                            disabled={approvingId === form.id}
                            activeOpacity={0.85}
                          >
                            <Text style={local.formButtonCancelText}>{t('parent.medical.trackingReject')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[local.formButton, local.formButtonSave, approvingId === form.id && { opacity: 0.65 }]}
                            onPress={() => approveMedicationForm(form)}
                            disabled={approvingId === form.id}
                            activeOpacity={0.85}
                          >
                            <Text style={local.formButtonSaveText}>{approvingId === form.id ? t('parent.medical.trackingApproving') : t('parent.medical.trackingApprove')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {medicationForms.length === 0 && editingFormId !== 'new' && pendingForms.length === 0 ? (
                  <Text style={local.emptyText}>{t('parent.medical.trackingEmpty')}</Text>
                ) : (
                  <View style={local.medicineList}>
                    {medicationForms.map((form) => {
                      if (editingFormId === form.id) {
                        return (
                          <MedicationFormEditor
                            key={form.id}
                            draft={formDraft}
                            setDraft={setFormDraft}
                            saving={formSaving}
                            onSave={saveMedicationForm}
                            onCancel={cancelFormEdit}
                            t={t}
                          />
                        );
                      }
                      const verildiBugun = !!form?.kayitlar?.[todayKey()]?.verildi;
                      return (
                        <View key={form.id} style={local.trackRow}>
                          <View style={local.trackHeaderRow}>
                            <Text style={local.medicineName}>{form.ilacAdi || 'İlaç'}</Text>
                            <Text style={[local.trackBadge, verildiBugun ? local.trackBadgeOk : local.trackBadgeWait]}>
                              {verildiBugun ? t('parent.medical.trackingGivenToday') : t('parent.medical.trackingNotGivenYet')}
                            </Text>
                          </View>
                          {form.doz ? <Text style={local.medicineMeta}>{t('parent.medical.trackingDose')}: {form.doz}</Text> : null}
                          {form.uygulamaSekli ? <Text style={local.medicineMeta}>{form.uygulamaSekli}</Text> : null}
                          {form.hatirlaticiSaat ? <Text style={local.medicineMeta}>{t('parent.medical.trackingReminder')}: {form.hatirlaticiSaat}</Text> : null}
                          <Text style={local.medicineMeta}>
                            {formatDateTr(form.baslangicTarihi)}{form.bitisTarihi ? ` – ${formatDateTr(form.bitisTarihi)}` : ''}
                          </Text>
                          <TouchableOpacity style={local.editFormButton} onPress={() => startEditForm(form)} activeOpacity={0.85}>
                            <Text style={local.editFormButtonText}>{t('parent.medical.trackingEdit')}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {editingFormId === 'new' ? (
                      <MedicationFormEditor
                        draft={formDraft}
                        setDraft={setFormDraft}
                        saving={formSaving}
                        onSave={saveMedicationForm}
                        onCancel={cancelFormEdit}
                        t={t}
                      />
                    ) : null}
                  </View>
                )}

                {editingFormId === null ? (
                  <TouchableOpacity style={local.addFormButton} onPress={startNewForm} activeOpacity={0.85}>
                    <Text style={local.addFormButtonText}>{t('parent.medical.trackingAddNew')}</Text>
                  </TouchableOpacity>
                ) : null}
              </MedicalCard>
            )}
          </>
        )}
      </ScreenShell>
    </>
  );
}

function MedicalCard({ icon, title, badge, warning, children }) {
  return <View style={local.medicalCard}><View style={local.cardHeader}><View style={local.cardIconCircle}><Text style={local.cardIcon}>{icon}</Text></View><Text style={local.sectionTitle}>{title}</Text>{badge ? <Text style={[local.cardBadge, warning ? local.cardBadgeWarning : local.cardBadgeOk]}>{badge}</Text> : null}</View>{children}</View>;
}

function MedicationFormEditor({ draft, setDraft, saving, onSave, onCancel, t }) {
  if (!draft) return null;
  const setField = (field) => (text) => setDraft((prev) => ({ ...prev, [field]: text }));
  return (
    <View style={local.editorBox}>
      <TextInput style={local.formInput} value={draft.ilacAdi} onChangeText={setField('ilacAdi')} placeholder={t('parent.medical.formNamePlaceholder')} placeholderTextColor="#A2A5B6" />
      <TextInput style={local.formInput} value={draft.doz} onChangeText={setField('doz')} placeholder={t('parent.medical.formDosePlaceholder')} placeholderTextColor="#A2A5B6" />
      <TextInput style={local.formInput} value={draft.uygulamaSekli} onChangeText={setField('uygulamaSekli')} placeholder={t('parent.medical.formUsagePlaceholder')} placeholderTextColor="#A2A5B6" />
      <View style={local.formRow}>
        <TextInput style={[local.formInput, { flex: 1 }]} value={draft.baslangicTarihi} onChangeText={setField('baslangicTarihi')} placeholder={t('parent.medical.formStartDatePlaceholder')} placeholderTextColor="#A2A5B6" />
        <TextInput style={[local.formInput, { flex: 1 }]} value={draft.bitisTarihi} onChangeText={setField('bitisTarihi')} placeholder={t('parent.medical.formEndDatePlaceholder')} placeholderTextColor="#A2A5B6" />
      </View>
      <TextInput style={local.formInput} value={draft.hatirlaticiSaat} onChangeText={setField('hatirlaticiSaat')} placeholder={t('parent.medical.formReminderPlaceholder')} placeholderTextColor="#A2A5B6" />
      <View style={local.formRow}>
        <Text style={local.formSwitchLabel}>{t('parent.medical.formParentApproval')}</Text>
        <Switch value={!!draft.veliOnayi} onValueChange={(value) => setDraft((prev) => ({ ...prev, veliOnayi: value }))} />
      </View>
      <View style={local.formRow}>
        <TouchableOpacity style={[local.formButton, local.formButtonCancel]} onPress={onCancel} disabled={saving} activeOpacity={0.85}>
          <Text style={local.formButtonCancelText}>{t('parent.medical.formCancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[local.formButton, local.formButtonSave, saving && { opacity: 0.65 }]} onPress={onSave} disabled={saving} activeOpacity={0.85}>
          <Text style={local.formButtonSaveText}>{saving ? t('parent.medical.formSaving') : t('parent.medical.formSave')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
  trackRow: { backgroundColor: '#F5FBFF', borderWidth: 1, borderColor: '#CDEBFF', borderRadius: 16, padding: 10, gap: 4 },
  pendingRow: { backgroundColor: '#FFF8E6', borderWidth: 1, borderColor: '#F3DFA0', borderRadius: 16, padding: 10, gap: 4 },
  trackHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  trackBadge: { fontSize: 10, fontWeight: '900', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1 },
  trackBadgeOk: { color: '#17843B', backgroundColor: '#EEFBEF', borderColor: '#CDEFD3' },
  trackBadgeWait: { color: '#B08600', backgroundColor: '#FFF8E6', borderColor: '#F3DFA0' },
  editFormButton: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#EFF1FF', borderWidth: 1, borderColor: '#D6D9FF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  editFormButtonText: { color: '#5D5FEF', fontWeight: '900', fontSize: 11 },
  addFormButton: { marginTop: 12, backgroundColor: '#F0F6FF', borderStyle: 'dashed', borderWidth: 1, borderColor: '#A9D7FF', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  addFormButtonText: { color: '#1976D2', fontWeight: '900', fontSize: 13 },
  editorBox: { backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: THEME.border, borderRadius: 16, padding: 12, gap: 8 },
  formInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, color: THEME.text, fontSize: 13, fontWeight: '700' },
  formRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  formSwitchLabel: { flex: 1, color: THEME.text, fontWeight: '800', fontSize: 13 },
  formButton: { flex: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  formButtonCancel: { backgroundColor: '#F2F2F5', borderWidth: 1, borderColor: THEME.border },
  formButtonCancelText: { color: THEME.muted, fontWeight: '900', fontSize: 13 },
  formButtonSave: { backgroundColor: '#5D5FEF' },
  formButtonSaveText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  noteBox: { backgroundColor: '#FBF7FF', borderWidth: 1, borderColor: '#DCC7FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  noteInput: { minHeight: 86, color: '#4B326D', fontWeight: '700', fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  teacherNoteReadonlyBox: { backgroundColor: '#FFF9EA', borderWidth: 1, borderColor: '#FFE0A3', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 12 },
  teacherNoteReadonlyText: { color: '#5A4415', fontWeight: '700', fontSize: 14, lineHeight: 21 },
  teacherNoteHint: { color: '#A2A5B6', fontWeight: '700', fontSize: 11, marginTop: 8 },
  editInput: { marginTop: 10, backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: THEME.border, borderRadius: 14, minHeight: 78, padding: 11, color: THEME.text, textAlignVertical: 'top', fontSize: 13, fontWeight: '700' },
  emptyText: { color: THEME.muted, fontWeight: '800', marginBottom: 10 },
  saveButton: { backgroundColor: '#5D5FEF', borderRadius: 20, paddingVertical: 17, alignItems: 'center', marginTop: 2, marginBottom: 10, shadowColor: '#5D5FEF', shadowOpacity: 0.25, shadowRadius: 12, elevation: 3 },
  saveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 19 },
});
