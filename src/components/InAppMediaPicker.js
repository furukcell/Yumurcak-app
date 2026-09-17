// src/components/InAppMediaPicker.js
import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

const NUM_COLUMNS = 4;
const PAGE_SIZE = 60;
const PHOTO_LIMIT = 20;
const VIDEO_LIMIT = 5;

// GalleryScreenBase.js'teki THEME ile birebir aynı — repo genelinde bu ekran
// için sabit renk kullanılıyor, tema sistemine bağlı değil.
const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  red: '#FF4D6D',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  dark: '#171821',
};

export default function InAppMediaPicker({ onConfirm, onCancel }) {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState([]);
  const [endCursor, setEndCursor] = useState(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => { if (!permission?.granted) requestPermission(); }, [permission]);
  useEffect(() => { if (permission?.granted) loadMore(); }, [permission?.granted]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after: endCursor,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setAssets((prev) => [...prev, ...page.assets]);
      setEndCursor(page.endCursor);
      setHasMore(page.hasNextPage);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, endCursor]);

  const selectedPhotoCount = selected.filter((a) => a.mediaType === 'photo').length;
  const selectedVideoCount = selected.filter((a) => a.mediaType === 'video').length;

  const toggleSelect = (asset) => {
    setSelected((prev) => {
      const exists = prev.find((a) => a.id === asset.id);
      if (exists) return prev.filter((a) => a.id !== asset.id);
      const isVideo = asset.mediaType === 'video';
      const limit = isVideo ? VIDEO_LIMIT : PHOTO_LIMIT;
      const current = isVideo ? selectedVideoCount : selectedPhotoCount;
      if (current >= limit) return prev;
      return [...prev, asset];
    });
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Galeri izni gerekiyor.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>İzin ver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fotoğraf / Video Seç</Text>
        <TouchableOpacity onPress={onCancel}><Text style={styles.backText}>Vazgeç</Text></TouchableOpacity>
      </View>

      <FlatList
        data={assets}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator color={THEME.primary} style={{ marginVertical: 12 }} /> : null}
        renderItem={({ item }) => {
          const isSelected = selected.some((a) => a.id === item.id);
          const isVideo = item.mediaType === 'video';
          return (
            <TouchableOpacity onPress={() => toggleSelect(item)} style={styles.cell}>
              <Image source={{ uri: item.uri }} style={[styles.thumb, !isSelected && selected.length > 0 && styles.dimmed]} />
              {isSelected && (
                <View style={styles.selectedBorder}>
                  <View style={styles.badge}><Text style={styles.badgeText}>✓</Text></View>
                </View>
              )}
              {isVideo && (
                <View style={styles.videoTag}>
                  <Text style={styles.videoTagText}>▶ {formatDuration(item.duration)}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerCount}>{selectedPhotoCount}/{PHOTO_LIMIT} foto</Text>
          <Text style={styles.footerCount}>{selectedVideoCount}/{VIDEO_LIMIT} video</Text>
        </View>
        <TouchableOpacity
          disabled={selected.length === 0}
          style={[styles.primaryButton, selected.length === 0 && styles.primaryButtonDisabled]}
          onPress={() => onConfirm(selected)}
        >
          <Text style={styles.primaryButtonText}>Seç ({selected.length})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatDuration(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg, gap: 12 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: THEME.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: THEME.primary },
  backText: { color: THEME.muted, fontWeight: '900', fontSize: 14 },
  cell: { flex: 1 / NUM_COLUMNS, aspectRatio: 1, padding: 1 },
  thumb: { width: '100%', height: '100%', backgroundColor: THEME.dark },
  dimmed: { opacity: 0.35 },
  selectedBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2, borderColor: THEME.primary,
  },
  badge: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  videoTag: {
    position: 'absolute', bottom: 4, left: 4, backgroundColor: THEME.dark,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  videoTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: THEME.card, borderTopWidth: 1, borderColor: THEME.border,
  },
  footerCount: { color: THEME.muted, fontWeight: '700', fontSize: 12 },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 22 },
  primaryButtonDisabled: { backgroundColor: THEME.primarySoft },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
});
