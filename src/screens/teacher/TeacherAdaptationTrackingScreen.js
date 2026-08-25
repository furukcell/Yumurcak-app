import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, set, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useTeacherData, LoadingState, EmptyState, getChildName } from './teacherShared';
import { bugunKey, tarihTr, uyumAktifMi, uyumEmoji, uyumGunNo, uyumKalanGun, uyumOzet, uyumSkoru, UYUM_GUN } from '../../utils/uyum';

const BLUE = '#356CFF';
const GREEN = '#20B45B';
const ORANGE = '#FF9F1C';
const BG = '#F5F8FF';
const CARD = '#FFFFFF';
const TEXT = '#141A35';
const MUTED = '#727A94';
const BORDER = '#E5EAFE';

const OPTION = {
  sabah: [
    ['zorlandi', '😢 Zorlandı'], ['orta', '🙂 Orta'], ['iyi', '😊 İyi'],
  ],
  yemek: [
    ['hic', 'Hiç yemedi'], ['az', 'Az yedi'], ['yarisi', 'Yarısını yedi'], ['hepsi', 'Hepsini yedi'],
  ],
  cikis: [
    ['agladi', '😢 Ağladı'], ['huzunlu', '🙂 Biraz hüzünlü'], ['gulerek', '😊 Gülerek ayrıldı'],
  ],
  oyun: [
    ['oynamadi', 'Oynamadı'], ['kismen', 'Kısmen'], ['aktif', 'Aktif'],
  ],
};

