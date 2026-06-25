import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ref, update } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { database } from '../../config/firebase';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, getChildName } from './teacherShared';
import {
  WEEKLY_BADGES,
  buildWeeklyBadgeRecordId,
  getWeekKey,
  getWeekRange,
  isFriday,
  sortWeeklyBadgesNewestFirst,
} from '../../utils/weeklyBadges';

export default function TeacherWeeklyStarScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, classChildren } = useTeacherData();
  const records = useTeacherData().weeklyBadges || [];

  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState(WEEKLY_BADGES[0].id);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const weekKey = getWeekKey();
  const weekRange = getWeekRange();
  const fridayActive = isFriday();

  const classChildIds = useMemo(() => new Set(classChildren.map((child) => String(child.id))), [classChildren]);

  const classRecords = useMemo(() => {
    return (records || [])
      .filter((item) => {
        if (currentClass?.id && item.sinifId) return String(item.sinifId) === String(currentClass.id);
        return classChildIds.has(String(item.cocukId || ''));
      })
      .sort(sortWeeklyBadgesNewestFirst);
  }, [records, currentClass?.id, classChildIds]);

  const thisWeekRecords = useMemo(() => {
    return classRecords.filter((item) => String(item.weekKey || item.haftaKey || '') === weekKey);
  }, [classRecords, weekKey]);

  const selectedChild = useMemo(() => classChildren.find((child) => child.id === selectedChildId) || null, [classChildren, selectedChildId]);
  const selectedBadge = WEEKLY_BADGES.find((badge) => badge.id === selectedBadgeId) || WEEKLY_BADGES[0];
  const existingForSelected = selectedChildId
    ? thisWeekRecords.find((item) => String(item.cocukId || '') === String(selectedChildId))
    : null;

  const selectChild = (child) => {
    setSelectedChildId(child.id);
    const current = thisWeekRecords.find((item) => String(item.cocukId || '') === String(child.id));
    if (current) {
      setSelectedBadgeId(current.badgeId || current.rozetId || WEEKLY_BADGES[0].id);
      setNote(current.note || current.not || '');
    } else {
      setSelectedBadgeId(WEEKLY_BADGES[0].id);
      setNote('');
    }
  };

  const saveBadge = async () => {
    if (!fridayActive) {
      Alert.alert('Cuma günü aktif', 'Haftanın Yıldızı rozetleri sadece cuma günleri verilebilir.');
      return;
    }

    if (!currentClass?.id) {
      Alert.alert('Hata', 'Sınıf bilgisi bulunamadı.');
      return;
    }

    if (!selectedChild?.id) {
      Alert.alert('Eksik Bilgi', 'Önce bir çocuk seçmelisin.');
      return;
    }

    setSaving(true);
    try {
      const recordId = buildWeeklyBadgeRecordId(weekKey, selectedChild.id);
      const now = Date.now();
      await update(ref(database, `haftaninRozetleri/${recordId}`), {
        id: recordId,
        kresId: kresId || selectedChild.kresId || currentClass.kresId || '',
        sinifId: currentClass.id,
        cocukId: selectedChild.id,
        cocukAdi: getChildName(selectedChild),
        ogretmenId: teacherId || '',
        weekKey,
        haftaKey: weekKey,
        haftaBaslangic: weekRange.startKey,
        haftaBitis: weekRange.endKey,
        haftaLabel: weekRange.label,
        badgeId: selectedBadge.id,
        rozetId: selectedBadge.id,
        badgeTitle: selectedBadge.title,
        rozetAdi: selectedBadge.title,
        badgeEmoji: selectedBadge.emoji,
        rozetEmoji: selectedBadge.emoji,
        badgeDesc: selectedBadge.desc,
        rozetAciklama: selectedBadge.desc,
        note: note.trim(),
        not: note.trim(),
        privateToChild: true,
        visibleToParentOnly: true,
        aktif: true,
        createdAt: existingForSelected?.createdAt || now,
        updatedAt: now,
      });

      Alert.alert('Kaydedildi', `${getChildName(selectedChild)} için haftanın rozeti kaydedildi.`);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Rozet kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Haftanın yıldızı hazırlanıyor..." />;

  return (
    <SafeAreaView style={local.safeArea}>
      <ScreenHeader navigation={navigation} title="Haftanın Yıldızı" subtitle={weekRange.label} />
      <ScrollView contentContainerStyle={local.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title="Sınıf bulunamadı" desc="Rozet vermek için öğretmen hesabı bir sınıfa bağlı olmalı." />
        ) : classChildren.length === 0 ? (
          <EmptyState icon="👧" title="Çocuk yok" desc="Sınıfa çocuk eklendiğinde rozet verilebilir." />
        ) : (
          <>
            <View style={local.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={local.heroTitle}>🌟 Haftanın Yıldızı</Text>
                <Text style={local.heroText}>Her cuma çocukların hafta boyunca öne çıkan güzel davranışlarını küçük bir rozetle kutlayabilirsin.</Text>
              </View>
              <Text style={local.heroIcon}>🏅</Text>
            </View>

            <View style={local.privacyCard}>
              <Text style={local.privacyTitle}>🔒 Gizlilik bilgisi</Text>
              <Text style={local.privacyText}>Verilen rozet sadece seçilen çocuğun velisinde görünür. Diğer öğrencilerin velileri bu rozeti göremez.</Text>
            </View>

            {!fridayActive ? (
              <View style={local.lockCard}>
                <Text style={local.lockTitle}>⏳ Rozet seçimi cuma günü aktif olur</Text>
                <Text style={local.lockText}>Bugün çocukları gözlemleyebilirsin. Cuma günü çocuk seçip rozet ve kısa not kaydedebilirsin.</Text>
              </View>
            ) : null}

            <View style={local.card}>
              <View style={local.cardHeaderRow}>
                <Text style={local.cardTitle}>Çocuk Seç</Text>
                <Text style={local.countPill}>{thisWeekRecords.length}/{classChildren.length}</Text>
              </View>
              <View style={local.childGrid}>
                {classChildren.map((child) => {
                  const active = selectedChildId === child.id;
                  const hasRecord = thisWeekRecords.some((item) => String(item.cocukId || '') === String(child.id));
                  return (
                    <TouchableOpacity key={child.id} style={[local.childButton, active && local.childButtonActive, hasRecord && local.childButtonDone]} onPress={() => selectChild(child)} activeOpacity={0.85}>
                      <Text style={[local.childButtonText, active && local.childButtonTextActive]} numberOfLines={1}>{hasRecord ? '✓ ' : ''}{getChildName(child)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[local.card, !fridayActive && local.disabledSection]}>
              <Text style={local.cardTitle}>Rozet Seç</Text>
              <View style={local.badgeGrid}>
                {WEEKLY_BADGES.map((badge) => {
                  const active = selectedBadgeId === badge.id;
                  return (
                    <TouchableOpacity key={badge.id} style={[local.badgeOption, active && local.badgeOptionActive]} onPress={() => setSelectedBadgeId(badge.id)} disabled={!fridayActive} activeOpacity={0.85}>
                      <Text style={local.badgeEmoji}>{badge.emoji}</Text>
                      <Text style={[local.badgeTitle, active && local.badgeTitleActive]}>{badge.title}</Text>
                      <Text style={[local.badgeDesc, active && local.badgeDescActive]} numberOfLines={2}>{badge.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[local.card, !fridayActive && local.disabledSection]}>
              <Text style={local.cardTitle}>Kısa Not</Text>
              <Text style={local.helpText}>Velinin göreceği pozitif ve kısa bir açıklama yazabilirsin.</Text>
              <TextInput
                style={local.input}
                value={note}
                onChangeText={setNote}
                editable={fridayActive}
                placeholder="Örn: Arkadaşlarına oyuncakları toplarken yardım etti."
                placeholderTextColor="#999"
                multiline
              />
              {existingForSelected ? <Text style={local.updateInfo}>Bu çocuk için bu hafta rozet verilmiş. Kaydedersen mevcut kayıt güncellenir.</Text> : null}
              <TouchableOpacity style={[local.saveButton, (!fridayActive || saving) && local.saveButtonDisabled]} onPress={saveBadge} disabled={!fridayActive || saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={local.saveText}>{existingForSelected ? 'Rozeti Güncelle' : 'Rozeti Kaydet'}</Text>}
              </TouchableOpacity>
            </View>

            <View style={local.card}>
              <Text style={local.cardTitle}>Bu Haftanın Kayıtları</Text>
              {thisWeekRecords.length === 0 ? (
                <Text style={local.emptyText}>Bu hafta henüz rozet verilmedi.</Text>
              ) : thisWeekRecords.map((item) => (
                <RecordRow key={item.id || `${item.weekKey}_${item.cocukId}`} item={item} />
              ))}
            </View>

            <View style={local.card}>
              <Text style={local.cardTitle}>Sınıf Rozet Geçmişi</Text>
              {classRecords.length === 0 ? (
                <Text style={local.emptyText}>Henüz rozet geçmişi yok.</Text>
              ) : classRecords.slice(0, 10).map((item) => (
                <RecordRow key={item.id || `${item.weekKey}_${item.cocukId}`} item={item} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecordRow({ item }) {
  return (
    <View style={local.recordRow}>
      <Text style={local.recordEmoji}>{item.badgeEmoji || item.rozetEmoji || '🌟'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={local.recordTitle}>{item.cocukAdi || 'Çocuk'} · {item.badgeTitle || item.rozetAdi || 'Rozet'}</Text>
        <Text style={local.recordSub}>{item.haftaLabel || `${item.haftaBaslangic || ''} - ${item.haftaBitis || ''}`}</Text>
        {item.note || item.not ? <Text style={local.recordNote}>{item.note || item.not}</Text> : null}
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: '#FFF7E8', borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFE0A3', flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: THEME.text, fontSize: 22, fontWeight: '900' },
  heroText: { color: THEME.muted, fontWeight: '700', lineHeight: 20, marginTop: 7 },
  heroIcon: { fontSize: 54, marginLeft: 10 },
  privacyCard: { backgroundColor: '#F2FBFF', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#BDEBFF' },
  privacyTitle: { color: THEME.primary, fontWeight: '900', fontSize: 15 },
  privacyText: { color: THEME.text, fontWeight: '700', lineHeight: 19, marginTop: 5 },
  lockCard: { backgroundColor: '#FFF1F3', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FFC9D2' },
  lockTitle: { color: THEME.red, fontWeight: '900', fontSize: 15 },
  lockText: { color: THEME.text, fontWeight: '700', lineHeight: 19, marginTop: 5 },
  card: { backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  disabledSection: { opacity: 0.58 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, color: THEME.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  countPill: { backgroundColor: THEME.primarySoft, color: THEME.primary, fontWeight: '900', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  childGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  childButton: { backgroundColor: THEME.bg, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: THEME.border, marginRight: 8, marginBottom: 8, maxWidth: '100%' },
  childButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  childButtonDone: { borderColor: THEME.green },
  childButtonText: { color: THEME.text, fontWeight: '800' },
  childButtonTextActive: { color: '#FFF' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeOption: { width: '48.5%', backgroundColor: THEME.bg, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: THEME.border, minHeight: 126 },
  badgeOptionActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeTitle: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  badgeTitleActive: { color: '#FFF' },
  badgeDesc: { color: THEME.muted, fontWeight: '700', fontSize: 11, lineHeight: 15, marginTop: 4 },
  badgeDescActive: { color: 'rgba(255,255,255,0.86)' },
  helpText: { color: THEME.muted, fontWeight: '700', marginBottom: 8, lineHeight: 18 },
  input: { minHeight: 92, backgroundColor: THEME.bg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: THEME.border, color: THEME.text, textAlignVertical: 'top', fontWeight: '700' },
  updateInfo: { color: THEME.orange, fontWeight: '800', fontSize: 12, marginTop: 8, lineHeight: 17 },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#FFF', fontWeight: '900' },
  emptyText: { color: THEME.muted, fontWeight: '700', lineHeight: 19 },
  recordRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: THEME.bg, borderRadius: 18, padding: 12, marginTop: 8, borderWidth: 1, borderColor: THEME.border },
  recordEmoji: { fontSize: 30, marginRight: 10 },
  recordTitle: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  recordSub: { color: THEME.primary, fontWeight: '800', fontSize: 12, marginTop: 3 },
  recordNote: { color: THEME.muted, fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 5 },
});
