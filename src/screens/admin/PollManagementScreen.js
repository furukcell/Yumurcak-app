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

const THEME = {
  primary: '#3C3489',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

function cleanOptions(raw) {
  return raw
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'number') {
    try {
      return new Date(value).toLocaleDateString('tr-TR');
    } catch (e) {
      return '';
    }
  }
  return String(value);
}

function getOptionLabel(option, index) {
  if (typeof option === 'string') return option;
  return option?.label || option?.text || `Seçenek ${index + 1}`;
}

export default function PollManagementScreen() {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || 'default-kres';

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [seceneklerText, setSeceneklerText] = useState('Evet\nHayır');

  useEffect(() => {
    const unsub = onValue(ref(database, 'anketler'), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, item]) => ({ id, ...item }))
        .filter((item) => !item.kresId || item.kresId === kresId)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setPolls(list);
      setLoading(false);
    });
    return () => unsub();
  }, [kresId]);

  const toplamAktif = useMemo(() => polls.filter((x) => x.aktif !== false).length, [polls]);
  const toplamCevap = useMemo(() => polls.reduce((sum, p) => sum + Object.keys(p.cevaplar || {}).length, 0), [polls]);

  async function createPoll() {
    const title = baslik.trim();
    const options = cleanOptions(seceneklerText);

    if (!title) return Alert.alert('Eksik bilgi', 'Anket başlığı yazmalısın.');
    if (options.length < 2) return Alert.alert('Eksik bilgi', 'En az 2 seçenek olmalı. Her seçeneği ayrı satıra yaz.');

    setSaving(true);
    try {
      await push(ref(database, 'anketler'), {
        kresId,
        baslik: title,
        aciklama: aciklama.trim() || '',
        secenekler: options,
        aktif: true,
        cevaplar: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setBaslik('');
      setAciklama('');
      setSeceneklerText('Evet\nHayır');
      Alert.alert('Tamam', 'Anket velilere açıldı.');
    } catch (e) {
      Alert.alert('Hata', 'Anket oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    if (!item?.id) return;
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
    if (!item?.id) return;
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
    const options = item.secenekler || item.options || [];
    const cevaplar = Object.values(item.cevaplar || {});
    const total = cevaplar.length;

    if (options.length === 0) {
      return <Text style={styles.resultEmpty}>Seçenek yok</Text>;
    }

    return options.map((option, index) => {
      const label = getOptionLabel(option, index);
      const count = cevaplar.filter((c) => c?.secenek === label || c?.cevap === label).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;

      return (
        <View key={`${item.id}-${label}-${index}`} style={styles.resultRow}>
          <View style={styles.resultTop}>
            <Text style={styles.resultLabel}>{label}</Text>
            <Text style={styles.resultCount}>{count} cevap · %{percent}</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${percent}%` }]} />
          </View>
        </View>
      );
    });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={THEME.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{polls.length}</Text>
            <Text style={styles.summaryLabel}>Toplam Anket</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: THEME.green }]}>{toplamAktif}</Text>
            <Text style={styles.summaryLabel}>Aktif</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: THEME.orange }]}>{toplamCevap}</Text>
            <Text style={styles.summaryLabel}>Cevap</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>🗳️ Yeni Anket Oluştur</Text>
          <Text style={styles.label}>Başlık *</Text>
          <TextInput
            style={styles.input}
            value={baslik}
            onChangeText={setBaslik}
            placeholder="Örn: Yıl sonu gösterisi hangi gün olsun?"
          />

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Velilere kısa açıklama"
            multiline
          />

          <Text style={styles.label}>Seçenekler *</Text>
          <Text style={styles.help}>Her seçeneği ayrı satıra yaz.</Text>
          <TextInput
            style={[styles.input, styles.optionsInput]}
            value={seceneklerText}
            onChangeText={setSeceneklerText}
            placeholder={'Evet\nHayır\nKararsız'}
            multiline
          />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={createPoll} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>✅ Aktif Olarak Yayınla</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Anketler</Text>
        {polls.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗳️</Text>
            <Text style={styles.emptyTitle}>Henüz anket yok</Text>
            <Text style={styles.emptyDesc}>İlk anketi yukarıdan oluştur.</Text>
          </View>
        ) : (
          polls.map((item) => {
            const cevapSayisi = Object.keys(item.cevaplar || {}).length;
            const active = item.aktif !== false;
            const busy = busyId === item.id;

            return (
              <View key={item.id} style={styles.pollCard}>
                <View style={styles.pollHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pollTitle}>{item.baslik || item.title || 'Anket'}</Text>
                    {item.aciklama || item.description ? <Text style={styles.pollDesc}>{item.aciklama || item.description}</Text> : null}
                    <Text style={styles.pollMeta}>{formatDate(item.createdAt)} · {cevapSayisi} cevap</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: active ? '#E8F9EF' : '#F1F1F4' }]}>
                    <Text style={[styles.statusText, { color: active ? THEME.green : THEME.muted }]}>{active ? 'Aktif' : 'Pasif'}</Text>
                  </View>
                </View>

                <View style={styles.resultsBox}>{renderResults(item)}</View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: active ? THEME.orange : THEME.green }, busy && { opacity: 0.6 }]}
                    onPress={() => toggleActive(item)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionText}>{active ? 'Pasife Al' : 'Aktif Et'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, busy && { opacity: 0.6 }]}
                    onPress={() => deletePoll(item)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryBox: { flex: 1, backgroundColor: THEME.card, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  summaryNumber: { fontSize: 22, fontWeight: '900', color: THEME.primary },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: THEME.muted, marginTop: 2 },
  formCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 18 },
  formTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '900', color: THEME.primary, marginTop: 14, marginBottom: 7 },
  help: { fontSize: 11, color: THEME.muted, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: THEME.border, borderRadius: 12, padding: 12, color: THEME.text, fontSize: 14, fontWeight: '700' },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  optionsInput: { minHeight: 92, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: THEME.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
  emptyDesc: { fontSize: 13, color: THEME.muted, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  pollCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  pollHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pollTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
  pollDesc: { fontSize: 12.5, lineHeight: 18, color: THEME.muted, fontWeight: '700', marginTop: 5 },
  pollMeta: { fontSize: 11, color: THEME.muted, fontWeight: '800', marginTop: 7 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '900' },
  resultsBox: { marginTop: 14, gap: 9 },
  resultRow: { gap: 5 },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  resultLabel: { flex: 1, fontSize: 12.5, fontWeight: '900', color: THEME.text },
  resultCount: { fontSize: 11, fontWeight: '800', color: THEME.muted },
  resultEmpty: { color: THEME.muted, fontWeight: '700' },
  barBg: { height: 8, borderRadius: 10, backgroundColor: '#F0EEF8', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 10, backgroundColor: THEME.primary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  deleteBtn: { backgroundColor: THEME.red },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});