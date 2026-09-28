import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { crashLog } from './crashlyticsSafe';
import { logGalleryError, logGalleryEvent, startGalleryPickerAttempt } from './galleryErrorLogger';

const PICKER_TIMEOUT_MS = 12000;

class PickerTimeoutError extends Error {
  constructor(source) {
    super(`${source} yanıt vermedi (timeout)`);
    this.name = 'PickerTimeoutError';
    this.code = 'PICKER_TIMEOUT';
  }
}

/**
 * Bir promise'i verilen sürede tamamlanmazsa reddeden yardımcı.
 * Not: Native taraftaki Activity gerçekten hiç sonuç döndürmezse, orijinal
 * promise JS tarafında sonsuza kadar bekler — bu race sadece BİZİM
 * kodumuzun devam edip kullanıcıyı kurtarmasını sağlar, native
 * activity'yi iptal etmez. Amaç: kullanıcıyı sonsuza kadar donmuş bir
 * ekranda bırakmamak ve olayı Firebase'e kaydedebilmek.
 */
function withTimeout(promise, ms, source) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new PickerTimeoutError(source)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Galeri (fotoğraf/video, çoklu seçim) için ortak güvenli giriş.
 *
 * NOT (geçmiş): Daha önce Android'de bazı OEM cihazlarda (ör. Vivo/Xiaomi)
 * native ImagePicker ekranında görülen çökmelerden dolayı önce DocumentPicker
 * denenip hata durumunda ImagePicker'a düşülüyordu. Bu, sorunlu cihazlarda
 * çökmeyi engellemiyordu (aynı cihazlar DocumentPicker'da da anında hata
 * veriyordu) — sadece gereksiz bir ekstra adım ve kullanıcı için kafa
 * karıştırıcı bir dosya seçici arayüzü ekliyordu. Bu yüzden kaldırıldı;
 * artık her platformda doğrudan ImagePicker kullanılıyor. Timeout ve
 * Firebase'e hata kaydı (teşhis amaçlı) korunuyor.
 */
export async function launchSafeGalleryPicker(options = {}) {
  const { userId = '', kresId = '', mode = '', ...pickerOptions } = options;

  const finishAttempt = await startGalleryPickerAttempt({
    stage: 'PICKER_IMAGE',
    userId,
    kresId,
    mode,
  });

  try {
    crashLog('ImagePicker.launchImageLibraryAsync çağrılıyor (galeri)');
    let result = await withTimeout(
      ImagePicker.launchImageLibraryAsync({
        ...pickerOptions,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: pickerOptions.selectionLimit || 10,
        allowsEditing: false,
      }),
      PICKER_TIMEOUT_MS,
      'ImagePicker'
    );

    // Android bazı cihazlarda picker Activity'sini yeniden oluşturabilir.
    // Expo bu durumda seçimi pending result olarak saklar; normal sonuç boşsa
    // kaybolan seçimi geri almaya çalışıyoruz.
    if (Platform.OS === 'android') {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending?.assets?.length && (!result || result.canceled || !result.assets?.length)) {
          result = pending;
          await logGalleryEvent({
            stage: 'PICKER_IMAGE_PENDING_RECOVERED',
            userId,
            kresId,
            mode,
            asset: pending.assets[0],
            extra: { assetCount: pending.assets.length },
          });
        }
      } catch (pendingError) {
        await logGalleryError({
          stage: 'PICKER_IMAGE_PENDING_READ_ERROR',
          error: pendingError,
          userId,
          kresId,
          mode,
        });
      }
    }

    await finishAttempt('completed', {
      resultType: result?.canceled ? 'canceled' : 'selected',
      assetCount: result?.assets?.length || 0,
    });
    return result;
  } catch (imagePickerError) {
    const isTimeout = imagePickerError?.code === 'PICKER_TIMEOUT';
    console.error(
      'Galeri medya seçici başarısız:',
      imagePickerError?.message || imagePickerError
    );
    await finishAttempt(isTimeout ? 'timeout' : 'error', { fallback: 'none' });
    await logGalleryError({
      stage: 'PICKER_IMAGE',
      error: imagePickerError,
      userId,
      kresId,
      mode,
      extra: { fallback: 'none', timeout: isTimeout },
    });
    return { canceled: true, assets: [], failed: true };
  }
}


/**
 * Android ImagePicker için profil/yemek gibi tek fotoğraflık akışların ortak güvenli girişi.
 * Native Activity yeniden oluşturulursa pending sonucu da kontrol eder.
 */
export async function launchSafeImagePicker({
  userId = '',
  kresId = '',
  mode = 'image',
  ...pickerOptions
} = {}) {
  const finishAttempt = await startGalleryPickerAttempt({
    stage: 'IMAGE_PICKER',
    userId,
    kresId,
    mode,
  });

  try {
    await logGalleryEvent({
      stage: 'IMAGE_PICKER_LAUNCH',
      userId,
      kresId,
      mode,
      extra: { platform: Platform.OS },
    });
    crashLog('ImagePicker.launchImageLibraryAsync çağrılıyor: ' + mode);

    let result = await withTimeout(
      ImagePicker.launchImageLibraryAsync(pickerOptions),
      PICKER_TIMEOUT_MS,
      'ImagePicker'
    );

    // Android MainActivity yeniden oluşturulduysa Expo pending sonucu burada tutabilir.
    try {
      const pending = await ImagePicker.getPendingResultAsync();
      if (pending?.assets?.length && (!result || result.canceled || !result.assets?.length)) {
        result = pending;
        await logGalleryEvent({
          stage: 'IMAGE_PICKER_PENDING_RECOVERED',
          userId,
          kresId,
          mode,
          asset: pending.assets[0],
          extra: { assetCount: pending.assets.length },
        });
      }
    } catch (pendingError) {
      await logGalleryError({
        stage: 'IMAGE_PICKER_PENDING_READ_ERROR',
        error: pendingError,
        userId,
        kresId,
        mode,
      });
    }

    await logGalleryEvent({
      stage: result?.canceled ? 'IMAGE_PICKER_CANCELED' : 'IMAGE_PICKER_RETURNED',
      userId,
      kresId,
      mode,
      asset: result?.assets?.[0],
      extra: { assetCount: result?.assets?.length || 0 },
    });
    await finishAttempt('completed', {
      resultType: result?.canceled ? 'canceled' : 'selected',
      assetCount: result?.assets?.length || 0,
    });
    return result;
  } catch (error) {
    const isTimeout = error?.code === 'PICKER_TIMEOUT';
    await logGalleryError({
      stage: isTimeout ? 'IMAGE_PICKER_TIMEOUT' : 'IMAGE_PICKER_ERROR',
      error,
      userId,
      kresId,
      mode,
    });
    await finishAttempt(isTimeout ? 'timeout' : 'error');
    throw error;
  }
}
