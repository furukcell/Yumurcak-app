// ============================================================
// YUMURCAK — TeacherAnnouncementsScreen.js
// Öğretmen duyuru yönetimi - modern kartlı görünüm
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
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ref, push, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState, formatDate } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

function targetRoleOf(item) {
  return item.targetRole || item.hedefRol || item.hedefTipi || 'all';
}

function classIdOf(item) {
  return item.sinifId || item.classId || '';
}

function titleOf(item) {
  return item.baslik || item.title || 'Duyuru';
}

function textOf(item) {
  return item.icerik || item.message || item.metin || item.aciklama || '-';
}

function isImportant(item) {
  const title = titleOf(item).toLocaleLowerCase('tr-TR');
  const text = textOf(item).toLocaleLowerCase('tr-TR');
  return item.onemli === true || item.important === true || title.includes('önem') || text.includes('önem');
}

function timeTextOf(item) {
  const raw = item.createdAt || item.updatedAt || item.tarih;
  if (!raw) return '';
  const date = typeof raw === 'number' ? new Date(raw) : new Date(String(raw));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function TeacherAnnouncementsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass, announcements } = useTeacherData();

  const [showForm, setShowForm] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [icerik, setIcerik] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Duyuru yayınlandı');

  const visible = useMemo(() => {
    if (!currentClass?.id) return [];

    return announcements
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        const targetRole = targetRoleOf(item);
        const itemClassId = classIdOf(item);
        if (item.olusturanRol === 'ogretmen' && itemClassId === currentClass.id) return true;
        if (targetRole === 'veli') return false;
        if (targetRole === 'ogretmen') return true;
        if (targetRole === 'sinif') return itemClassId === currentClass.id;
        return !itemClassId || itemClassId === currentClass.id;
      })
      .filter((item) => {
        if (filter === 'class') return targetRoleOf(item) === 'sinif' || item.olusturanRol === 'ogretmen';
        if (filter === 'school') return targetRoleOf(item) !== 'sinif' && item.olusturanRol !== 'ogretmen';
        if (filter === 'mine') return item.olusturanRol === 'ogretmen' && classIdOf(item) === currentClass.id;
        if (filter === 'important') return isImportant(item);
        return true;
      })
      .sort((a, b) => String(b.createdAt || b.tarih || '').localeCompare(String(a.createdAt || a.tarih || '')));
  }, [announcements, currentClass?.id, kresId, filter]);

  const stats = useMemo(() => {
    const classCount = visible.filter((item) => targetRoleOf(item) === 'sinif' || item.olusturanRol === 'ogretmen').length;
    const schoolCount = visible.filter((item) => targetRoleOf(item) !== 'sinif' && item.olusturanRol !== 'ogretmen').length;
    return { total: visible.length, classCount, schoolCount };
  }, [visible]);

  if (loading) return <LoadingState text="Duyurular hazırlanıyor..." />;

  const resetForm = () => {
    setBaslik('');
    setIcerik('');
    setEditingId(null);
  };

  const openCreateForm = () => {
    if (showForm && !editingId) {
      setShowForm(false);
      resetForm();
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item) => {
    if (item.olusturanRol !== 'ogretmen') {
      Alert.alert('Bilgi', 'Kurum duyuruları öğretmen ekranından düzenlenemez.');
      return;
    }
    setEditingId(item.id);
    setBaslik(titleOf(item));
    setIcerik(textOf(item));
    setShowForm(true);
  };

  const saveAnnouncement = async () => {
    if (!currentClass?.id) return Alert.alert('Hata', 'Sınıf bulunamadı.');
    if (!baslik.trim() || !icerik.trim()) return Alert.alert('Eksik Bilgi', 'Başlık ve duyuru metni zorunludur.');

    setSaving(true);
    try {
      if (editingId) {
        await update(ref(database, `duyurular/${editingId}`), {
          baslik: baslik.trim(),
          title: baslik.trim(),
          icerik: icerik.trim(),
          message: icerik.trim(),
          updatedAt: Date.now(),
        });
        setSuccessMessage('Duyuru güncellendi');
      } else {
        await push(ref(database, 'duyurular'), {
          kresId: kresId || currentClass.kresId || '',
          sinifId: currentClass.id,
          olusturanId: teacherId || '',
          olusturanRol: 'ogretmen',
          hedefRol: 'veli',
          hedefTipi: 'sinif',
          targetRole: 'sinif',
          baslik: baslik.trim(),
          title: baslik.trim(),
          icerik: icerik.trim(),
          message: icerik.trim(),
          tarih: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
          aktif: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setSuccessMessage('Duyuru sınıf velilerine gönderildi');
      }

      resetForm();
      setShowForm(false);
      setSuccessToast(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Duyuru kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const removeAnnouncement = (item) => {
    if (item.olusturanRol !== 'ogretmen') {
      Alert.alert('Bilgi', 'Kurum duyuruları öğretmen ekranından kaldırılamaz.');
      return;
    }

    Alert.alert('Duyuru kaldırılsın mı?', 'Bu duyuru veli ekranında artık görünmez.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          try {
            await update(ref(database, `duyurular/${item.id}`), {
              aktif: false,
              updatedAt: Date.now(),
            });
            setSuccessMessage('Duyuru kaldırıldı');
            setSuccessToast(true);
          } catch (err) {
            Alert.alert('Hata', 'Duyuru kaldırılamadı.');
          }
        },
      },
    ]);
  };

  const getBadgeText = (item) => {
    const targetRole = targetRoleOf(item);
    if (item.olusturanRol === 'ogretmen') return 'Sınıf Velilerine';
    if (targetRole === 'ogretmen') return 'Öğretmen Duyurusu';
    if (targetRole === 'sinif') return 'Sınıf Duyurusu';
    return 'Kurum Duyurusu';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={successMessage} onHide={() => setSuccessToast(false)} />
      <ScreenHeader
        navigation={navigation}
        title="Duyurular"
        subtitle={currentClass?.ad || 'Sınıfım'}
        rightText={showForm ? 'Kapat' : '+ Ekle'}
        onRightPress={showForm ? () => { setShowForm(false); resetForm(); } : openCreateForm}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          <FilterChip active={filter === 'all'} label="📣 Tümü" onPress={() => setFilter('all')} />
          <FilterChip active={filter === 'class'} label="👥 Sınıf" onPress={() => setFilter('class')} />
          <FilterChip active={filter === 'school'} label="🏫 Kurum" onPress={() => setFilter('school')} />
          <FilterChip active={filter === 'important'} label="★ Önemli" onPress={() => setFilter('important')} />
        </View>

        <View style={styles.infoBanner}>
          <View style={styles.bannerIconBox}><Text style={styles.bannerIcon}>🔔</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Duyuruları kolayca yönetin</Text>
            <Text style={styles.bannerText}>Sınıfınıza duyuru ekleyebilir, kendi duyurularınızı düzenleyebilirsiniz.</Text>
          </View>
          <Text style={styles.bannerDecor}>📣</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox value={stats.total} label="Toplam" icon="📣" />
          <StatBox value={stats.classCount} label="Sınıf" icon="👥" />
          <StatBox value={stats.schoolCount} label="Kurum" icon="🏫" />
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? 'Duyuruyu Düzenle' : 'Sınıf Velilerine Duyuru'}</Text>
            <TextInput style={styles.input} value={baslik} onChangeText={setBaslik} placeholder="Duyuru başlığı" placeholderTextColor="#999" />
            <TextInput style={[styles.input, styles.textArea]} value={icerik} onChangeText={setIcerik} placeholder="Duyuru metni" multiline placeholderTextColor="#999" />
            <TouchableOpacity style={styles.saveButton} onPress={saveAnnouncement} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{editingId ? 'Duyuruyu Güncelle' : 'Duyuruyu Gönder'}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState icon="📣" title="Duyuru yok" desc="Sınıfına duyuru eklediğinde burada görünür." />
        ) : (
          visible.map((item) => {
            const role = targetRoleOf(item);
            const isClass = role === 'sinif' || item.olusturanRol === 'ogretmen';
            const expanded = expandedId === item.id;
            const canEdit = item.olusturanRol === 'ogretmen';
            const dateText = item.tarih ? formatDate(item.tarih) : formatDate(item.createdAt || item.updatedAt || '');
            const timeText = timeTextOf(item);

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.typePill, isClass ? styles.classPill : styles.schoolPill]}>{isClass ? '👥 ' : '🏫 '}{getBadgeText(item)}</Text>
                  <View style={styles.topRightRow}>
                    <Text style={styles.date}>{dateText || '-'}</Text>
                    {isImportant(item) ? <Text style={styles.importantPill}>★ ÖNEMLİ</Text> : null}
                  </View>
                </View>
                <Text style={styles.title}>{titleOf(item)}</Text>
                <Text style={styles.body} numberOfLines={expanded ? 0 : 2}>{textOf(item)}</Text>
                <View style={styles.bottomRow}>
                  <View style={[styles.dateIconBox, isClass ? styles.classDateIcon : styles.schoolDateIcon]}><Text style={styles.dateIcon}>📅</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateText}>{dateText || 'Tarih yok'}</Text>
                    {timeText ? <Text style={styles.timeText}>{timeText}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.actionButtonSoft} onPress={() => setExpandedId(expanded ? null : item.id)} activeOpacity={0.85}>
                    <Text style={styles.actionButtonSoftText}>{expanded ? 'Kapat' : 'Görüntüle'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editButton, !canEdit && styles.disabledAction]} onPress={() => openEditForm(item)} activeOpacity={0.85}>
                    <Text style={styles.editButtonText}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.removeButton, !canEdit && styles.disabledAction]} onPress={() => removeAnnouncement(item)} activeOpacity={0.85}>
                    <Text style={styles.removeButtonText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FilterChip({ active, label, onPress }) {
  return <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress} activeOpacity={0.86}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></TouchableOpacity>;
}

