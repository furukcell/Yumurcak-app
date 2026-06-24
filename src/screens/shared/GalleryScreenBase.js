import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { onValue, push, ref as dbRef, remove, set } from 'firebase/database';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const DAY_MS = 24 * 60 * 60 * 1000;

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  orange: '#FF9F1C',
  green: '#20B45B',
  red: '#FF4D6D',
  blue: '#3A7BFF',
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
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function includesId(value, id) {
  if (!id) return false;
  return asArray(value).map((item) => String(item)).includes(String(id));
}

function getChildName(child) {
  return `${child?.ad || child?.adSoyad || child?.isim || 'Çocuk'} ${child?.soyad || ''}`.trim();
}

function getClassName(classItem) {
  return classItem?.ad || classItem?.sinifAdi || classItem?.name || 'Sınıf';
}

function getUserName(user) {
  return `${user?.ad || ''} ${user?.soyad || ''}`.trim() || user?.kullaniciAdi || user?.email || 'Kullanıcı';
}

function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function remainingText(expiresAt, now) {
  const diff = Number(expiresAt || 0) - now;
  if (diff <= 0) return 'Süresi doldu';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.ceil((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours <= 0) return `${minutes} dk kaldı`;
  return `${hours} sa ${minutes} dk kaldı`;
}

function getFileInfo(asset) {
  const isVideo = asset?.type === 'video';
  const extension = isVideo ? 'mp4' : 'jpg';
  const contentType = asset?.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
  return { isVideo, extension, contentType };
}

function normalizeTargetType(item) {
  if (item?.targetType) return item.targetType;
  if (item?.hedef === 'kurum') return 'school';
  if (item?.hedef === 'sinif') return 'class';
  if (item?.hedef === 'cocuk') return 'student';
  if (item?.studentId || item?.cocukId || asArray(item?.cocukIds).length > 0) return 'student';
  if (item?.classId || item?.sinifId) return 'class';
  return 'school';
}

export default function GalleryScreenBase({ mode = 'parent', navigation }) {
  const { kullanici } = useAuth();
  const userId = kullanici?.uid || kullanici?.id;
  const [gallery, setGallery] = useState([]);
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [now, setNow] = useState(Date.now());

  const canUpload = mode === 'admin' || mode === 'teacher';
  const title = mode === 'parent' ? 'Galeri' : mode === 'teacher' ? 'Sınıf Galerisi' : 'Galeri Yönetimi';
  const roleLabel = mode === 'parent' ? 'Veli sadece görüntüler' : 'Fotoğraf / video yükleyebilirsin';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubs = [
      onValue(dbRef(database, 'galeri'), (snap) => setGallery(toList(snap.val())), () => setGallery([])),
      onValue(dbRef(database, 'cocuklar'), (snap) => setChildren(toList(snap.val())), () => setChildren([])),
      onValue(dbRef(database, 'siniflar'), (snap) => setClasses(toList(snap.val())), () => setClasses([])),
      onValue(dbRef(database, 'kullanicilar'), (snap) => setUsers(safeObject(snap.val())), () => setUsers({})),
    ];
    setLoading(false);
    return () => unsubs.forEach((unsubscribe) => unsubscribe && unsubscribe());
  }, []);

  const currentClass = useMemo(() => {
    if (mode !== 'teacher' || !userId) return null;
    return classes.find((item) => includesId(item.ogretmenIds, userId)) || classes.find((item) => item.ogretmenId === userId || item.id === kullanici?.sinifId) || null;
  }, [classes, kullanici?.sinifId, mode, userId]);

  const myChildren = useMemo(() => {
    if (mode === 'parent') {
      return children.filter((child) => includesId(child.veliIds, userId) || child.veliId === userId || child.parentId === userId);
    }
    if (mode === 'teacher') {
      if (!currentClass?.id) return [];
      return children.filter((child) => child.sinifId === currentClass.id);
    }
    const userKresId = kullanici?.kresId || children[0]?.kresId || null;
    return children.filter((child) => !userKresId || child.kresId === userKresId);
  }, [children, currentClass?.id, kullanici?.kresId, mode, userId]);

  const kresId = useMemo(() => {
    if (mode === 'teacher') return currentClass?.kresId || kullanici?.kresId || myChildren[0]?.kresId || null;
    if (mode === 'parent') return myChildren[0]?.kresId || kullanici?.kresId || null;
    return kullanici?.kresId || myChildren[0]?.kresId || null;
  }, [currentClass?.kresId, kullanici?.kresId, mode, myChildren]);

  const availableClasses = useMemo(() => {
    return classes
      .filter((classItem) => !kresId || !classItem.kresId || classItem.kresId === kresId)
      .sort((a, b) => getClassName(a).localeCompare(getClassName(b), 'tr'));
  }, [classes, kresId]);

  const childIds = useMemo(() => new Set(myChildren.map((child) => String(child.id))), [myChildren]);
  const classIds = useMemo(() => new Set(myChildren.map((child) => String(child.sinifId)).filter(Boolean)), [myChildren]);

  const visibleGallery = useMemo(() => {
    return gallery
      .filter((item) => Number(item.expiresAt || 0) > now)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        if (mode === 'admin') return true;

        const normalizedTarget = normalizeTargetType(item);
        const itemClassId = item.classId || item.sinifId;
        const itemStudentIds = asArray(item.studentId || item.cocukIds || item.cocukId);

        if (normalizedTarget === 'school' || item.hedef === 'kurum') return true;

        if (mode === 'teacher') {
          if (currentClass?.id && String(itemClassId || '') === String(currentClass.id)) return true;
          return itemStudentIds.some((id) => childIds.has(String(id)));
        }

        if (itemClassId && classIds.has(String(itemClassId))) return true;
        return itemStudentIds.some((id) => childIds.has(String(id)));
      })
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [childIds, classIds, currentClass?.id, gallery, kresId, mode, now]);

  useEffect(() => {
    if (!canUpload || gallery.length === 0) return;
    gallery
      .filter((item) => item.kresId === kresId && Number(item.expiresAt || 0) <= Date.now())
      .slice(0, 10)
      .forEach((item) => removeMedia(item, false));
  }, [canUpload, gallery, kresId]);

  const uploadTarget = useMemo(() => {
    if (targetType === 'child' && selectedChildId) {
      const child = myChildren.find((item) => item.id === selectedChildId);
      return {
        hedef: 'cocuk',
        targetType: 'student',
        classId: child?.sinifId || null,
        studentId: child?.id || null,
        cocukIds: child ? [child.id] : [],
        label: child ? getChildName(child) : 'Seçili çocuk',
      };
    }

    if (targetType === 'class' && selectedClassId) {
      const classItem = availableClasses.find((item) => item.id === selectedClassId);
      const classChildren = myChildren.filter((child) => child.sinifId === selectedClassId);
      return {
        hedef: 'sinif',
        targetType: 'class',
        classId: selectedClassId,
        studentId: null,
        cocukIds: classChildren.map((child) => child.id),
        label: classItem ? getClassName(classItem) : 'Seçili sınıf',
      };
    }

    if (mode === 'teacher') {
      return {
        hedef: 'sinif',
        targetType: 'class',
        classId: currentClass?.id || null,
        studentId: null,
        cocukIds: myChildren.map((child) => child.id),
        label: currentClass ? getClassName(currentClass) : 'Tüm sınıf',
      };
    }

    return {
      hedef: 'kurum',
      targetType: 'school',
      classId: null,
      studentId: null,
      cocukIds: myChildren.map((child) => child.id),
      label: 'Tüm kurum',
    };
  }, [availableClasses, currentClass, mode, myChildren, selectedChildId, selectedClassId, targetType]);

  async function pickAndUpload() {
    if (!canUpload) return;
    if (!kresId) {
      Alert.alert('Eksik Bilgi', 'Kreş bilgisi bulunamadı. Önce kullanıcı/kresId bağlantısını kontrol et.');
      return;
    }
    if (targetType === 'class' && !selectedClassId) {
      Alert.alert('Sınıf Seç', 'Sınıfa özel paylaşım için bir sınıf seçmelisin.');
      return;
    }
    if (targetType === 'child' && !selectedChildId) {
      Alert.alert('Çocuk Seç', 'Çocuğa özel paylaşım için bir çocuk seçmelisin.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermen gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.75,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploading(true);
      const asset = result.assets[0];
      const { isVideo, extension, contentType } = getFileInfo(asset);
      const itemRef = push(dbRef(database, 'galeri'));
      const mediaId = itemRef.key;
      const createdAt = Date.now();
      const storagePath = `galeri/${kresId}/${mediaId}.${extension}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileRef = storageRef(storage, storagePath);
      await uploadBytes(fileRef, blob, { contentType });
      const url = await getDownloadURL(fileRef);

      await set(itemRef, {
        kresId,
        targetType: uploadTarget.targetType,
        classId: uploadTarget.classId || '',
        studentId: uploadTarget.studentId || '',
        sinifId: uploadTarget.classId || '',
        cocukId: uploadTarget.studentId || '',
        cocukIds: uploadTarget.cocukIds || [],
        hedef: uploadTarget.hedef,
        hedefAdi: uploadTarget.label,
        type: isVideo ? 'video' : 'image',
        url,
        storagePath,
        aciklama: caption.trim(),
        yukleyenId: userId || '',
        yukleyenAd: getUserName(kullanici),
        yukleyenRol: mode === 'admin' ? 'yonetici' : 'ogretmen',
        createdAt,
        expiresAt: createdAt + DAY_MS,
      });

      setCaption('');
      setSelectedClassId('');
      setSelectedChildId('');
      setTargetType(mode === 'teacher' ? 'all' : 'all');
      Alert.alert('Yüklendi', `${uploadTarget.label} için medya 24 saat boyunca galeride görünecek.`);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Galeri yüklemesi yapılamadı. Storage ayarlarını kontrol et.');
    } finally {
      setUploading(false);
    }
  }

  async function removeMedia(item, showAlert = true) {
    try {
      await remove(dbRef(database, `galeri/${item.id}`));
      if (item.storagePath) {
        await deleteObject(storageRef(storage, item.storagePath)).catch(() => null);
      }
      if (showAlert) Alert.alert('Silindi', 'Galeri kaydı kaldırıldı.');
    } catch (error) {
      console.error(error);
      if (showAlert) Alert.alert('Hata', 'Galeri kaydı silinemedi.');
    }
  }

  async function openMedia(item) {
    if (!item?.url) return;
    try {
      const supported = await Linking.canOpenURL(item.url);
      if (!supported) {
        Alert.alert('Video açılamadı', 'Bu video bağlantısı cihazda açılamıyor.');
        return;
      }
      await Linking.openURL(item.url);
    } catch (error) {
      console.error(error);
      Alert.alert('Video açılamadı', 'Video oynatıcı açılırken hata oluştu.');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.primary} size="large" />
        <Text style={styles.loadingText}>Galeri hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Geri</Text>
          </TouchableOpacity>
        ) : <View style={styles.backButton} />}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{roleLabel}</Text>
        </View>
        <Text style={styles.headerIcon}>🖼️</Text>
      </View>

      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canUpload ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fotoğraf / Video Yükle</Text>
            <Text style={styles.cardText}>Yüklenen medya 24 saat sonra otomatik gizlenir. Paylaşım hedefini tüm kurum, sınıf veya tek çocuk olarak seçebilirsin.</Text>

            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segment, targetType === 'all' && styles.segmentActive]}
                onPress={() => {
                  setTargetType('all');
                  setSelectedClassId('');
                  setSelectedChildId('');
                }}
              >
                <Text style={[styles.segmentText, targetType === 'all' && styles.segmentTextActive]}>{mode === 'teacher' ? 'Tüm Sınıf' : 'Tüm Kurum'}</Text>
              </TouchableOpacity>

              {mode === 'admin' ? (
                <TouchableOpacity
                  style={[styles.segment, targetType === 'class' && styles.segmentActive]}
                  onPress={() => {
                    setTargetType('class');
                    setSelectedChildId('');
                  }}
                >
                  <Text style={[styles.segmentText, targetType === 'class' && styles.segmentTextActive]}>Sınıf</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.segment, targetType === 'child' && styles.segmentActive]}
                onPress={() => {
                  setTargetType('child');
                  setSelectedClassId('');
                }}
              >
                <Text style={[styles.segmentText, targetType === 'child' && styles.segmentTextActive]}>Tek Çocuk</Text>
              </TouchableOpacity>
            </View>

            {targetType === 'class' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPicker}>
                {availableClasses.map((classItem) => (
                  <TouchableOpacity
                    key={classItem.id}
                    style={[styles.childChip, selectedClassId === classItem.id && styles.childChipActive]}
                    onPress={() => setSelectedClassId(classItem.id)}
                  >
                    <Text style={[styles.childChipText, selectedClassId === classItem.id && styles.childChipTextActive]}>{getClassName(classItem)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {targetType === 'child' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPicker}>
                {myChildren.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text style={[styles.childChipText, selectedChildId === child.id && styles.childChipTextActive]}>{getChildName(child)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.targetPreview}>
              <Text style={styles.targetPreviewText}>Hedef: {uploadTarget.label}</Text>
            </View>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Açıklama ekle (opsiyonel)"
              placeholderTextColor={THEME.muted}
              style={styles.input}
              multiline
            />

            <TouchableOpacity style={[styles.primaryButton, uploading && styles.disabledButton]} onPress={pickAndUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Galeriden Seç ve Yükle</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Aktif Galeri</Text>
        {visibleGallery.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyTitle}>Aktif galeri yok</Text>
            <Text style={styles.emptyDesc}>Son 24 saat içinde yüklenen fotoğraf veya video burada görünür.</Text>
          </View>
        ) : visibleGallery.map((item) => (
          <View key={item.id} style={styles.mediaCard}>
            {item.type === 'video' ? (
              <TouchableOpacity style={styles.videoBox} onPress={() => openMedia(item)} activeOpacity={0.86}>
                <Text style={styles.videoIcon}>▶️</Text>
                <Text style={styles.videoText}>Videoyu Aç</Text>
              </TouchableOpacity>
            ) : (
              <Image source={{ uri: item.url }} style={styles.mediaImage} resizeMode="cover" />
            )}
            <View style={styles.mediaBody}>
              <Text style={styles.mediaTitle}>{item.aciklama || item.hedefAdi || 'Galeri paylaşımı'}</Text>
              <Text style={styles.mediaMeta}>Hedef: {item.hedefAdi || normalizeTargetType(item)}</Text>
              <Text style={styles.mediaMeta}>Yükleyen: {item.yukleyenAd || getUserName(users[item.yukleyenId])}</Text>
              <Text style={styles.mediaMeta}>Yüklenme: {formatDateTime(item.createdAt)}</Text>
              <Text style={styles.remainingBadge}>⏳ {remainingText(item.expiresAt, now)}</Text>
              {canUpload ? (
                <TouchableOpacity style={styles.deleteButton} onPress={() => removeMedia(item, true)}>
                  <Text style={styles.deleteButtonText}>Sil</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 96 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '800' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: THEME.bg, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 74 },
  backText: { color: THEME.primary, fontWeight: '900', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: THEME.primary },
  headerSub: { fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: '700' },
  headerIcon: { width: 36, textAlign: 'right', fontSize: 22 },
  card: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  cardText: { color: THEME.muted, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  segmentRow: { flexDirection: 'row', backgroundColor: THEME.primarySoft, padding: 4, borderRadius: 16, marginTop: 14, gap: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 13 },
  segmentActive: { backgroundColor: THEME.primary },
  segmentText: { color: THEME.primary, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  segmentTextActive: { color: '#fff' },
  childPicker: { marginTop: 12 },
  childChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: '#F3F1FA', marginRight: 8, borderWidth: 1, borderColor: THEME.border },
  childChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  childChipText: { color: THEME.text, fontWeight: '800' },
  childChipTextActive: { color: '#fff' },
  targetPreview: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F1FA', borderRadius: 99, borderWidth: 1, borderColor: THEME.border },
  targetPreviewText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  input: { minHeight: 52, backgroundColor: '#FAF9FF', borderWidth: 1, borderColor: THEME.border, borderRadius: 16, padding: 12, color: THEME.text, fontWeight: '700', marginTop: 12 },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  disabledButton: { opacity: 0.65 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: THEME.text },
  emptyDesc: { fontSize: 13, color: THEME.muted, marginTop: 5, textAlign: 'center', lineHeight: 18 },
  mediaCard: { backgroundColor: THEME.card, borderRadius: 22, borderWidth: 1, borderColor: THEME.border, marginBottom: 14, overflow: 'hidden' },
  mediaImage: { width: '100%', height: 220, backgroundColor: THEME.primarySoft },
  videoBox: { height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191A23' },
  videoIcon: { fontSize: 42 },
  videoText: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 8 },
  mediaBody: { padding: 14 },
  mediaTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  mediaMeta: { color: THEME.muted, fontWeight: '700', marginTop: 4 },
  remainingBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: THEME.primarySoft, color: THEME.primary, borderRadius: 99, overflow: 'hidden', fontWeight: '900' },
  deleteButton: { alignSelf: 'flex-start', backgroundColor: '#FFE8EC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10 },
  deleteButtonText: { color: THEME.red, fontWeight: '900' },
});