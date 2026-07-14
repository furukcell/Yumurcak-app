import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

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

  const fileName = getFileName(media);
  const localUri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
  const savedFile = await FileSystem.downloadAsync(media.url, localUri);

  try {
    await MediaLibrary.saveToLibraryAsync(savedFile.uri);
  } catch (cause) {
    const error = new Error('Medya cihaz galerisine kaydedilemedi.');
    error.code = String(cause?.message || '').toLowerCase().includes('permission')
      ? 'permission-denied'
      : 'save-failed';
    error.cause = cause;
    throw error;
  }

  return { uri: savedFile.uri };
}
