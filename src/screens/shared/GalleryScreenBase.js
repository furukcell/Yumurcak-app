import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import InAppMediaPicker from '../../components/InAppMediaPicker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Video } from 'react-native-compressor';
import { VideoView, useVideoPlayer } from 'expo-video';
import { onValue, push, query, orderByChild, equalTo, ref as dbRef, remove, set } from 'firebase/database';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { database, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { saveGalleryMediaToDevice } from '../../utils/saveGalleryMedia';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MEDIA_PER_POST = 20;
const MAX_VIDEO_PER_POST = 5;
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

function indexIds(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .filter(([, value]) => value !== false && value !== null)
    .map(([id]) => id);
}

function listenValue(path, onData, onError) {
  const r = dbRef(database, path);
  return onValue(
    r,
    (snapshot) => onData(snapshot.val()),
    () => {
      if (typeof onError === 'function') onError();
    }
  );
}

// Index boşsa/eksikse artık tüm node çekilmiyor. Sadece bilinen kresId'ye göre
// sorgulanıyor — index gerçekten boşsa (o kreşte veri yoksa) sonuç zaten boş döner,
// tüm tabloyu taramaya gerek kalmaz.
function listenByKresId(path, kresId, onData, onError) {
  if (!kresId) {
    onData(null);
    return () => {};
  }
  const q = query(dbRef(database, path), orderByChild('kresId'), equalTo(kresId));
  return onValue(q, (snapshot) => onData(snapshot.val()), () => {
    if (typeof onError === 'function') onError();
  });
}

function uniqueIds(values) {
  return Array.from(new Set(values.filter(Boolean).map((id) => String(id))));
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
  const rawType = String(asset?.type || asset?.mediaType || '').toLowerCase();
  const mimeType = String(asset?.mimeType || '').toLowerCase();
  const uriPart = String(asset?.uri || '').split('?')[0];
  const fileNamePart = String(asset?.fileName || '').split('?')[0];
  const combined = `${uriPart} ${fileNamePart}`.toLowerCase();

  const isVideo =
    rawType === 'video' ||
    mimeType.startsWith('video/') ||
    combined.includes('.mp4') ||
    combined.includes('.mov') ||
    combined.includes('.m4v') ||
    combined.includes('.3gp') ||
    combined.includes('.webm');

  const sourceForExt = fileNamePart || uriPart;
  const rawExt = sourceForExt.includes('.') ? sourceForExt.split('.').pop() : '';
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
  if (asset?.width && Number(asset.width) > MAX_IMAGE_WIDTH) actions.push({ resize: { width: MAX_IMAGE_WIDTH } });

  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: IMAGE_COMPRESS,
    format: ImageManipulator.SaveFormat.JPEG,
  });
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
  if (durationMs && durationMs > MAX_VIDEO_DURATION_MS) throw new Error('Video süresi en fazla 2 dakika olabilir. Lütfen daha kısa bir video seç.');

  const originalSize = asset.fileSize || await getLocalFileSize(asset.uri);
  const compressedUri = await Video.compress(asset.uri, { compressionMethod: 'auto', maxSize: 1280 }, (progress) => {
    if (typeof onProgress === 'function') onProgress(progress);
  });
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
      try { player?.pause?.(); } catch (error) {}
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
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((e) => setHeaderHeight(e.nativeEvent.layout.height), []);
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
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [targetType, setTargetType] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [viewerItem, setViewerItem] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  const canUpload = mode === 'admin' || mode === 'teacher';
  const title = mode === 'parent' ? 'Galeri' : mode === 'teacher' ? 'Sınıf Galerisi' : 'Galeri Yönetimi';
  const roleLabel = mode === 'parent' ? 'Veli sadece görüntüler' : 'Fotoğraf / video yükleyebilirsin';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId && mode !== 'admin') {
      setChildren([]);
      setClasses([]);
      setLoading(false);
      return undefined;
    }

    let classUnsub = null;
    let classFallbackUnsub = null;
    let childUnsubs = [];
    let childFallbackUnsub = null;

    const cleanupClass = () => {
      if (classUnsub) classUnsub();
      classUnsub = null;
    };
    const cleanupChildren = () => {
      childUnsubs.forEach((unsub) => unsub && unsub());
      childUnsubs = [];
    };

    const setChildrenFromIds = (ids) => {
      cleanupChildren();
      if (ids.length === 0) {
        setChildren([]);
        return;
      }
      const map = {};
      ids.forEach((childId) => {
        const unsub = listenValue(`cocuklar/${childId}`, (data) => {
          const child = safeObject(data);
          if (Object.keys(child).length > 0) map[childId] = { id: childId, ...child };
          else delete map[childId];
          setChildren(Object.values(map).sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr')));
        });
        childUnsubs.push(unsub);
      });
    };

    // Fallback artık tüm 'cocuklar' node'unu çekmiyor, bilinen kresId'ye göre sorguluyor.
    const fallbackChildrenByFilter = (fallbackKresId, filterFn) => {
      cleanupChildren();
      if (childFallbackUnsub) return;
      childFallbackUnsub = listenByKresId('cocuklar', fallbackKresId, (data) => {
        setChildren(toList(data).filter(filterFn).sort((a, b) => getChildName(a).localeCompare(getChildName(b), 'tr')));
      }, () => setChildren([]));
    };

        if (mode === 'teacher') {
      const teacherKresId = kullanici?.kresId || null;
      let childIndexUnsub = null;

      const cleanupChildIndex = () => {
        if (childIndexUnsub) childIndexUnsub();
        childIndexUnsub = null;
      };

      // Sınıf id'si bulunduğunda (index veya fallback yoluyla) o sınıfın çocuklarını çeker.
      // Önce sinifCocuklari index'ini dener, yoksa cocuklar node'unu sinifId'ye göre filtreler.
      const loadClassChildren = (classId) => {
        cleanupChildIndex();
        childIndexUnsub = listenValue(`sinifCocuklari/${classId}`, (data) => {
          const ids = indexIds(data);
          if (ids.length === 0) {
            fallbackChildrenByFilter(teacherKresId, (child) => child.sinifId === classId);
            return;
          }
          if (childFallbackUnsub) {
            childFallbackUnsub();
            childFallbackUnsub = null;
          }
          setChildrenFromIds(ids);
        }, () => fallbackChildrenByFilter(teacherKresId, (child) => child.sinifId === classId));
      };

      // Fallback artık tüm 'siniflar' node'unu çekmiyor, öğretmenin kendi kresId'sine göre sorguluyor.
      const startClassFallback = () => {
        cleanupClass();
        if (classFallbackUnsub) return;
        classFallbackUnsub = listenByKresId('siniflar', teacherKresId, (data) => {
          const list = toList(data);
          const found = list.find((item) => includesId(item.ogretmenIds, userId)) || list.find((item) => item.ogretmenId === userId || item.id === kullanici?.sinifId) || null;
          setClasses(found ? [found] : []);
          if (found?.id) {
            loadClassChildren(found.id);
          } else {
            cleanupChildIndex();
            setChildren([]);
          }
          setLoading(false);
        }, () => setLoading(false));
      };

      const indexUnsub = listenValue(`ogretmenSiniflari/${userId}`, (data) => {
        const classId = indexIds(data)[0] || kullanici?.sinifId || null;
        if (!classId) {
          startClassFallback();
          return;
        }
        if (classFallbackUnsub) {
          classFallbackUnsub();
          classFallbackUnsub = null;
        }
        cleanupClass();
        classUnsub = listenValue(`siniflar/${classId}`, (classData) => {
          const classObj = safeObject(classData);
          const hasClass = Object.keys(classObj).length > 0;
          setClasses(hasClass ? [{ id: classId, ...classObj }] : []);
          if (hasClass) {
            loadClassChildren(classId);
          } else {
            cleanupChildIndex();
            setChildren([]);
          }
          setLoading(false);
        }, startClassFallback);
      }, startClassFallback);

      return () => {
        indexUnsub && indexUnsub();
        cleanupClass();
        cleanupChildren();
        cleanupChildIndex();
        if (classFallbackUnsub) classFallbackUnsub();
        if (childFallbackUnsub) childFallbackUnsub();
      };
    }
    if (mode === 'parent') {
      const parentKresId = kullanici?.kresId || null;

      const startParentFallback = () => fallbackChildrenByFilter(parentKresId, (child) => includesId(child.veliIds, userId) || child.veliId === userId || child.parentId === userId);
      const indexUnsub = listenValue(`veliCocuklari/${userId}`, (data) => {
        const ids = indexIds(data);
        if (ids.length === 0) startParentFallback();
        else {
          if (childFallbackUnsub) {
            childFallbackUnsub();
            childFallbackUnsub = null;
          }
          setChildrenFromIds(ids);
        }
        setLoading(false);
      }, () => {
        startParentFallback();
        setLoading(false);
      });

      return () => {
        indexUnsub && indexUnsub();
        cleanupChildren();
        if (childFallbackUnsub) childFallbackUnsub();
      };
    }

    const adminKresId = kullanici?.kresId || 'kres001';
    const classIndexUnsub = listenValue(`kresSiniflari/${adminKresId}`, (data) => {
      const ids = indexIds(data);
      if (ids.length === 0) {
        // Fallback artık tüm 'siniflar' node'unu çekmiyor, sadece bu kreşe göre sorguluyor.
        if (!classFallbackUnsub) {
          classFallbackUnsub = listenByKresId('siniflar', adminKresId, (allData) => setClasses(toList(allData)), () => setClasses([]));
        }
        return;
      }
      if (classFallbackUnsub) {
        classFallbackUnsub();
        classFallbackUnsub = null;
      }
      const map = {};
      cleanupClass();
      ids.forEach((classId) => {
        classUnsub = listenValue(`siniflar/${classId}`, (classData) => {
          const classObj = safeObject(classData);
          if (Object.keys(classObj).length > 0) map[classId] = { id: classId, ...classObj };
          setClasses(Object.values(map).sort((a, b) => getClassName(a).localeCompare(getClassName(b), 'tr')));
        });
      });
    });
    const childIndexUnsub = listenValue(`kresCocuklari/${adminKresId}`, (data) => {
      const ids = indexIds(data);
      if (ids.length === 0) fallbackChildrenByFilter(adminKresId, () => true);
      else setChildrenFromIds(ids);
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      classIndexUnsub && classIndexUnsub();
      childIndexUnsub && childIndexUnsub();
      cleanupClass();
      cleanupChildren();
      if (classFallbackUnsub) classFallbackUnsub();
      if (childFallbackUnsub) childFallbackUnsub();
    };
  }, [kullanici?.kresId, kullanici?.sinifId, mode, userId]);

  const currentClass = useMemo(() => {
    if (mode !== 'teacher') return null;
    return classes[0] || null;
  }, [classes, mode]);

  const myChildren = useMemo(() => {
    if (mode === 'parent') return children;
    if (mode === 'teacher') return currentClass?.id ? children.filter((child) => child.sinifId === currentClass.id) : [];
    const userKresId = kullanici?.kresId || children[0]?.kresId || null;
    return children.filter((child) => !userKresId || child.kresId === userKresId);
  }, [children, currentClass?.id, kullanici?.kresId, mode]);

  const kresId = useMemo(() => {
    if (mode === 'teacher') return currentClass?.kresId || kullanici?.kresId || myChildren[0]?.kresId || null;
    if (mode === 'parent') return myChildren[0]?.kresId || kullanici?.kresId || null;
    return kullanici?.kresId || myChildren[0]?.kresId || 'kres001';
  }, [currentClass?.kresId, kullanici?.kresId, mode, myChildren]);

  const availableClasses = useMemo(() => classes.filter((classItem) => !kresId || !classItem.kresId || classItem.kresId === kresId).sort((a, b) => getClassName(a).localeCompare(getClassName(b), 'tr')), [classes, kresId]);
  const childIds = useMemo(() => new Set(myChildren.map((child) => String(child.id))), [myChildren]);
  const classIds = useMemo(() => new Set(myChildren.map((child) => String(child.sinifId)).filter(Boolean)), [myChildren]);

  useEffect(() => {
    if (!kresId) return undefined;

    setLoading(true);
    let galleryUnsubs = [];
    let fallbackUnsub = null;

    const cleanupGallery = () => {
      galleryUnsubs.forEach((unsub) => unsub && unsub());
      galleryUnsubs = [];
    };

    // Fallback artık tüm 'galeri' node'unu çekmiyor, bu kreşe göre sorguluyor.
    const startFallback = () => {
      cleanupGallery();
      if (fallbackUnsub) return;
      fallbackUnsub = listenByKresId('galeri', kresId, (data) => {
        setGallery(toList(data));
        setLoading(false);
      }, () => {
        setGallery([]);
        setLoading(false);
      });
    };

    const indexUnsub = listenValue(`kresGalerileri/${kresId}`, (data) => {
      const ids = indexIds(data);
      if (ids.length === 0) {
        startFallback();
        return;
      }

      if (fallbackUnsub) {
        fallbackUnsub();
        fallbackUnsub = null;
      }
      cleanupGallery();
      const map = {};
      ids.forEach((galleryId) => {
        const unsub = listenValue(`galeri/${galleryId}`, (galleryData) => {
          const item = safeObject(galleryData);
          if (Object.keys(item).length > 0) map[galleryId] = { id: galleryId, ...item };
          else delete map[galleryId];
          setGallery(Object.values(map));
          setLoading(false);
        }, () => setLoading(false));
        galleryUnsubs.push(unsub);
      });
    }, startFallback);

    return () => {
      indexUnsub && indexUnsub();
      cleanupGallery();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [kresId]);

  useEffect(() => {
    const uploaderIds = uniqueIds(gallery.map((item) => item.yukleyenId));
    if (uploaderIds.length === 0) {
      setUsers({});
      return undefined;
    }
    const map = {};
    const unsubs = uploaderIds.map((id) => listenValue(`kullanicilar/${id}`, (userData) => {
      const user = safeObject(userData);
      if (Object.keys(user).length > 0) map[id] = { id, ...user };
      else delete map[id];
      setUsers({ ...map });
    }));
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [gallery]);

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

  function pickMedia() {
    if (!canUpload) return;
    if (!kresId) return Alert.alert('Eksik Bilgi', 'Kreş bilgisi bulunamadı. Önce kullanıcı/kresId bağlantısını kontrol et.');
    if (targetType === 'class' && !selectedClassId) return Alert.alert('Sınıf Seç', 'Sınıfa özel paylaşım için bir sınıf seçmelisin.');
    if (targetType === 'child' && !selectedChildId) return Alert.alert('Çocuk Seç', 'Çocuğa özel paylaşım için bir çocuk seçmelisin.');
    setPickerVisible(true);
  }

  function handlePickerConfirm(mediaLibraryAssets) {
    setPickerVisible(false);
    if (!mediaLibraryAssets || mediaLibraryAssets.length === 0) return;

    const tooLong = mediaLibraryAssets.find(
      (a) => a.mediaType === 'video' && getAssetDurationMs(a) > MAX_VIDEO_DURATION_MS
    );
    if (tooLong) return Alert.alert('Video Çok Uzun', 'Video süresi en fazla 2 dakika olabilir. Lütfen daha kısa bir video seç.');

    setSelectedAssets(mediaLibraryAssets.map((a, index) => ({
      localId: `${Date.now()}-${index}`,
      asset: {
        uri: a.uri,
        fileName: a.filename,
        type: a.mediaType === 'video' ? 'video' : 'image',
        mimeType: a.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        width: a.width,
        height: a.height,
        duration: a.duration,
        fileSize: 0,
      },
    })));
  }

  function removeSelectedAsset(localId) {
    setSelectedAssets((prev) => prev.filter((item) => item.localId !== localId));
  }

  function cancelSelection() {
    setSelectedAssets([]);
  }

  async function confirmUpload() {
    if (selectedAssets.length === 0) return;
    if (!kresId) return Alert.alert('Eksik Bilgi', 'Kreş bilgisi bulunamadı. Önce kullanıcı/kresId bağlantısını kontrol et.');

    try {
      setUploading(true);
      const itemRef = push(dbRef(database, 'galeri'));
      const galleryId = itemRef.key;
      const createdAt = Date.now();
      const mediaItems = [];

      for (let index = 0; index < selectedAssets.length; index += 1) {
        const rawAsset = selectedAssets[index].asset;
        const rawInfo = getFileInfo(rawAsset);
        setUploadStatus(rawInfo.isVideo ? `Video optimize ediliyor... (${index + 1}/${selectedAssets.length})` : `Fotoğraf hazırlanıyor... (${index + 1}/${selectedAssets.length})`);

        const asset = await optimizeGalleryAsset(rawAsset, (progress) => {
          if (rawInfo.isVideo) setUploadStatus(`Video optimize ediliyor... %${Math.round(Number(progress || 0) * 100)}`);
        });

        const { isVideo, extension, contentType } = getFileInfo(asset);
        const mediaId = `${galleryId}-${index}`;
        const storagePath = `galeri/${kresId}/${galleryId}/${mediaId}.${extension}`;

        setUploadStatus(`Medya yükleniyor... (${index + 1}/${selectedAssets.length})`);
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

      const galleryRecord = {
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
      };

      await set(itemRef, galleryRecord);
      await Promise.all([
        set(dbRef(database, `kresGalerileri/${kresId}/${galleryId}`), true),
        galleryRecord.classId ? set(dbRef(database, `sinifGalerileri/${galleryRecord.classId}/${galleryId}`), true) : Promise.resolve(),
        ...asArray(galleryRecord.cocukIds).map((childId) => set(dbRef(database, `cocukGalerileri/${childId}/${galleryId}`), true)),
      ]);

      setCaption('');
      setSelectedAssets([]);
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
      await Promise.all([
        remove(dbRef(database, `kresGalerileri/${item.kresId}/${item.id}`)).catch(() => null),
        item.classId || item.sinifId ? remove(dbRef(database, `sinifGalerileri/${item.classId || item.sinifId}/${item.id}`)).catch(() => null) : Promise.resolve(),
        ...asArray(item.cocukIds || item.cocukId || item.studentId).map((childId) => remove(dbRef(database, `cocukGalerileri/${childId}/${item.id}`)).catch(() => null)),
        ...mediaItems.map((media) => media.storagePath ? deleteObject(storageRef(storage, media.storagePath)).catch(() => null) : Promise.resolve(null)),
      ]);
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
      <View style={styles.header} onLayout={onHeaderLayout}>
        {navigation?.canGoBack?.() ? <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹ Geri</Text></TouchableOpacity> : <View style={styles.backButton} />}
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSub}>{roleLabel}</Text></View>
        <Text style={styles.headerIcon}>🖼️</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
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

            {selectedAssets.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                  {selectedAssets.map((item) => (
                    <View key={item.localId} style={styles.previewThumbWrap}>
                      {getFileInfo(item.asset).isVideo ? (
                        <View style={[styles.previewThumb, styles.previewThumbVideo]}><Text style={styles.previewThumbVideoIcon}>▶</Text></View>
                      ) : (
                        <Image source={{ uri: item.asset.uri }} style={styles.previewThumb} />
                      )}
                      <TouchableOpacity style={styles.previewRemoveBtn} onPress={() => removeSelectedAsset(item.localId)} disabled={uploading}>
                        <Text style={styles.previewRemoveBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.previewActionsRow}>
                  <TouchableOpacity style={[styles.secondaryButton, uploading && styles.disabledButton]} onPress={cancelSelection} disabled={uploading}>
                    <Text style={styles.secondaryButtonText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, styles.primaryButtonFlex, uploading && styles.disabledButton]} onPress={confirmUpload} disabled={uploading}>
                    {uploading ? <View style={styles.uploadingButtonContent}><ActivityIndicator color="#fff" /><Text style={styles.primaryButtonText}>{uploadStatus || 'Medya hazırlanıyor...'}</Text></View> : <Text style={styles.primaryButtonText}>{`Yükle (${selectedAssets.length})`}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={pickMedia}>
                <Text style={styles.primaryButtonText}>Fotoğraf / Video Seç</Text>
              </TouchableOpacity>
            )}
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
      </KeyboardAvoidingView>
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
  segment: { flex: 1, paddingVertical: 10, borderRadius: 13, alignItems: 'center' },
  segmentActive: { backgroundColor: THEME.primary },
  segmentText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  segmentTextActive: { color: '#fff' },
  childPicker: { marginTop: 12 },
  childChip: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: THEME.primarySoft, borderRadius: 99, marginRight: 8 },
  childChipActive: { backgroundColor: THEME.primary },
  childChipText: { color: THEME.primary, fontWeight: '900' },
  childChipTextActive: { color: '#fff' },
  targetPreview: { backgroundColor: '#FFF6E8', borderRadius: 14, padding: 11, marginTop: 12 },
  targetPreviewText: { color: THEME.orange, fontWeight: '900' },
  input: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 12, color: THEME.text, fontWeight: '700', marginTop: 12, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 12 },
  primaryButtonFlex: { flex: 1, marginTop: 0 },
  disabledButton: { opacity: 0.7 },
  uploadingButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '900', textAlign: 'center' },
  previewRow: { marginTop: 12 },
  previewThumbWrap: { marginRight: 10, position: 'relative' },
  previewThumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#eee' },
  previewThumbVideo: { alignItems: 'center', justifyContent: 'center' },
  previewThumbVideoIcon: { color: THEME.primary, fontSize: 22 },
  previewRemoveBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: THEME.red, alignItems: 'center', justifyContent: 'center' },
  previewRemoveBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  previewActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryButton: { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: THEME.border, backgroundColor: '#fff', paddingHorizontal: 18 },
  secondaryButtonText: { color: THEME.muted, fontWeight: '900' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  emptyCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  emptyDesc: { color: THEME.muted, textAlign: 'center', lineHeight: 20, marginTop: 6, fontWeight: '700' },
  mediaCard: { backgroundColor: THEME.card, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  singleGrid: { height: 260 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, backgroundColor: THEME.border },
  threeGrid: { flexDirection: 'row', height: 260, gap: 2, backgroundColor: THEME.border },
  threeLeft: { flex: 1.25 },
  threeRight: { flex: 1, gap: 2 },
  gridTile: { width: '49.7%', height: 130, backgroundColor: THEME.dark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  singleTile: { width: '100%', height: '100%' },
  largeTile: { width: '100%', height: '100%' },
  tileImage: { width: '100%', height: '100%' },
  videoTile: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.dark },
  playIcon: { color: '#fff', fontSize: 34, fontWeight: '900' },
  videoTileText: { color: '#fff', fontWeight: '900', marginTop: 6 },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#fff', fontWeight: '900', fontSize: 28 },
  mediaBody: { padding: 14 },
  mediaTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
