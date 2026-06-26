import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const ALBUM_NAME = 'Yumurcak';

function getExtension(media) {
  const rawName = String(media?.fileName || '').split('?')[0];
  const nameExt = rawName.includes('.') ? rawName.split('.').pop() : '';
  if (nameExt) return nameExt.toLowerCase();
  const rawUrl = String(media?.url || '').split('?')[0];
  const urlExt = rawUrl.includes('.') ? rawUrl.split('.').pop() : '';
  return (urlExt || (media?.type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
}

function getFileName(media) {
  const extension = getExtension(media);
  const baseName = String(media?.fileName || media?.id || `yumurcak-${Date.now()}`)
    .split('?')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!baseName) return `yumurcak-${Date.now()}.${extension}`;
  return baseName.includes('.') ? baseName : `${baseName}.${extension}`;
}

export async function saveGalleryMediaToDevice(media) {
  if (!media?.url) throw new Error('Medya bağlantısı bulunamadı.');

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    const error = new Error('Galeri izni verilmedi.');
    error.code = 'permission-denied';
    throw error;
  }

  const fileName = getFileName(media);
  const localUri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
  const savedFile = await FileSystem.downloadAsync(media.url, localUri);
  const asset = await MediaLibrary.createAssetAsync(savedFile.uri);
  const album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);

  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
  } else {
    await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, false);
  }

  return asset;
}
