// ============================================================
// YUMURCAK — PollManagementScreen.js
// Yönetici anket oluşturma, aktif/pasif yapma ve sonuç görme
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import AppSuccessToast from '../../components/AppSuccessToast';

const THEME = {
  primary: '#3C3489',
  purple: '#6C3DEB',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  blue: '#1976F3',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toList(data) {
  return Object.entries(safeObject(data)).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function cleanOptions(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean);
  return String(raw || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeOptions(value) {
  if (typeof value === 'string') return cleanOptions(value);
  return asArray(value).map((option, index) => getOptionLabel(option, index)).filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('tr-TR');
  }
  return String(value);
}

function getOptionLabel(option, index) {
  if (typeof option === 'string') return option;
  const obj = safeObject(option);
  return obj.label || obj.text || obj.value || obj.baslik || `Seçenek ${index + 1}`;
}

function getAnswerValue(answer) {
  if (typeof answer === 'string') return answer;
  const obj = safeObject(answer);
  return obj.secenek || obj.cevap || obj.answer || obj.value || obj.label || '';
}

function getOptionPercent(item, label) {
  const cevaplar = Object.values(safeObject(item.cevaplar || item.answers || item.responses));
  const total = cevaplar.length;
  const count = cevaplar.filter((c) => getAnswerValue(c) === label).length;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return { count, percent };
}

function makeOptionId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function PollManagementScreen() {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || kullanici?.kurumId || null;

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [optionInputs, setOptionInputs] = useState([
    { id: makeOptionId(), value: 'Evet' },
    { id: makeOptionId(), value: 'Hayır' },
  ]);

  useEffect(() => {
    setLoading(true);
    const unsub = onValue(
      ref(database, 'anketler'),
      (snap) => {
        const list = toList(snap.val())
          .filter((item) => {
            if (!kresId) return true;
            return !item.kresId || item.kresId === kresId || item.kurumId === kresId;
          })
          .map((item) => ({
            ...item,
            baslik: item.baslik || item.title || 'Anket',
            aciklama: item.aciklama || item.description || '',
            secenekler: normalizeOptions(item.secenekler || item.options || item.choices),
            cevaplar: safeObject(item.cevaplar || item.answers || item.responses),
          }))
          .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0));
        setPolls(list);
        setErrorText('');
        setLoading(false);
      },
      () => {
        setPolls([]);
        setErrorText('Anket kayıtları okunamadı.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [kresId]);

  const toplamAktif = useMemo(() => polls.filter((x) => x.aktif !== false).length, [polls]);
  const toplamCevap = useMemo(() => polls.reduce((sum, p) => sum + Object.keys(safeObject(p.cevaplar)).length, 0), [polls]);

  const updateOption = (id, value) => {
    setOptionInputs((prev) => prev.map((item) => item.id === id ? { ...item, value } : item));
  };

  const addOption = () => {
    setOptionInputs((prev) => [...prev, { id: makeOptionId(), value: '' }]);
  };

  const removeOption = (id) => {
    if (optionInputs.length <= 2) {
      Alert.alert('Uyarı', 'Anket için en az 2 seçenek olmalı.');
      return;
    }
    setOptionInputs((prev) => prev.filter((item) => item.id !== id));
  };

  async function createPoll() {
    const title = baslik.trim();
    const options = cleanOptions(optionInputs.map((item) => item.value));

    if (!title) return Alert.alert('Eksik bilgi', 'Anket başlığı yazmalısın.');
    if (options.length < 2) return Alert.alert('Eksik bilgi', 'En az 2 seçenek olmalı.');

    setSaving(true);
    try {
      await push(ref(database, 'anketler'), {
        kresId,
        kurumId: kresId,
        baslik: title,
        title,
        aciklama: aciklama.trim() || '',
        description: aciklama.trim() || '',
        secenekler: options,
        options,
        aktif: true,
        cevaplar: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setBaslik('');
      setAciklama('');
      setOptionInputs([
        { id: makeOptionId(), value: 'Evet' },
        { id: makeOptionId(), value: 'Hayır' },
      ]);
      setSuccessToast(true);
    } catch (e) {
      Alert.alert('Hata', 'Anket oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    if (!item?.id || busyId) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `anketler/${item.id}`), {
        aktif: item.aktif === false,
        updatedAt: Date.now(),
      });
    } catch (e) {
      Alert.alert('Hata', 'Anket durumu güncellenemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function deletePoll(item) {
    if (!item?.id || busyId) return;
    Alert.alert(
      'Anket silinsin mi?',
      'Bu işlem anketi ve cevaplarını tamamen siler.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await remove(ref(database, `anketler/${item.id}`));
            } catch (e) {
              Alert.alert('Hata', 'Anket silinemedi.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  function renderResults(item) {
    const options = normalizeOptions(item.secenekler || item.options || item.choices);

    if (options.length === 0) {
      return <Text style={styles.resultEmpty}>Bu anket için seçenek eklenmemiş</Text>;
    }

    return options.map((label, index) => {
      const { count, percent } = getOptionPercent(item, label);

      return (
        <View key={`${item.id}-${label}-${index}`} style={styles.resultRow}>
          <Text style={styles.resultLabel}>{label}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.resultPercent}>%{percent}</Text>
          <Text style={styles.resultCountPill}>{count}</Text>
        </View>
      );
    });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={THEME.primary} /><Text style={styles.loadingText}>Anketler yükleniyor...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppSuccessToast
        visible={successToast}
        message="Anket velilere açıldı"
        onHide={() => setSuccessToast(false)}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.summaryRow}>
          <StatCard icon="👥" value={polls.length} label="Toplam Anket" color={THEME.primary} />
          <StatCard icon="✅" value={toplamAktif} label="Aktif" color={THEME.green} />
          <StatCard icon="💬" value={toplamCevap} label="Cevap" color={THEME.orange} />
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formIconCircle}><Text style={styles.formIcon}>🗳️</Text></View>
            <Text style={styles.formTitle}>Yeni Anket Oluştur</Text>
          </View>

          <Text style={styles.label}>Başlık *</Text>
          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={baslik}
              onChangeText={setBaslik}
              placeholder="Örn: Yıl sonu gösterisi hangi gün olsun?"
              placeholderTextColor="#A5A3B8"
            />
            <Text style={styles.inputIcon}>T</Text>
          </View>

          <Text style={styles.label}>Açıklama</Text>
          <View style={[styles.inputShell, styles.textAreaShell]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={aciklama}
              onChangeText={setAciklama}
              placeholder="Velilere kısa açıklama"
              placeholderTextColor="#A5A3B8"
              multiline
            />
            <Text style={styles.inputIcon}>📄</Text>
          </View>

          <View style={styles.optionsHeaderRow}>
            <Text style={styles.labelNoMargin}>Seçenekler *</Text>
            <Text style={styles.helpInline}>Her seçeneği ayrı kutuya yaz.</Text>
            <Text style={styles.helpCircle}>?</Text>
          </View>

          <View style={styles.optionList}>
            {optionInputs.map((item, index) => (
              <View key={item.id} style={styles.optionRow}>
                <View style={styles.optionInputBox}>
                  <Text style={styles.dragHandle}>⠿</Text>
                  <TextInput
                    style={styles.optionInput}
                    value={item.value}
                    onChangeText={(value) => updateOption(item.id, value)}
                    placeholder={`Seçenek ${index + 1}`}
                    placeholderTextColor="#A5A3B8"
                  />
                </View>
                <TouchableOpacity style={styles.optionDeleteBtn} onPress={() => removeOption(item.id)} activeOpacity={0.85}>
                  <Text style={styles.optionDeleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addOptionBox} onPress={addOption} activeOpacity={0.85}>
              <Text style={styles.addOptionText}>＋ Seçenek ekle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsRow}>
            <SettingCard icon="👥" label="Hedef Kitle" value="Kurum Geneli" />
            <SettingCard icon="📅" label="Bitiş Süresi" value="2 gün aktif" />
            <SettingCard icon="🛡️" label="Durum" value="Aktif" />
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={createPoll} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>✅ Aktif Olarak Yayınla</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Anketler</Text>
          <View style={styles.filterPill}><Text style={styles.filterText}>Tümü⌄</Text></View>
        </View>

        {polls.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗳️</Text>
            <Text style={styles.emptyTitle}>Henüz anket yok</Text>
            <Text style={styles.emptyDesc}>İlk anketi yukarıdan oluştur.</Text>
          </View>
        ) : (
          polls.map((item) => {
            const cevapSayisi = Object.keys(safeObject(item.cevaplar)).length;
            const active = item.aktif !== false;
            const busy = busyId === item.id;

            return (
              <View key={item.id} style={styles.pollCard}>
                <View style={styles.pollHeader}>
                  <View style={styles.pollIconCircle}><Text style={styles.pollIcon}>▮▮▮</Text></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.pollTitleRow}>
                      <Text style={styles.pollTitle}>{item.baslik || 'Anket'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: active ? '#E8F9EF' : '#F1F1F4' }]}> 
                        <Text style={[styles.statusText, { color: active ? THEME.green : THEME.muted }]}>{active ? 'Aktif' : 'Pasif'}</Text>
                      </View>
                    </View>
                    {item.aciklama ? <Text style={styles.pollDesc}>{item.aciklama}</Text> : null}
                    <Text style={styles.pollMeta}>📅 {formatDate(item.createdAt)} · 💬 {cevapSayisi} cevap</Text>
                  </View>
                </View>

                <View style={styles.resultsBox}>{renderResults(item)}</View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.outlineActionBtn} activeOpacity={0.85}>
                    <Text style={[styles.outlineActionText, { color: THEME.purple }]}>▮ Sonuçlar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.outlineActionBtn} activeOpacity={0.85}>
                    <Text style={[styles.outlineActionText, { color: THEME.blue }]}>✎ Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.outlineActionBtn, busy && { opacity: 0.6 }]}
                    onPress={() => toggleActive(item)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.outlineActionText, { color: active ? THEME.red : THEME.green }]}>{active ? '⏸ Pasif Yap' : '✓ Aktif Et'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.deleteTextButton} onPress={() => deletePoll(item)} disabled={busy} activeOpacity={0.85}>
                  <Text style={styles.deleteText}>Anketi tamamen sil</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <View style={styles.summaryBox}>
      <View style={[styles.summaryIconCircle, { backgroundColor: `${color}18` }]}>
        <Text style={styles.summaryIcon}>{icon}</Text>
      </View>
      <Text style={[styles.summaryNumber, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SettingCard({ icon, label, value }) {
  return (
    <View style={styles.settingCard}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      <Text style={styles.settingChevron}>⌄</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '800' },
  errorText: { backgroundColor: '#FFF1F3', color: THEME.red, padding: 10, borderRadius: 12, marginBottom: 12, fontWeight: '800' },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryBox: { flex: 1, backgroundColor: THEME.card, borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 9, elevation: 2 },
  summaryIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  summaryIcon: { fontSize: 22 },
  summaryNumber: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: THEME.muted, marginTop: 2, textAlign: 'center' },

  formCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  formIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  formIcon: { fontSize: 22 },
  formTitle: { fontSize: 20, fontWeight: '900', color: THEME.text },
  label: { fontSize: 13, fontWeight: '900', color: THEME.primary, marginTop: 14, marginBottom: 7 },
  labelNoMargin: { fontSize: 13, fontWeight: '900', color: THEME.primary },
  inputShell: { minHeight: 50, backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: THEME.border, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: THEME.text, fontSize: 14, fontWeight: '700', paddingVertical: 10 },
  inputIcon: { color: '#9B99B0', fontWeight: '900', marginLeft: 8 },
  textAreaShell: { minHeight: 78, alignItems: 'flex-start', paddingTop: 5 },
  textArea: { minHeight: 68, textAlignVertical: 'top' },

  optionsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 8 },
  helpInline: { color: THEME.muted, fontWeight: '800', fontSize: 11, flex: 1 },
  helpCircle: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', textAlignVertical: 'center', backgroundColor: THEME.primarySoft, color: THEME.purple, fontWeight: '900', overflow: 'hidden' },
  optionList: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInputBox: { flex: 1, minHeight: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: THEME.border, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  dragHandle: { color: '#AAA7C2', fontSize: 18, marginRight: 9 },
  optionInput: { flex: 1, color: THEME.text, fontSize: 14, fontWeight: '800', paddingVertical: 8 },
  optionDeleteBtn: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFF', borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
  optionDeleteText: { fontSize: 18 },
  addOptionBox: { height: 52, borderRadius: 16, borderWidth: 1.4, borderColor: '#BCA7FF', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9FF', marginTop: 2 },
  addOptionText: { color: THEME.purple, fontWeight: '900', fontSize: 15 },

  settingsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  settingCard: { flex: 1, minHeight: 62, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: THEME.border, borderRadius: 15, padding: 8, flexDirection: 'row', alignItems: 'center' },
  settingIcon: { fontSize: 20, marginRight: 6 },
  settingLabel: { color: THEME.muted, fontWeight: '800', fontSize: 10 },
  settingValue: { color: THEME.text, fontWeight: '900', fontSize: 12, marginTop: 2 },
  settingChevron: { color: THEME.muted, fontWeight: '900', marginLeft: 3 },
  saveBtn: { backgroundColor: THEME.purple, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 21, fontWeight: '900', color: THEME.text },
  filterPill: { backgroundColor: THEME.card, borderRadius: 15, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, paddingVertical: 9 },
  filterText: { color: THEME.primary, fontWeight: '900' },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: THEME.text },
  emptyDesc: { color: THEME.muted, fontWeight: '700', marginTop: 6, textAlign: 'center' },

  pollCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  pollHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  pollIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pollIcon: { color: THEME.purple, fontWeight: '900', fontSize: 18 },
  pollTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pollTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: THEME.text },
  pollDesc: { fontSize: 13, color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 18 },
  pollMeta: { fontSize: 11, color: THEME.muted, fontWeight: '700', marginTop: 7 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 4 },
  statusText: { fontSize: 11, fontWeight: '900' },
  resultsBox: { backgroundColor: '#FAF9FF', borderRadius: 15, padding: 12, marginBottom: 12 },
  resultEmpty: { color: THEME.muted, fontWeight: '800', textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultLabel: { color: THEME.text, fontWeight: '900', width: 60 },
  resultPercent: { color: THEME.text, fontWeight: '900', width: 42, textAlign: 'right', fontSize: 12 },
  resultCountPill: { minWidth: 34, textAlign: 'center', backgroundColor: THEME.primarySoft, color: THEME.primary, borderRadius: 999, overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 8, fontWeight: '900', fontSize: 12 },
  barBg: { flex: 1, height: 8, borderRadius: 999, backgroundColor: '#ECE8F8', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999, backgroundColor: THEME.purple },
  actionsRow: { flexDirection: 'row', gap: 8 },
  outlineActionBtn: { flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: THEME.border },
  outlineActionText: { fontWeight: '900', fontSize: 12 },
  deleteTextButton: { alignSelf: 'center', marginTop: 10, paddingVertical: 4, paddingHorizontal: 8 },
  deleteText: { color: THEME.red, fontWeight: '900', fontSize: 11 },
});