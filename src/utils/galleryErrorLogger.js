import { Platform } from 'react-native';
import { push, set, ref as dbRef } from 'firebase/database';
import { database } from '../config/firebase';

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    code: error?.code || '',
    message: String(error?.message || error || 'Bilinmeyen hata').slice(0, 1000),
  };
}

export async function logGalleryError({
  stage,
  error,
  userId = '',
  kresId = '',
  mode = '',
  asset = null,
  extra = {},
} = {}) {
  try {
    const fileName = asset?.fileName || asset?.name || '';
    const mimeType = asset?.mimeType || '';
    const type = asset?.type || asset?.mediaType || '';

    const errorRef = push(dbRef(database, 'appErrorLogs'));
    await set(errorRef, {
      category: 'gallery',
      stage: stage || 'UNKNOWN',
      error: serializeError(error),
      device: {
        platform: Platform.OS,
        platformVersion: String(Platform.Version || ''),
      },
      userId: userId || '',
      kresId: kresId || '',
      mode: mode || '',
      asset: {
        type: String(type),
        mimeType: String(mimeType),
        fileName: String(fileName).slice(0, 200),
        size: Number(asset?.fileSize || asset?.size || 0),
      },
      extra,
      createdAt: Date.now(),
    });
  } catch (logError) {
    console.warn('Galeri hata kaydı Firebase\'e yazılamadı:', logError?.message || logError);
  }
}
