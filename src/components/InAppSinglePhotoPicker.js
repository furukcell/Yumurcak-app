// src/components/InAppSinglePhotoPicker.js
// Profil fotoğrafı, kurum logosu, açılış görseli gibi TEK fotoğraf seçimi için.
// Galerideki InAppMediaPicker'ın tekli/oto-kırpmalı hali — aynı Activity-kill riskini
// ortadan kaldırır (sistemin galeri Activity'sini hiç açmaz).
import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';

const NUM_COLUMNS = 4;
const PAGE_SIZE = 60;

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

// aspect: [genişlik, yükseklik] oranı — örn. [1,1] kare, [9,16] splash
export default function InAppSinglePhotoPicker({ onConfirm, onCancel, aspect = [1, 1] }) {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState([]);
  const [endCursor, setEndCursor] = useState(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { if (!permission?.granted) requestPermission(); }, [permission]);
  useEffect(() => { if (permission?.granted) loadMore(); }, [permission?.granted]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after: endCursor,
        mediaType: [MediaLibrary.MediaType.photo],
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setAssets((prev) => [...prev, ...page.assets]);
      setEndCursor(page.endCursor);
      setHasMore(page.hasNextPage);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, endCursor]);

  const handlePick = async (asset) => {
    if (processingId) return;
    setProcessingId(asset.id);
    try {
      let realUri = asset.uri;
      let { width, height } = asset;

      if (Platform.OS === 'ios') {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        realUri = info.localUri || asset.uri;
        width = info.width || width;
        height = info.height || height;
      }

      const cropped = await centerCropToAspect(realUri, width, height, aspect);
      onConfirm(cropped.uri);
    } catch (e) {
      console.error('Fotoğraf işlenemedi:', e);
      onConfirm(asset.uri); // en kötü ihtimalle kırpılmamış haliyle devam
    } finally {
      setProcessingId(null);
    }
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
        <Text style={styles.headerTitle}>Fotoğraf Seç</Text>
        <TouchableOpacity onPress={onCancel}><Text style={styles.backText}>Vazgeç</Text></TouchableOpacity>
      </View>

      <FlatList
        data={assets}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator color={THEME.primary} style={{ marginVertical: 12 }} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handlePick(item)} style={styles.cell} disabled={!!processingId}>
            <Image source={{ uri: item.uri }} style={styles.thumb} />
            {processingId === item.id && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

async function centerCropToAspect(uri, width, height, aspect) {
  if (!width || !height) {
    return ImageManipulator.manipulateAsync(uri, [], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
  }
  const targetRatio = aspect[0] / aspect[1];
  const currentRatio = width / height;

  let cropWidth = width;
  let cropHeight = height;
  let originX = 0;
  let originY = 0;

  if (currentRatio > targetRatio) {
    cropWidth = Math.round(height * targetRatio);
    originX = Math.round((width - cropWidth) / 2);
  } else if (currentRatio < targetRatio) {
    cropHeight = Math.round(width / targetRatio);
    originY = Math.round((height - cropHeight) / 2);
  }

  return ImageManipulator.manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
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
  processingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0007', alignItems: 'center', justifyContent: 'center',
  },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 22 },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
});