export default function TeacherAdaptationTrackingScreen({ navigation }) {
  const data = useTeacherData();
  const today = bugunKey();
  const [uyumKayitlari, setUyumKayitlari] = React.useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(defaultForm());

  const activeChildren = data.classChildren.filter(uyumAktifMi);
  const selectedChild = activeChildren.find((c) => c.id === selectedId) || activeChildren[0] || null;
  const selectedRecords = selectedChild ? uyumKayitlari.filter((r) => String(r.cocukId) === String(selectedChild.id)) : [];
  const todayRecord = selectedChild ? selectedRecords.find((r) => r.tarih === today) : null;

  React.useEffect(() => {
    if (!data.kresId) {
      setUyumKayitlari([]);
      return undefined;
    }
    // Artık tüm 'uyumKayitlari' node'u çekilmiyor, sadece bu kreşe ait kayıtlar sorgulanıyor.
    const q = query(ref(database, 'uyumKayitlari'), orderByChild('kresId'), equalTo(data.kresId));
    const unsub = onValue(q, (snap) => {
      const val = snap.val() || {};
      setUyumKayitlari(Object.entries(val).map(([id, item]) => ({ id, ...(item || {}) })));
    }, () => setUyumKayitlari([]));
    return () => unsub && unsub();
  }, [data.kresId]);

  React.useEffect(() => {
    if (!selectedChild?.id) {
      setForm(defaultForm());
      return;
    }
    if (todayRecord) {
      setForm({ ...defaultForm(), ...todayRecord, milestones: { ...(todayRecord.milestones || {}) } });
      return;
    }
    setForm(defaultForm());
  }, [selectedChild?.id, todayRecord?.id]);

  if (data.loading) return <LoadingState text="Uyum takibi hazırlanıyor..." />;
  if (!data.currentClass) return <EmptyState icon="🏫" title="Sınıf bulunamadı" desc="Öğretmen bir sınıfa bağlandığında uyum takibi aktifleşir." />;

  const enteredToday = activeChildren.filter((child) => uyumKayitlari.some((r) => r.tarih === today && String(r.cocukId) === String(child.id))).length;
  const pending = Math.max(0, activeChildren.length - enteredToday);
  const avg = activeChildren.length ? Math.round(activeChildren.reduce((sum, child) => {
    const childRecords = uyumKayitlari.filter((r) => String(r.cocukId) === String(child.id));
    return sum + uyumOzet(childRecords).skor;
  }, 0) / activeChildren.length) : 0;

  const liveScore = uyumSkoru(form);

  const selectChild = (child) => {
    setSelectedId(child.id);
  };

  const save = async () => {
    if (!selectedChild) return;
    setSaving(true);
    try {
      const gunNo = uyumGunNo(selectedChild.uyumBaslangicTarihi, today);
      const id = `${selectedChild.id}_${today}`;
      const score = uyumSkoru(form);
      await set(ref(database, `uyumKayitlari/${id}`), {
        kresId: data.kresId || selectedChild.kresId || '',
        sinifId: selectedChild.sinifId || data.currentClass?.id || '',
        cocukId: selectedChild.id,
        tarih: today,
        gunNo,
        sabahDurumu: form.sabahDurumu,
        aglamaDakika: Number(form.aglamaDakika || 0),
        yemekDurumu: form.yemekDurumu,
        cikisDurumu: form.cikisDurumu,
        uykuDakika: Number(form.uykuDakika || 0),
        oyunDurumu: form.oyunDurumu,
        milestones: form.milestones || {},
        ogretmenNotu: form.ogretmenNotu || '',
        skor: score,
        kaydedenId: data.teacherId || '',
        kaydedenAd: `${data.kullanici?.ad || ''} ${data.kullanici?.soyad || ''}`.trim() || data.kullanici?.kullaniciAdi || 'Öğretmen',
        updatedAt: Date.now(),
        createdAt: todayRecord?.createdAt || Date.now(),
      });

      if (gunNo >= UYUM_GUN) {
        await update(ref(database, `cocuklar/${selectedChild.id}`), {
          uyumDurumu: 'tamamlandi',
          uyumTakibiAktif: false,
          uyumTamamlanmaTarihi: today,
          sonUyumSkoru: score,
          updatedAt: Date.now(),
        });
      } else {
        await update(ref(database, `cocuklar/${selectedChild.id}`), { sonUyumSkoru: score, updatedAt: Date.now() });
      }
      Alert.alert('Kaydedildi', 'Uyum kaydı ve skor güncellendi.');
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Uyum kaydı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Uyum Takibi</Text>
          <Text style={styles.headerSub}>{data.currentClass?.ad || 'Sınıf'} · {tarihTr(today)}</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat title="Günlük Giriş" value={`${enteredToday}/${activeChildren.length}`} icon="✅" color={GREEN} />
          <Stat title="Bekleyen" value={pending} icon="⏰" color={ORANGE} />
          <Stat title="Ortalama Skor" value={`${avg}/100`} icon="⭐" color={BLUE} />
        </View>

        {activeChildren.length === 0 ? (
          <EmptyState icon="🌱" title="Aktif uyum çocuğu yok" desc="Admin çocuk eklerken yeni başlayan seçerse burada görünür." />
        ) : (
          <View style={styles.mainGrid}>
            <View style={styles.childPanel}>
              <Text style={styles.sectionTitle}>Çocuklar ({activeChildren.length})</Text>
              {activeChildren.map((child) => {
                const list = uyumKayitlari.filter((r) => String(r.cocukId) === String(child.id));
                const oz = uyumOzet(list);
                const hasToday = list.some((r) => r.tarih === today);
                const day = uyumGunNo(child.uyumBaslangicTarihi, today);
                const selected = selectedChild?.id === child.id;
                return (
                  <TouchableOpacity key={child.id} style={[styles.childCard, selected && styles.childCardActive, !hasToday && styles.childCardPending]} onPress={() => selectChild(child)} activeOpacity={0.85}>
                    <View style={styles.childAvatar}><Text style={styles.childAvatarText}>👧</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{getChildName(child)}</Text>
                      <Text style={styles.childSub}>{day}. Gün / {UYUM_GUN}</Text>
                      <Text style={styles.childEmoji}>{uyumEmoji(oz.skor)} {hasToday ? 'Giriş yapıldı' : 'Giriş bekliyor'}</Text>
                    </View>
                    <Text style={[styles.childScore, !hasToday && styles.pendingText]}>{hasToday ? oz.skor : '⏰'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedChild ? (
              <View style={styles.formPanel}>
                <View style={styles.formHead}>
                  <View><Text style={styles.formTitle}>{getChildName(selectedChild)}</Text><Text style={styles.formSub}>{uyumGunNo(selectedChild.uyumBaslangicTarihi, today)}. Gün · {uyumKalanGun(selectedChild.uyumBaslangicTarihi, today)} gün kaldı</Text></View>
                  <View style={styles.scoreBox}><Text style={styles.scoreBig}>{liveScore}</Text><Text style={styles.scoreSmall}>/100</Text></View>
                </View>

                <Block title="1. Sabah nasıldı?">
                  <OptionRow options={OPTION.sabah} value={form.sabahDurumu} onChange={(v) => setForm({ ...form, sabahDurumu: v })} />
                  <NumberControl label="Ağladı mı? Kaç dakika?" value={form.aglamaDakika} step={5} max={90} onChange={(v) => setForm({ ...form, aglamaDakika: v })} />
                </Block>
                <Block title="2. Öğle yemeği"><OptionRow options={OPTION.yemek} value={form.yemekDurumu} onChange={(v) => setForm({ ...form, yemekDurumu: v })} /></Block>
                <Block title="3. Akşam çıkışı"><OptionRow options={OPTION.cikis} value={form.cikisDurumu} onChange={(v) => setForm({ ...form, cikisDurumu: v })} /></Block>
                <Block title="4. Uyku süresi"><NumberControl label="Uyku" value={form.uykuDakika} step={15} max={180} suffix="dk" onChange={(v) => setForm({ ...form, uykuDakika: v })} /></Block>
                <Block title="5. Arkadaşlarla oyun"><OptionRow options={OPTION.oyun} value={form.oyunDurumu} onChange={(v) => setForm({ ...form, oyunDurumu: v })} /></Block>
                <Block title="6. Dönüm noktaları">
                  <Toggle label="İlk arkadaşlık" value={form.milestones.ilkArkadaslik} onPress={() => toggleMilestone(form, setForm, 'ilkArkadaslik')} />
                  <Toggle label="İlk ayrılma" value={form.milestones.ilkAyrilik} onPress={() => toggleMilestone(form, setForm, 'ilkAyrilik')} />
                  <Toggle label="Öğretmene güven" value={form.milestones.ogretmeneGuven} onPress={() => toggleMilestone(form, setForm, 'ogretmeneGuven')} />
                  <Toggle label="Rahat vedalaşma" value={form.milestones.rahatVeda} onPress={() => toggleMilestone(form, setForm, 'rahatVeda')} />
                </Block>
                <Block title="7. Öğretmen notu">
                  <TextInput style={styles.noteInput} value={form.ogretmenNotu} onChangeText={(v) => setForm({ ...form, ogretmenNotu: v })} multiline maxLength={300} placeholder="Bugünkü uyum notunu yaz..." placeholderTextColor={MUTED} />
                  <Text style={styles.charCount}>{String(form.ogretmenNotu || '').length}/300</Text>
                </Block>
                <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Kaydet ve Skoru Güncelle · {liveScore}/100</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function defaultForm() { return { sabahDurumu: 'orta', aglamaDakika: 5, yemekDurumu: 'yarisi', cikisDurumu: 'huzunlu', uykuDakika: 60, oyunDurumu: 'kismen', milestones: {}, ogretmenNotu: '' }; }
function toggleMilestone(form, setForm, key) { setForm({ ...form, milestones: { ...(form.milestones || {}), [key]: !form.milestones?.[key] } }); }
function Stat({ title, value, icon, color }) { return <View style={styles.stat}><Text style={styles.statIcon}>{icon}</Text><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statTitle}>{title}</Text></View>; }
function Block({ title, children }) { return <View style={styles.block}><Text style={styles.blockTitle}>{title}</Text>{children}</View>; }
function OptionRow({ options, value, onChange }) { return <View style={styles.optionRow}>{options.map(([key, label]) => <TouchableOpacity key={key} style={[styles.option, value === key && styles.optionActive]} onPress={() => onChange(key)}><Text style={[styles.optionText, value === key && styles.optionTextActive]}>{label}</Text></TouchableOpacity>)}</View>; }
function NumberControl({ label, value, step, max, suffix = 'dk', onChange }) { const num = Number(value || 0); return <View style={styles.numRow}><Text style={styles.numLabel}>{label}</Text><View style={styles.numBtns}><TouchableOpacity style={styles.numBtn} onPress={() => onChange(Math.max(0, num - step))}><Text style={styles.numBtnText}>−</Text></TouchableOpacity><Text style={styles.numValue}>{num} {suffix}</Text><TouchableOpacity style={styles.numBtn} onPress={() => onChange(Math.min(max, num + step))}><Text style={styles.numBtnText}>+</Text></TouchableOpacity></View></View>; }
function Toggle({ label, value, onPress }) { return <TouchableOpacity style={[styles.toggle, value && styles.toggleOn]} onPress={onPress}><Text style={[styles.toggleText, value && styles.toggleTextOn]}>{value ? '✓ ' : '○ '}{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }, screen: { flex: 1 }, content: { padding: 16, paddingBottom: 70 },
  header: { backgroundColor: BLUE, borderRadius: 26, padding: 18, marginBottom: 14 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, backText: { color: '#fff', fontSize: 30, fontWeight: '900' }, headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' }, headerSub: { color: 'rgba(255,255,255,0.82)', fontWeight: '800', marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 }, stat: { flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: BORDER }, statIcon: { fontSize: 24 }, statValue: { fontSize: 22, fontWeight: '900', marginTop: 4 }, statTitle: { color: MUTED, fontWeight: '800', fontSize: 11, marginTop: 2 },
  mainGrid: { gap: 14 }, childPanel: { backgroundColor: CARD, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: BORDER }, sectionTitle: { color: TEXT, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  childCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: BORDER, padding: 12, marginBottom: 10, backgroundColor: '#fff' }, childCardActive: { borderColor: GREEN, backgroundColor: '#F2FFF5' }, childCardPending: { borderColor: '#FFDFA8' }, childAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, childAvatarText: { fontSize: 24 }, childName: { color: TEXT, fontWeight: '900' }, childSub: { color: MUTED, fontWeight: '700', marginTop: 3 }, childEmoji: { color: MUTED, fontSize: 12, marginTop: 4 }, childScore: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DFFBE7', color: GREEN, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', fontSize: 16 }, pendingText: { backgroundColor: '#FFF5DC', color: ORANGE },
  formPanel: { backgroundColor: CARD, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: BORDER }, formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, formTitle: { fontSize: 18, fontWeight: '900', color: TEXT }, formSub: { color: MUTED, fontWeight: '700', marginTop: 4 }, scoreBox: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#EEF3FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 }, scoreBig: { color: GREEN, fontSize: 26, fontWeight: '900' }, scoreSmall: { color: MUTED, fontWeight: '900' },
  block: { borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 12, marginBottom: 10, backgroundColor: '#FBFCFF' }, blockTitle: { color: TEXT, fontWeight: '900', marginBottom: 10 }, optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER }, optionActive: { borderColor: GREEN, backgroundColor: '#EAFBED' }, optionText: { color: TEXT, fontWeight: '800', fontSize: 12 }, optionTextActive: { color: GREEN },
  numRow: { marginTop: 10 }, numLabel: { color: MUTED, fontWeight: '800', marginBottom: 8 }, numBtns: { flexDirection: 'row', alignItems: 'center' }, numBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center' }, numBtnText: { color: BLUE, fontSize: 24, fontWeight: '900' }, numValue: { minWidth: 92, textAlign: 'center', color: TEXT, fontWeight: '900' },
  toggle: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, marginRight: 6, marginBottom: 8, alignSelf: 'flex-start' }, toggleOn: { backgroundColor: '#EAFBED', borderColor: GREEN }, toggleText: { color: TEXT, fontWeight: '800' }, toggleTextOn: { color: GREEN },
  noteInput: { minHeight: 94, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 12, color: TEXT, fontWeight: '700', textAlignVertical: 'top' }, charCount: { textAlign: 'right', color: MUTED, marginTop: 5, fontWeight: '700' }, saveBtn: { backgroundColor: BLUE, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 }, saveText: { color: '#fff', fontWeight: '900' }, disabled: { opacity: 0.6 },
});