function StatBox({ value, label, icon }) {
  return <View style={styles.statBox}><Text style={styles.statIcon}>{icon}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 32 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: { flexGrow: 1, backgroundColor: '#F7FCFF', borderWidth: 1, borderColor: '#BFE6FF', borderRadius: 18, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center' },
  filterChipActive: { backgroundColor: '#1976F3', borderColor: '#1976F3' },
  filterText: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  filterTextActive: { color: '#FFF' },
  infoBanner: { backgroundColor: '#EAF7FF', borderWidth: 1, borderColor: '#BFE6FF', borderRadius: 22, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  bannerIconBox: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#D8EEFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bannerIcon: { fontSize: 28 },
  bannerTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  bannerText: { color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 18 },
  bannerDecor: { fontSize: 34, marginLeft: 8 },
  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: THEME.card, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  statIcon: { fontSize: 20 },
  statValue: { color: THEME.primary, fontWeight: '900', fontSize: 18, marginTop: 3 },
  statLabel: { color: THEME.muted, fontWeight: '800', fontSize: 11, marginTop: 2 },
  formCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  formTitle: { color: THEME.primary, fontWeight: '900', fontSize: 17, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, color: THEME.text, borderWidth: 1, borderColor: THEME.border, fontWeight: '700' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  card: { backgroundColor: THEME.card, borderRadius: 25, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 13, elevation: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  topRightRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  typePill: { borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
  classPill: { backgroundColor: '#EDE7FF', color: '#6C3DEB' },
  schoolPill: { backgroundColor: '#E9FAEE', color: '#16A05A' },
  importantPill: { backgroundColor: '#FFE7EE', color: '#E33355', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 7, fontWeight: '900', fontSize: 11 },
  date: { color: THEME.muted, fontWeight: '900', fontSize: 12 },
  title: { fontSize: 20, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  body: { color: THEME.muted, lineHeight: 22, fontWeight: '700', fontSize: 15 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  dateIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  classDateIcon: { backgroundColor: '#E9F5FF' },
  schoolDateIcon: { backgroundColor: '#EAF9F0' },
  dateIcon: { fontSize: 23 },
  dateText: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  timeText: { color: THEME.muted, fontWeight: '700', fontSize: 11, marginTop: 3 },
  actionButtonSoft: { backgroundColor: '#EEF7FF', borderRadius: 15, paddingVertical: 11, paddingHorizontal: 10, marginLeft: 6 },
  actionButtonSoftText: { color: '#1976F3', fontWeight: '900', fontSize: 12 },
  editButton: { borderWidth: 1, borderColor: '#1976F3', borderRadius: 15, paddingVertical: 11, paddingHorizontal: 10, marginLeft: 6, backgroundColor: '#FFF' },
  editButtonText: { color: '#1976F3', fontWeight: '900', fontSize: 12 },
  removeButton: { borderWidth: 1, borderColor: '#FFD0D8', borderRadius: 15, paddingVertical: 11, paddingHorizontal: 10, marginLeft: 6, backgroundColor: '#FFF5F7' },
  removeButtonText: { color: '#E33355', fontWeight: '900', fontSize: 12 },
  disabledAction: { opacity: 0.45 },
});
