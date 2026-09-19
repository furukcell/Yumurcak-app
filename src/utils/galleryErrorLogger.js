import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { push, set, update, ref as dbRef } from 'firebase/database';
import { database } from '../config/firebase';

function serializeError(error) {
  if (!error) return null;
  return {
    name: error?.name || 'Error',
    code: error?.code || '',
    message: String(error?.message || error || 'Bilinmeyen hata').slice(0, 1000),
  };
}

function getDeviceInfo() {
  return {
    platform: Platform.OS,
    platformVersion: String(Platform.Version || ''),
    brand: Device.brand || '',
    manufacturer: Device.manufacturer || '',
    modelName: Device.modelName || '',
    osName: Device.osName || '',
    osVersion: Device.osVersion || '',
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
      device: getDeviceInfo(),
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

/**
 * Bir seçici denemesinin BAŞLADIĞINI kaydeder — sonuç ne olursa olsun
 * (başarı, hata, sessiz takılma) bu kayıt zaten Firebase'de olur.
 * Böylece "hiç log yok" durumunda bile takılan denemeleri
 * (status: 'started' kalıp hiç 'completed'/'timeout' olmayanları)
 * cihaz/OS bilgisiyle birlikte görebiliriz.
 * Döndürdüğü finish(status, extra) fonksiyonu ile kayıt güncellenir.
 */
export async function startGalleryPickerAttempt({ stage, userId = '', kresId = '', mode = '' } = {}) {
  const attemptRef = push(dbRef(database, 'appErrorLogs'));
  const startedAt = Date.now();

  try {
    await set(attemptRef, {
      category: 'gallery',
      stage: stage || 'PICKER_ATTEMPT',
      status: 'started',
      device: getDeviceInfo(),
      userId: userId || '',
      kresId: kresId || '',
      mode: mode || '',
      createdAt: startedAt,
    });
  } catch (logError) {
    console.warn('Galeri deneme başlangıç kaydı yazılamadı:', logError?.message || logError);
  }

  return async function finish(status, extra = {}) {
    try {
      await update(attemptRef, {
        status,
        durationMs: Date.now() - startedAt,
        extra,
        finishedAt: Date.now(),
      });
    } catch (logError) {
      console.warn('Galeri deneme sonucu güncellenemedi:', logError?.message || logError);
    }
  };
}


export async function logGalleryEvent({
  stage,
  userId = '',
  kresId = '',
  mode = '',
  asset = null,
  extra = {},
} = {}) {
  try {
    const eventRef = push(dbRef(database, 'appErrorLogs'));
    await set(eventRef, {
      category: 'gallery',
      stage: stage || 'EVENT',
      status: 'event',
      device: getDeviceInfo(),
      userId: userId || '',
      kresId: kresId || '',
      mode: mode || '',
      asset: asset ? {
        uri: String(asset?.uri || '').slice(0, 500),
        type: String(asset?.type || asset?.mediaType || ''),
        mimeType: String(asset?.mimeType || ''),
        fileName: String(asset?.fileName || asset?.name || '').slice(0, 200),
        size: Number(asset?.fileSize || asset?.size || 0),
      } : null,
      extra,
      createdAt: Date.now(),
    });
  } catch (logError) {
    console.warn('Galeri olay kaydı Firebase\\'e yazılamadı:', logError?.message || logError);
  }
}
