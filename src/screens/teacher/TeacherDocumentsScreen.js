// ============================================================
// YUMURCAK — TeacherDocumentsScreen.js
// Öğretmen A4 belge fotoğrafı yükleme ekranı
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { onValue, ref, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { database, storage } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { THEME, useTeacherData, ScreenHeader, LoadingState, EmptyState } from './teacherShared';
import AppSuccessToast from '../../components/AppSuccessToast';

const MAX_DOCUMENT_SIZE_MB = 8;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
const DOCUMENT_IMAGE_MAX_WIDTH = 2000;
const DOCUMENT_IMAGE_COMPRESS = 0.82;

const DOCUMENT_TYPES = [
  { key: 'yemekListesi', icon: '🍽️', title: 'Yemek Listesi', desc: 'A4 yemek listesi fotoğrafı yükle' },
  { key: 'dersProgrami', icon: '📚', title: 'Ders Programı', desc: 'A4 ders programı fotoğrafı yükle' },
];

function makeDocumentId(sinifId, type) {
  return `${String(sinifId || 'sinif').replace(/[.#$\[\]/]/g, '_')}_${type}`;
}

function formatDateTime(value) {
  if (!value) return 'Henüz yüklenmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Henüz yüklenmedi';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

async function getLocalFileSize(uri) {
  if (!uri) return 0;
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return Number(info?.size || 0);
  } catch (error) {
    return 0;
  }
}

async function optimizeDocumentImage(asset) {
  const width = Number(asset?.width || 0);
  const height = Number(asset?.height || 0);
  const longestSide = Math.max(width, height);
  const actions = [];

  if (longestSide > DOCUMENT_IMAGE_MAX_WIDTH) {
    if (height >= width) actions.push({ resize: { height: DOCUMENT_IMAGE_MAX_WIDTH } });
    else actions.push({ resize: { width: DOCUMENT_IMAGE_MAX_WIDTH } });
  }

  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    actions,
    {
      compress: DOCUMENT_IMAGE_COMPRESS,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  const optimizedSize = await getLocalFileSize(result.uri);
  const originalSize = asset?.fileSize || await getLocalFileSize(asset.uri);

  return {
    ...asset,
    uri: result.uri,
    width: result.width || asset.width,
    height: result.height || asset.height,
    mimeType: 'image/jpeg',
    fileName: `${String(asset.fileName || 'dokuman').split('.')[0]}_optimized.jpg`,
    fileSize: optimizedSize || originalSize || 0,
    originalFileSize: originalSize || 0,
    optimized: true,
  };
}

function readAssetAsBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Belge fotoğrafı okunamadı.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export default function TeacherDocumentsScreen() {
  const navigation = useNavigation();
  const { loading, teacherId, kresId, currentClass } = useTeacherData();
  const [documents, setDocuments] = useState({});
  const [selectedType, setSelectedType] = useState('yemekListesi');
  const [uploading, setUploading] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const r = ref(database, 'dokumanlar');
    const unsub = onValue(r, (snap) => setDocuments(snap.val() || {}), () => setDocuments({}));
    return () => unsub();
  }, []);

  const classDocuments = useMemo(() => {
    if (!currentClass?.id) return {};
    const result = {};

    Object.entries(documents || {}).forEach(([id, item]) => {
      if (item?.aktif === false) return;
      if (item?.sinifId !== currentClass.id) return;
      if (kresId && item?.kresId && item.kresId !== kresId) return;
      result[item.type || item.tip || id] = { id, ...item };
    });

    return result;
  }, [documents, currentClass?.id, kresId]);

  if (loading) return <LoadingState text="Dokümanlar hazırlanıyor..." />;

  const selectedConfig = DOCUMENT_TYPES.find((item) => item.key === selectedType) || DOCUMENT_TYPES[0];
  const selectedDocument = classDocuments[selectedType] || null;

  const pickDocumentImage = async (source) => {
    if (!currentClass?.id) {
      Alert.alert('Sınıf bulunamadı', 'Belge yüklemek için öğretmenin bir sınıfa atanması gerekiyor.');
      return;
    }

    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('İzin Gerekli', source === 'camera' ? 'Kamera kullanımı için izin vermelisin.' : 'Galeriden belge fotoğrafı seçmek için izin vermelisin.');
        return;
      }

      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      await uploadDocument(result.assets[0]);
    } catch (err) {
      console.error('Belge seçme hatası:', err?.code || err?.message || err);
      Alert.alert('Hata', 'Belge fotoğrafı seçilemedi.');
    }
  };

  const uploadDocument = async (asset) => {
    setUploading(true);

    try {
      const finalKresId = kresId || currentClass?.kresId || 'kres';
      const finalSinifId = currentClass?.id || 'sinif';
      const now = Date.now();
      const optimizedAsset = await optimizeDocumentImage(asset);

      if (optimizedAsset.fileSize && optimizedAsset.fileSize > MAX_DOCUMENT_SIZE_BYTES) {
        Alert.alert(
          'Dosya Büyük',
          `Belge fotoğrafı sıkıştırıldı ama hâlâ çok büyük (${formatFileSize(optimizedAsset.fileSize)}). Lütfen biraz daha uzaktan değil, daha net ve sadece A4 kağıdı kadraja alarak tekrar çek.`
        );
        setUploading(false);
        return;
      }

      const blob = await readAssetAsBlob(optimizedAsset.uri);

      if (blob?.size && blob.size > MAX_DOCUMENT_SIZE_BYTES) {
        Alert.alert(
          'Dosya Büyük',
          `Belge fotoğrafı sıkıştırıldı ama hâlâ çok büyük (${formatFileSize(blob.size)}). Maksimum sınır ${MAX_DOCUMENT_SIZE_MB} MB.`
        );
        setUploading(false);
        return;
      }

      const fileName = `${selectedType}_${now}.jpg`;
      const filePath = `dokumanlar/${finalKresId}/${finalSinifId}/${fileName}`;
      const fileRef = storageRef(storage, filePath);
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(fileRef);

      const documentId = makeDocumentId(finalSinifId, selectedType);
      await set(ref(database, `dokumanlar/${documentId}`), {
        kresId: finalKresId,
        sinifId: finalSinifId,
        sinifAdi: currentClass?.ad || '',
        type: selectedType,
        baslik: selectedConfig.title,
        aciklama: selectedConfig.desc,
        belgeUrl: url,
        belgePath: filePath,
        mimeType: 'image/jpeg',
        sizeBytes: blob?.size || optimizedAsset.fileSize || 0,
        originalSizeBytes: optimizedAsset.originalFileSize || asset?.fileSize || 0,
        compressed: true,
        maxSizeMb: MAX_DOCUMENT_SIZE_MB,
        olusturanId: teacherId || '',
        olusturanRol: 'ogretmen',
        aktif: true,
        updatedAt: now,
        createdAt: selectedDocument?.createdAt || now,
      });

      setSuccessToast(true);
    } catch (err) {
      console.error('Belge yükleme hatası:', err?.code || err?.message || err);
      Alert.alert('Hata', `Belge yüklenemedi. ${err?.code || err?.message || 'İnternet bağlantısını kontrol et.'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppSuccessToast visible={successToast} message={`${selectedConfig.title} yüklendi`} onHide={() => setSuccessToast(false)} />
      <ScreenHeader navigation={navigation} title="Dokümanlar" subtitle={currentClass?.ad || 'Sınıfım'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!currentClass ? (
          <EmptyState icon="🏫" title="Sınıf ataması yok" desc="Doküman yüklemek için öğretmenin bir sınıfa atanması gerekir." />
        ) : (
          <>
            <Text style={styles.infoText}>A4 kağıdı fotoğraf olarak yükle. Fotoğraf önce okunaklı kalacak şekilde sıkıştırılır, sonra yüklenir. Maksimum yükleme sınırı: {MAX_DOCUMENT_SIZE_MB} MB.</Text>

            <View style={styles.cardGrid}>
              {DOCUMENT_TYPES.map((item) => {
                const doc = classDocuments[item.key];
                const active = selectedType === item.key;
                return (
                  <TouchableOpacity key={item.key} style={[styles.typeCard, active && styles.typeCardActive]} onPress={() => setSelectedType(item.key)} activeOpacity={0.85}>
                    <Text style={styles.typeIcon}>{item.icon}</Text>
                    <Text style={styles.typeTitle}>{item.title}</Text>
                    <Text style={styles.typeDesc}>{doc?.belgeUrl ? 'Yüklendi' : 'Henüz belge yok'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.uploadCard}>
              <Text style={styles.uploadTitle}>{selectedConfig.icon} {selectedConfig.title}</Text>
              <Text style={styles.uploadDesc}>{selectedDocument?.belgeUrl ? `Son güncelleme: ${formatDateTime(selectedDocument.updatedAt)}` : 'Henüz belge yüklenmedi.'}</Text>

              {selectedDocument?.belgeUrl ? (
                <TouchableOpacity onPress={() => setPreviewUrl(selectedDocument.belgeUrl)} activeOpacity={0.9}>
                  <Image source={{ uri: selectedDocument.belgeUrl }} style={styles.documentImage} resizeMode="contain" />
                  <Text style={styles.previewHint}>Büyütmek için belgeye dokun</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyDocumentBox}>
                  <Text style={styles.emptyIcon}>📄</Text>
                  <Text style={styles.emptyTitle}>Belge bekleniyor</Text>
                  <Text style={styles.emptyDesc}>Galeriden seç veya kamera ile A4 kağıdın fotoğrafını çek.</Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionButton} onPress={() => pickDocumentImage('gallery')} disabled={uploading} activeOpacity={0.85}>
                  <Text style={styles.actionText}>🖼️ Galeri</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => pickDocumentImage('camera')} disabled={uploading} activeOpacity={0.85}>
                  <Text style={styles.actionText}>📷 Kamera</Text>
                </TouchableOpacity>
              </View>

              {uploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator color={THEME.primary} />
                  <Text style={styles.uploadingText}>Belge sıkıştırılıyor ve yükleniyor...</Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl('')}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewUrl('')} activeOpacity={0.85}>
            <Text style={styles.modalCloseText}>Kapat</Text>
          </TouchableOpacity>
          {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.modalImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 70 },
  infoText: { color: THEME.muted, fontWeight: '700', lineHeight: 19, marginBottom: 14 },
  cardGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeCard: { flex: 1, backgroundColor: THEME.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  typeCardActive: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  typeIcon: { fontSize: 30, marginBottom: 8 },
  typeTitle: { color: THEME.text, fontWeight: '900', textAlign: 'center' },
  typeDesc: { color: THEME.muted, fontWeight: '700', fontSize: 11, marginTop: 4, textAlign: 'center' },
  uploadCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 15, borderWidth: 1, borderColor: THEME.border },
  uploadTitle: { color: THEME.primary, fontWeight: '900', fontSize: 18 },
  uploadDesc: { color: THEME.muted, fontWeight: '700', marginTop: 5, marginBottom: 12 },
  documentImage: { width: '100%', aspectRatio: 0.707, borderRadius: 18, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border },
  previewHint: { color: THEME.primary, fontWeight: '900', textAlign: 'center', marginTop: 8, marginBottom: 4 },
  emptyDocumentBox: { minHeight: 250, backgroundColor: THEME.bg, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center', padding: 18 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: THEME.text, fontWeight: '900', marginTop: 8, fontSize: 16 },
  emptyDesc: { color: THEME.muted, fontWeight: '700', textAlign: 'center', marginTop: 5, lineHeight: 18 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1, backgroundColor: THEME.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  actionText: { color: '#FFF', fontWeight: '900' },
  uploadingBox: { marginTop: 12, alignItems: 'center' },
  uploadingText: { color: THEME.muted, fontWeight: '700', marginTop: 8, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', padding: 14, justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 44, right: 18, zIndex: 10, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 9, paddingHorizontal: 14 },
  modalCloseText: { color: THEME.text, fontWeight: '900' },
  modalImage: { width: '100%', height: '86%' },
});