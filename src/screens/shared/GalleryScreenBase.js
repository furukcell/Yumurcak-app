import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Video } from 'react-native-compressor';
import { VideoView, useVideoPlayer } from 'expo-video';
import { onValue, push, ref as dbRef, remove, set } from 'firebase/database';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { saveGalleryMediaToDevice } from '../../utils/saveGalleryMedia';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MEDIA_PER_POST = 10;
const MAX_VIDEO_PER_POST = 2;
const MAX_VIDEO_DURATION_MS = 120 * 1000;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1920;
const IMAGE_COMPRESS = 0.8;

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  dark: '#171821',
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
  const uriPart = String(asset?.uri || '').split('?')[0];
  const rawExt = uriPart.includes('.') ? uriPart.split('.').pop() : '';
  const extension = (rawExt || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
  const contentType = asset?.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
  return { isVideo, extension, contentType };
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

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getAssetDurationMs(asset) {
  const raw = Number(asset?.duration || asset?.durationMillis || 0);
  if (!raw) return 0;
  return raw > 1000 ? raw : raw * 1000;
}

function countVideoAssets(assets = []) {
  return assets.filter((asset) => getFileInfo(asset).isVideo).length;
}

async function optimizeImageAsset(asset) {
  const actions = [];

  if (asset?.width && Number(asset.width) > MAX_IMAGE_WIDTH) {
    actions.push({ resize: { width: MAX_IMAGE_WIDTH } });
  }

  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    actions,
    {
      compress: IMAGE_COMPRESS,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  const optimizedSize = await getLocalFileSize(result.uri);

  return {
    ...asset,
    uri: result.uri,
    width: result.width || asset.width,
    height: result.height || asset.height,
    mimeType: 'image/jpeg',
    fileName: `${String(asset.fileName || 'foto').split('.')[0]}_optimized.jpg`,
    fileSize: optimizedSize || asset.fileSize || 0,
    originalFileSize: asset.fileSize || 0,
    optimized: true,
  };
}

async function optimizeVideoAsset(asset, onProgress) {
  const durationMs = getAssetDurationMs(asset);

  if (durationMs && durationMs > MAX_VIDEO_DURATION_MS) {
    throw new Error('Video süresi en fazla 2 dakika olabilir. Lütfen daha kısa bir video seç.');
  }

  const originalSize = asset.fileSize || await getLocalFileSize(asset.uri);

  const compressedUri = await Video.compress(
    asset.uri,
    {
      compressionMethod: 'auto',
      maxSize: 1280,
    },
    (progress) => {
      if (typeof onProgress === 'function') onProgress(progress);
    }
  );

  const optimizedSize = await getLocalFileSize(compressedUri);

  if (optimizedSize && optimizedSize > MAX_VIDEO_SIZE_BYTES) {
    throw new Error(`Video optimize edildi ama hâlâ çok büyük (${formatFileSize(optimizedSize)}). Lütfen daha kısa bir video seç.`);
  }

  return {
    ...asset,
    uri: compressedUri,
    type: 'video',
    mimeType: 'video/mp4',
    fileName: `${String(asset.fileName || 'video').split('.')[0]}_optimized.mp4`,
    fileSize: optimizedSize || originalSize || 0,
    originalFileSize: originalSize || 0,
    optimized: true,
  };
}

async function optimizeGalleryAsset(asset, onProgress) {
  const { isVideo } = getFileInfo(asset);
  if (isVideo) return optimizeVideoAsset(asset, onProgress);
  return optimizeImageAsset(asset);
}

function readAssetAsBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Medya dosyası okunamadı.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
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

function normalizeMediaItems(item) {
  const mediaItems = asArray(item?.mediaItems)
    .map((media) => safeObject(media))
    .filter((media) => media.url)
    .map((media, index) => ({
      id: media.id || `${item?.id || 'media'}-${index}`,
      type: media.type === 'video' ? 'video' : 'image',
      url: media.url,
      thumbnailUrl: media.thumbnailUrl || '',
      storagePath: media.storagePath || '',
      fileName: media.fileName || '',
    }));

  if (mediaItems.length > 0) return mediaItems;
  if (!item?.url) return [];

  return [{
    id: `${item?.id || 'legacy'}-0`,
    type: item.type === 'video' ? 'video' : 'image',
    url: item.url,
    thumbnailUrl: item.thumbnailUrl || '',
    storagePath: item.storagePath || '',
    fileName: item.fileName || '',
  }];
}

function getGalleryTitle(item) {
  return item?.baslik || item?.title || item?.aciklama || item?.hedefAdi || 'Galeri paylaşımı';
}

function GalleryVideoPlayer({ uri }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = false;
  });

  useEffect(() => {
    return () => {
      try {
        player?.pause?.();
      } catch (error) {}
    };
  }, [player]);

  if (!uri) {
    return (
      <View style={styles.videoPlayerFallback}>
        <Text style={styles.videoViewerIcon}>▶</Text>
        <Text style={styles.videoViewerTitle}>Video bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoPlayerFrame}>
      <VideoView player={player} style={styles.videoPlayer} nativeControls allowsFullscreen allowsPictureInPicture contentFit="contain" />
    </View>
  );
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
  const [uploadStatus, setUploadStatus] = useState('');
  const [savingMediaId, setSavingMediaId] = useState('');
  const [caption, setCaption] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [viewerItem, setViewerItem] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);

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
    if (mode === 'parent') return children.filter((child) => includesId(child.veliIds, userId) || child.veliId === userId || child.parentId === userId);
    if (mode === 'teacher') return currentClass?.id ? children.filter((child) => child.sinifId === currentClass.id) : [];
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
      .filter((item) => normalizeMediaItems(item).length > 0)
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
      return { hedef: 'cocuk', targetType: 'student', classId: child?.sinifId || null, studentId: child?.id || null, cocukIds: child ? [child.id] : [], label: child ? getChildName(child) : 'Seçili çocuk' };
    }
    if (targetType === 'class' && selectedClassId) {
      const classItem = availableClasses.find((item) => item.id === selectedClassId);
      const classChildren = myChildren.filter((child) => child.sinifId === selectedClassId);
      return { hedef: 'sinif', targetType: 'class', classId: selectedClassId, studentId: null, cocukIds: classChildren.map((child) => child.id), label: classItem ? getClassName(classItem) : 'Seçili sınıf' };
    }
    if (mode === 'teacher') return { hedef: 'sinif', targetType: 'class', classId: currentClass?.id || null, studentId: null, cocukIds: myChildren.map((child) => child.id), label: currentClass ? getClassName(currentClass) : 'Tüm sınıf' };
    return { hedef: 'kurum', targetType: 'school', classId: null, studentId: null, cocukIds: myChildren.map((child) => child.id), label: 'Tüm kurum' };
  }, [availableClasses, currentClass, mode, myChildren, selectedChildId, selectedClassId, targetType]);

  async function pickAndUpload() {
    if (!canUpload) return;
    if (!kresId) return Alert.alert('Eksik Bilgi', 'Kreş bilgisi bulunamadı. Önce kullanıcı/kresId bağlantısını kontrol et.');
    if (targetType === 'class' && !selectedClassId) return Alert.alert('Sınıf Seç', 'Sınıfa özel paylaşım için bir sınıf seçmelisin.');
    if (targetType === 'child' && !selectedChildId) return Alert.alert('Çocuk Seç', 'Çocuğa özel paylaşım için bir çocuk seçmelisin.');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermen gerekiyor.');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.78,
        videoMaxDuration: 120,
      });

      const assets = result.canceled ? [] : (result.assets || []).filter((asset) => asset?.uri);
      if (assets.length === 0) return;
      if (assets.length > MAX_MEDIA_PER_POST) {
      return Alert.alert('Çok Fazla Medya', `Tek paylaşımda en fazla ${MAX_MEDIA_PER_POST} medya seçebilirsin.`);
    }

      const videoCount = countVideoAssets(assets);
      if (videoCount > MAX_VIDEO_PER_POST) {
      return Alert.alert('Çok Fazla Video', `Tek paylaşımda en fazla ${MAX_VIDEO_PER_POST} video seçebilirsin.`);
    }

      const longVideo = assets.find((asset) => getFileInfo(asset).isVideo && getAssetDurationMs(asset) > MAX_VIDEO_DURATION_MS);
      if (longVideo) {
       return Alert.alert('Video Çok Uzun', 'Video süresi en fazla 2 dakika olabilir. Lütfen daha kısa bir video seç.');
    }

      setUploading(true);
      const itemRef = push(dbRef(database, 'galeri'));
      const galleryId = itemRef.key;
      const createdAt = Date.now();
      const mediaItems = [];

     for (let index = 0; index < assets.length; index += 1) {
     const rawAsset = assets[index];
     const rawInfo = getFileInfo(rawAsset);

  setUploadStatus(
    rawInfo.isVideo
      ? `Video optimize ediliyor... (${index + 1}/${assets.length})`
      : `Fotoğraf hazırlanıyor... (${index + 1}/${assets.length})`
  );

  const asset = await optimizeGalleryAsset(rawAsset, (progress) => {
    if (rawInfo.isVideo) {
      const percent = Math.round(Number(progress || 0) * 100);
      setUploadStatus(`Video optimize ediliyor... %${percent}`);
    }
  });

  const { isVideo, extension, contentType } = getFileInfo(asset);
  const mediaId = `${galleryId}-${index}`;
  const storagePath = `galeri/${kresId}/${galleryId}/${mediaId}.${extension}`;

  setUploadStatus(`Medya yükleniyor... (${index + 1}/${assets.length})`);

  const blob = await readAssetAsBlob(asset.uri);
  const fileRef = storageRef(storage, storagePath);
  await uploadBytes(fileRef, blob, { contentType });
  const url = await getDownloadURL(fileRef);

  mediaItems.push({
    id: mediaId,
    type: isVideo ? 'video' : 'image',
    url,
    thumbnailUrl: '',
    storagePath,
    fileName: asset.fileName || `${mediaId}.${extension}`,
    fileSize: asset.fileSize || 0,
    originalFileSize: asset.originalFileSize || rawAsset.fileSize || 0,
    optimized: asset.optimized === true,
  });
}

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
        type: mediaItems[0]?.type || 'image',
        url: mediaItems[0]?.url || '',
        storagePath: mediaItems[0]?.storagePath || '',
        mediaItems,
        mediaCount: mediaItems.length,
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
      setTargetType('all');
      Alert.alert('Yüklendi', `${uploadTarget.label} için ${mediaItems.length} medya 24 saat boyunca galeride görünecek.`);
    } catch (error) {
      console.error('Galeri yüklemesi yapılamadı:', error?.code || error?.message || error);
      Alert.alert('Hata', `Galeri yüklemesi yapılamadı. ${error?.code || error?.message || 'Storage ayarlarını kontrol et.'}`);
    } finally {
       setUploadStatus('');
       setUploading(false);
    }
  }

  async function removeMedia(item, showAlert = true) {
    try {
      const mediaItems = normalizeMediaItems(item);
      await remove(dbRef(database, `galeri/${item.id}`));
      await Promise.all(mediaItems.map((media) => media.storagePath ? deleteObject(storageRef(storage, media.storagePath)).catch(() => null) : Promise.resolve(null)));
      if (item.storagePath) await deleteObject(storageRef(storage, item.storagePath)).catch(() => null);
      if (showAlert) Alert.alert('Silindi', 'Galeri kaydı kaldırıldı.');
    } catch (error) {
      console.error(error);
      if (showAlert) Alert.alert('Hata', 'Galeri kaydı silinemedi.');
    }
  }

  function openViewer(item, index = 0) {
    setViewerItem(item);
    setViewerIndex(index);
  }

  function closeViewer() {
    setViewerItem(null);
    setViewerIndex(0);
  }

  async function saveMedia(media) {
    if (!media?.url || savingMediaId) return;

    try {
      setSavingMediaId(media.id || media.url);
      await saveGalleryMediaToDevice(media);
      Alert.alert('Kaydedildi', media.type === 'video' ? 'Video telefon galerisine kaydedildi.' : 'Fotoğraf telefon galerisine kaydedildi.');
    } catch (error) {
      console.error('Galeri medyası kaydedilemedi:', error?.message || error);
      if (error?.code === 'permission-denied') {
        Alert.alert('İzin Gerekli', 'Medyanın telefona kaydedilebilmesi için galeri izni vermen gerekiyor.');
        return;
      }
      Alert.alert('Kaydedilemedi', 'Medya telefona kaydedilemedi. Lütfen izinleri ve internet bağlantısını kontrol et.');
    } finally {
      setSavingMediaId('');
    }
  }

  function renderMediaTile(item, media, index, total) {
    const hiddenCount = total > 4 && index === 3 ? total - 4 : 0;
    const isVideo = media.type === 'video';
    return (
      <TouchableOpacity key={media.id || `${item.id}-${index}`} style={[styles.gridTile, total === 1 && styles.singleTile, total === 3 && index === 0 && styles.largeTile]} onPress={() => openViewer(item, index)} activeOpacity={0.88}>
        {isVideo ? (
          <View style={styles.videoTile}><Text style={styles.playIcon}>▶</Text><Text style={styles.videoTileText}>Video</Text></View>
        ) : (
          <Image source={{ uri: media.thumbnailUrl || media.url }} style={styles.tileImage} resizeMode="cover" />
        )}
        {hiddenCount > 0 ? <View style={styles.moreOverlay}><Text style={styles.moreText}>+{hiddenCount}</Text></View> : null}
      </TouchableOpacity>
    );
  }

  function renderPreviewGrid(item) {
    const mediaItems = normalizeMediaItems(item);
    const previewItems = mediaItems.slice(0, 4);
    const count = mediaItems.length;
    if (count === 1) return <View style={styles.singleGrid}>{renderMediaTile(item, previewItems[0], 0, count)}</View>;
    if (count === 3) {
      return (
        <View style={styles.threeGrid}>
          <View style={styles.threeLeft}>{renderMediaTile(item, previewItems[0], 0, count)}</View>
          <View style={styles.threeRight}>{renderMediaTile(item, previewItems[1], 1, count)}{renderMediaTile(item, previewItems[2], 2, count)}</View>
        </View>
      );
    }
    return <View style={styles.gridWrap}>{previewItems.map((media, index) => renderMediaTile(item, media, index, count))}</View>;
  }

  function renderViewer() {
    const mediaItems = normalizeMediaItems(viewerItem);
    const media = mediaItems[viewerIndex] || mediaItems[0];
    if (!viewerItem || !media) return null;
    const isVideo = media.type === 'video';
    const isSaving = savingMediaId === (media.id || media.url);
    return (
      <Modal visible={!!viewerItem} transparent animationType="fade" onRequestClose={closeViewer}>
        <SafeAreaView style={styles.viewerBackdrop}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerTopButton} onPress={closeViewer}><Text style={styles.viewerTopButtonText}>Kapat</Text></TouchableOpacity>
            <Text style={styles.viewerCounter}>{viewerIndex + 1} / {mediaItems.length}</Text>
            <TouchableOpacity style={[styles.viewerTopButton, isSaving && styles.viewerTopButtonDisabled]} onPress={() => saveMedia(media)} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.viewerTopButtonText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.viewerStage}>{isVideo ? <GalleryVideoPlayer uri={media.url} /> : <Image source={{ uri: media.url }} style={styles.viewerImage} resizeMode="contain" />}</View>
          {mediaItems.length > 1 ? (
            <View style={styles.viewerNavRow}>
              <TouchableOpacity style={[styles.viewerNavButton, viewerIndex === 0 && styles.viewerNavButtonDisabled]} disabled={viewerIndex === 0} onPress={() => setViewerIndex((index) => Math.max(index - 1, 0))}><Text style={styles.viewerNavText}>‹ Önceki</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.viewerNavButton, viewerIndex === mediaItems.length - 1 && styles.viewerNavButtonDisabled]} disabled={viewerIndex === mediaItems.length - 1} onPress={() => setViewerIndex((index) => Math.min(index + 1, mediaItems.length - 1))}><Text style={styles.viewerNavText}>Sonraki ›</Text></TouchableOpacity>
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewerThumbRow} contentContainerStyle={styles.viewerThumbContent}>
            {mediaItems.map((thumb, index) => (
              <TouchableOpacity key={thumb.id || index} style={[styles.viewerThumb, viewerIndex === index && styles.viewerThumbActive]} onPress={() => setViewerIndex(index)}>
                {thumb.type === 'video' ? <Text style={styles.viewerThumbVideo}>▶</Text> : <Image source={{ uri: thumb.thumbnailUrl || thumb.url }} style={styles.viewerThumbImage} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
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
        {navigation?.canGoBack?.() ? <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹ Geri</Text></TouchableOpacity> : <View style={styles.backButton} />}
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSub}>{roleLabel}</Text></View>
        <Text style={styles.headerIcon}>🖼️</Text>
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canUpload ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Galeriye Paylaş</Text>
            <Text style={styles.cardText}>Tek fotoğraf, çoklu fotoğraf veya video seçebilirsin. Paylaşımlar 24 saat sonra otomatik gizlenir.</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity style={[styles.segment, targetType === 'all' && styles.segmentActive]} onPress={() => { setTargetType('all'); setSelectedClassId(''); setSelectedChildId(''); }}><Text style={[styles.segmentText, targetType === 'all' && styles.segmentTextActive]}>{mode === 'teacher' ? 'Tüm Sınıf' : 'Tüm Kurum'}</Text></TouchableOpacity>
              {mode === 'admin' ? <TouchableOpacity style={[styles.segment, targetType === 'class' && styles.segmentActive]} onPress={() => { setTargetType('class'); setSelectedChildId(''); }}><Text style={[styles.segmentText, targetType === 'class' && styles.segmentTextActive]}>Sınıf</Text></TouchableOpacity> : null}
              <TouchableOpacity style={[styles.segment, targetType === 'child' && styles.segmentActive]} onPress={() => { setTargetType('child'); setSelectedClassId(''); }}><Text style={[styles.segmentText, targetType === 'child' && styles.segmentTextActive]}>Tek Çocuk</Text></TouchableOpacity>
            </View>
            {targetType === 'class' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPicker}>{availableClasses.map((classItem) => <TouchableOpacity key={classItem.id} style={[styles.childChip, selectedClassId === classItem.id && styles.childChipActive]} onPress={() => setSelectedClassId(classItem.id)}><Text style={[styles.childChipText, selectedClassId === classItem.id && styles.childChipTextActive]}>{getClassName(classItem)}</Text></TouchableOpacity>)}</ScrollView> : null}
            {targetType === 'child' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPicker}>{myChildren.map((child) => <TouchableOpacity key={child.id} style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]} onPress={() => setSelectedChildId(child.id)}><Text style={[styles.childChipText, selectedChildId === child.id && styles.childChipTextActive]}>{getChildName(child)}</Text></TouchableOpacity>)}</ScrollView> : null}
            <View style={styles.targetPreview}><Text style={styles.targetPreviewText}>Hedef: {uploadTarget.label}</Text></View>
            <TextInput value={caption} onChangeText={setCaption} placeholder="Başlık / açıklama ekle (opsiyonel)" placeholderTextColor={THEME.muted} style={styles.input} multiline />
            <TouchableOpacity style={[styles.primaryButton, uploading && styles.disabledButton]} onPress={pickAndUpload} disabled={uploading}>
            {uploading ? (
            <View style={styles.uploadingButtonContent}>
            <ActivityIndicator color="#fff" />
           <Text style={styles.primaryButtonText}>{uploadStatus || 'Medya hazırlanıyor...'}</Text>
           </View>
       ) : (
           <Text style={styles.primaryButtonText}>Fotoğraf / Video Seç ve Yükle</Text>
       )}
           </TouchableOpacity>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>Aktif Galeri</Text>
        {visibleGallery.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyIcon}>🖼️</Text><Text style={styles.emptyTitle}>Aktif galeri yok</Text><Text style={styles.emptyDesc}>Son 24 saat içinde yüklenen fotoğraf veya video burada görünür.</Text></View>
        ) : visibleGallery.map((item) => {
          const mediaItems = normalizeMediaItems(item);
          return (
            <View key={item.id} style={styles.mediaCard}>
              {renderPreviewGrid(item)}
              <View style={styles.mediaBody}>
                <View style={styles.mediaTitleRow}><Text style={styles.mediaTitle} numberOfLines={2}>{getGalleryTitle(item)}</Text><View style={styles.countBadge}><Text style={styles.countBadgeText}>{mediaItems.length} medya</Text></View></View>
                <Text style={styles.mediaMeta}>Hedef: {item.hedefAdi || normalizeTargetType(item)}</Text>
                <Text style={styles.mediaMeta}>Yükleyen: {item.yukleyenAd || getUserName(users[item.yukleyenId])}</Text>
                <Text style={styles.mediaMeta}>Yüklenme: {formatDateTime(item.createdAt)}</Text>
                <View style={styles.actionRow}><Text style={styles.remainingBadge}>⏳ {remainingText(item.expiresAt, now)}</Text><TouchableOpacity style={styles.openButton} onPress={() => openViewer(item, 0)}><Text style={styles.openButtonText}>Aç</Text></TouchableOpacity></View>
                {canUpload ? <TouchableOpacity style={styles.deleteButton} onPress={() => removeMedia(item, true)}><Text style={styles.deleteButtonText}>Sil</Text></TouchableOpacity> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {renderViewer()}
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
  card: { backgroundColor: THEME.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  cardText: { color: THEME.muted, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  segmentRow: { flexDirection: 'row', backgroundColor: THEME.primarySoft, padding: 4, borderRadius: 16, marginTop: 14 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 13, marginHorizontal: 2 },
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
  uploadingButtonContent: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabledButton: { opacity: 0.65 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: THEME.text },
  emptyDesc: { fontSize: 13, color: THEME.muted, marginTop: 5, textAlign: 'center', lineHeight: 18 },
  mediaCard: { backgroundColor: THEME.card, borderRadius: 26, borderWidth: 1, borderColor: THEME.border, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  singleGrid: { height: 250, backgroundColor: THEME.primarySoft },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', height: 250, backgroundColor: THEME.primarySoft },
  threeGrid: { flexDirection: 'row', height: 250, backgroundColor: THEME.primarySoft },
  threeLeft: { flex: 1.15, marginRight: 2 },
  threeRight: { flex: 0.85 },
  gridTile: { width: '50%', height: 125, borderWidth: 1, borderColor: '#fff', overflow: 'hidden', backgroundColor: THEME.dark },
  singleTile: { width: '100%', height: '100%', borderWidth: 0 },
  largeTile: { width: '100%', height: '100%' },
  tileImage: { width: '100%', height: '100%' },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.dark },
  playIcon: { color: '#fff', fontSize: 36, fontWeight: '900' },
  videoTileText: { color: '#fff', fontWeight: '900', marginTop: 6 },
  moreOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)' },
  moreText: { color: '#fff', fontWeight: '900', fontSize: 34 },
  mediaBody: { padding: 14 },
  mediaTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  mediaTitle: { flex: 1, color: THEME.text, fontWeight: '900', fontSize: 17, paddingRight: 8 },
  countBadge: { backgroundColor: THEME.primarySoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  countBadgeText: { color: THEME.primary, fontWeight: '900', fontSize: 11 },
  mediaMeta: { color: THEME.muted, fontWeight: '700', marginTop: 5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  remainingBadge: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: THEME.primarySoft, color: THEME.primary, borderRadius: 99, overflow: 'hidden', fontWeight: '900' },
  openButton: { backgroundColor: THEME.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 9 },
  openButtonText: { color: '#fff', fontWeight: '900' },
  deleteButton: { alignSelf: 'flex-start', backgroundColor: '#FFE8EC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10 },
  deleteButtonText: { color: THEME.red, fontWeight: '900' },
  viewerBackdrop: { flex: 1, backgroundColor: '#050508' },
  viewerHeader: { paddingHorizontal: 14, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerTopButton: { minWidth: 74, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  viewerTopButtonDisabled: { opacity: 0.55 },
  viewerTopButtonText: { color: '#fff', fontWeight: '900' },
  viewerCounter: { color: '#fff', fontWeight: '900' },
  viewerStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerNavRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  viewerNavButton: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
  viewerNavButtonDisabled: { opacity: 0.35 },
  viewerNavText: { color: '#fff', fontWeight: '900' },
  viewerThumbRow: { maxHeight: 78, paddingBottom: 14 },
  viewerThumbContent: { paddingHorizontal: 12 },
  viewerThumb: { width: 58, height: 58, borderRadius: 14, overflow: 'hidden', backgroundColor: '#171821', marginRight: 8, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  viewerThumbActive: { borderColor: THEME.orange },
  viewerThumbImage: { width: '100%', height: '100%' },
  viewerThumbVideo: { color: '#fff', fontWeight: '900', fontSize: 20 },
  videoPlayerFrame: { width: '100%', height: '100%', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  videoPlayer: { width: '100%', height: '100%' },
  videoPlayerFallback: { width: '86%', borderRadius: 28, padding: 24, backgroundColor: '#171821', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  videoViewerIcon: { color: '#fff', fontSize: 52, fontWeight: '900' },
  videoViewerTitle: { color: '#fff', fontWeight: '900', fontSize: 22, marginTop: 14 },
});
