import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { onValue, ref } from 'firebase/database';
import { VideoView, useVideoPlayer } from 'expo-video';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { saveGalleryMediaToDevice } from '../../utils/saveGalleryMedia';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function indexIds(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).filter(([, value]) => value !== false && value !== null).map(([id]) => id);
}

function toList(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([id, item]) => ({ id, ...safeObject(item) }));
}

function includesId(value, id) {
  if (!id) return false;
  return asArray(value).map((item) => String(item)).includes(String(id));
}

function normalizeMediaItems(item) {
  const items = asArray(item?.mediaItems)
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
  if (items.length > 0) return items;
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

function getTitle(item) {
  return item?.baslik || item?.title || item?.aciklama || item?.hedefAdi || 'Galeri paylaşımı';
}

function getDateText(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getRemainingText(expiresAt, now) {
  const diff = Number(expiresAt || 0) - now;
  if (diff <= 0) return 'Süresi doldu';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.ceil((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours <= 0) return `${minutes} dk kaldı`;
  return `${hours} sa ${minutes} dk kaldı`;
}

function VideoPlayer({ uri }) {
  const player = useVideoPlayer(uri, (playerInstance) => { playerInstance.loop = false; });
  useEffect(() => () => { try { player?.pause?.(); } catch (error) {} }, [player]);
  if (!uri) return <View style={styles.videoFallback}><Text style={styles.playIcon}>▶</Text></View>;
  return <VideoView player={player} style={styles.viewerImage} nativeControls allowsFullscreen contentFit="contain" />;
}

export default function ParentGalleryScreenOptimized({ navigation }) {
  const { kullanici } = useAuth();
  const userId = kullanici?.uid || kullanici?.id;
  const [children, setChildren] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [viewerItem, setViewerItem] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [savingMediaId, setSavingMediaId] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) {
      setChildren([]);
      setLoading(false);
      return undefined;
    }

    let childUnsubs = [];
    let fallbackUnsub = null;
    const childMap = {};
    const publish = () => setChildren(Object.values(childMap));

    const listenChild = (childId) => {
      if (!childId || childMap[childId]?.__listening) return;
      childMap[childId] = { __listening: true };
      const unsub = onValue(ref(database, `cocuklar/${childId}`), (snap) => {
        const child = safeObject(snap.val());
        if (Object.keys(child).length > 0) childMap[childId] = { id: childId, ...child, __listening: true };
        else delete childMap[childId];
        publish();
      });
      childUnsubs.push(unsub);
    };

    const startFallback = () => {
      if (fallbackUnsub) return;
      fallbackUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
        const filtered = toList(snap.val()).filter((child) => includesId(child.veliIds, userId) || child.veliId === userId || child.parentId === userId);
        setChildren(filtered);
        setLoading(false);
      }, () => setLoading(false));
    };

    const indexUnsub = onValue(ref(database, `veliCocuklari/${userId}`), (snap) => {
      const ids = indexIds(snap.val());
      if (ids.length === 0) {
        startFallback();
        return;
      }
      ids.forEach(listenChild);
      setLoading(false);
    }, startFallback);

    return () => {
      indexUnsub && indexUnsub();
      childUnsubs.forEach((unsub) => unsub && unsub());
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [userId]);

  const kresId = children[0]?.kresId || kullanici?.kresId || null;
  const childIds = useMemo(() => new Set(children.map((child) => String(child.id))), [children]);
  const classIds = useMemo(() => new Set(children.map((child) => String(child.sinifId)).filter(Boolean)), [children]);

  useEffect(() => {
    if (!kresId) {
      setGallery([]);
      return undefined;
    }

    let recordUnsubs = [];
    let fallbackUnsub = null;
    const galleryMap = {};
    const publish = () => setGallery(Object.values(galleryMap).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));

    const startFallback = () => {
      if (fallbackUnsub) return;
      fallbackUnsub = onValue(ref(database, 'galeri'), (snap) => {
        const list = toList(snap.val()).filter((item) => !item.kresId || item.kresId === kresId).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 250);
        setGallery(list);
      }, () => setGallery([]));
    };

    const indexUnsub = onValue(ref(database, `kresGalerileri/${kresId}`), (snap) => {
      const ids = indexIds(snap.val());
      if (ids.length === 0) {
        startFallback();
        return;
      }
      if (fallbackUnsub) {
        fallbackUnsub();
        fallbackUnsub = null;
      }
      recordUnsubs.forEach((unsub) => unsub && unsub());
      recordUnsubs = ids.slice(-250).map((galleryId) => onValue(ref(database, `galeri/${galleryId}`), (itemSnap) => {
        const item = safeObject(itemSnap.val());
        if (Object.keys(item).length > 0) galleryMap[galleryId] = { id: galleryId, ...item };
        else delete galleryMap[galleryId];
        publish();
      }));
    }, startFallback);

    return () => {
      indexUnsub && indexUnsub();
      recordUnsubs.forEach((unsub) => unsub && unsub());
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [kresId]);

  const visibleGallery = useMemo(() => gallery
    .filter((item) => Number(item.expiresAt || 0) > now)
    .filter((item) => normalizeMediaItems(item).length > 0)
    .filter((item) => {
      const target = item.targetType || (item.hedef === 'kurum' ? 'school' : item.hedef === 'sinif' ? 'class' : item.hedef === 'cocuk' ? 'student' : 'school');
      if (target === 'school') return true;
      const itemClassId = item.classId || item.sinifId;
      const itemStudentIds = asArray(item.studentId || item.cocukIds || item.cocukId);
      if (itemClassId && classIds.has(String(itemClassId))) return true;
      return itemStudentIds.some((id) => childIds.has(String(id)));
    }), [childIds, classIds, gallery, now]);

  function openViewer(item, index = 0) {
    setViewerItem(item);
    setViewerIndex(index);
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
      <Modal visible={!!viewerItem} transparent animationType="fade" onRequestClose={() => setViewerItem(null)}>
        <SafeAreaView style={styles.viewerBackdrop}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerButton} onPress={() => setViewerItem(null)}><Text style={styles.viewerButtonText}>Kapat</Text></TouchableOpacity>
            <Text style={styles.viewerCounter}>{viewerIndex + 1} / {mediaItems.length}</Text>
            <TouchableOpacity style={[styles.viewerButton, isSaving && styles.viewerButtonDisabled]} onPress={() => saveMedia(media)} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.viewerButtonText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.viewerStage}>{isVideo ? <VideoPlayer uri={media.url} /> : <Image source={{ uri: media.url }} style={styles.viewerImage} resizeMode="contain" />}</View>
          {mediaItems.length > 1 ? <View style={styles.viewerNavRow}><TouchableOpacity disabled={viewerIndex === 0} style={[styles.viewerNavButton, viewerIndex === 0 && styles.viewerNavButtonDisabled]} onPress={() => setViewerIndex((index) => Math.max(0, index - 1))}><Text style={styles.viewerButtonText}>‹ Önceki</Text></TouchableOpacity><TouchableOpacity disabled={viewerIndex === mediaItems.length - 1} style={[styles.viewerNavButton, viewerIndex === mediaItems.length - 1 && styles.viewerNavButtonDisabled]} onPress={() => setViewerIndex((index) => Math.min(mediaItems.length - 1, index + 1))}><Text style={styles.viewerButtonText}>Sonraki ›</Text></TouchableOpacity></View> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewerThumbRow} contentContainerStyle={styles.viewerThumbContent}>
            {mediaItems.map((thumb, index) => {
              const active = viewerIndex === index;
              return (
                <TouchableOpacity key={thumb.id || `${viewerItem.id}-thumb-${index}`} style={[styles.viewerThumb, active && styles.viewerThumbActive]} onPress={() => setViewerIndex(index)} activeOpacity={0.82}>
                  {thumb.type === 'video' ? (
                    <View style={styles.viewerThumbVideo}><Text style={styles.viewerThumbVideoText}>▶</Text></View>
                  ) : (
                    <Image source={{ uri: thumb.thumbnailUrl || thumb.url }} style={styles.viewerThumbImage} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={THEME.primary} size="large" /><Text style={styles.loadingText}>Galeri hazırlanıyor...</Text></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>{navigation?.canGoBack?.() ? <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹ Geri</Text></TouchableOpacity> : <View style={styles.backButton} />}<View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.headerTitle}>Galeri</Text><Text style={styles.headerSub}>Veli sadece görüntüler</Text></View><Text style={styles.headerIcon}>🖼️</Text></View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Aktif Galeri</Text>
        {visibleGallery.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyIcon}>🖼️</Text><Text style={styles.emptyTitle}>Aktif galeri yok</Text><Text style={styles.emptyDesc}>Son 24 saat içinde yüklenen fotoğraf veya video burada görünür.</Text></View> : visibleGallery.map((item) => {
          const mediaItems = normalizeMediaItems(item);
          return <View key={item.id} style={styles.mediaCard}>{renderPreviewGrid(item)}<View style={styles.mediaBody}><View style={styles.mediaTitleRow}><Text style={styles.mediaTitle} numberOfLines={2}>{getTitle(item)}</Text><View style={styles.countBadge}><Text style={styles.countBadgeText}>{mediaItems.length} medya</Text></View></View><Text style={styles.mediaMeta}>Hedef: {item.hedefAdi || item.targetType || 'Kurum'}</Text><Text style={styles.mediaMeta}>Yüklenme: {getDateText(item.createdAt)}</Text><View style={styles.actionRow}><Text style={styles.remainingBadge}>⏳ {getRemainingText(item.expiresAt, now)}</Text><TouchableOpacity style={styles.openButton} onPress={() => openViewer(item, 0)}><Text style={styles.openButtonText}>Aç</Text></TouchableOpacity></View></View></View>;
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
  threeRight: { flex: 0.85, gap: 2 },
  gridTile: { width: '50%', height: 125, borderWidth: 1, borderColor: '#fff', overflow: 'hidden', backgroundColor: THEME.dark },
  singleTile: { width: '100%', height: '100%', borderWidth: 0 },
  largeTile: { width: '100%', height: '100%' },
  tileImage: { width: '100%', height: '100%' },
  previewBox: { height: 250, backgroundColor: THEME.primarySoft },
  previewImage: { width: '100%', height: '100%' },
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
  viewerBackdrop: { flex: 1, backgroundColor: '#050508' },
  viewerHeader: { paddingHorizontal: 14, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerButton: { minWidth: 74, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  viewerButtonDisabled: { opacity: 0.55 },
  viewerButtonText: { color: '#fff', fontWeight: '900' },
  viewerCounter: { color: '#fff', fontWeight: '900' },
  viewerStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  videoFallback: { width: '86%', borderRadius: 28, padding: 24, backgroundColor: '#171821', alignItems: 'center' },
  viewerNavRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  viewerNavButton: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
  viewerNavButtonDisabled: { opacity: 0.35 },
  viewerThumbRow: { maxHeight: 78, paddingBottom: Platform.OS === 'android' ? 10 : 14 },
  viewerThumbContent: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  viewerThumb: { width: 58, height: 58, borderRadius: 13, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.10)' },
  viewerThumbActive: { borderColor: '#fff', transform: [{ scale: 1.05 }] },
  viewerThumbImage: { width: '100%', height: '100%' },
  viewerThumbVideo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.dark },
  viewerThumbVideoText: { color: '#fff', fontSize: 20, fontWeight: '900' },
});
