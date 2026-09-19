import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
 * Not: Native taraftaki Activity gerçekten hiç sonuç döndürmezse (bazı
 * OEM dosya seçicilerinde gözlemlediğimiz "sessiz takılma"), orijinal
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
 * Android medya seçimini cihazlar arası daha güvenli hale getirir.
 *
 * Bazı üreticilerin (özellikle bazı Vivo/Xiaomi yazılımlarının) native
 * ImagePicker ekranında çökme yaşatabildiği cihazlarda DocumentPicker
 * kullanıyoruz. DocumentPicker'da da üreticiye özel sorun olursa ImagePicker
 * yedek olarak deneniyor.
 *
 * TEŞHİS: Bazı cihazlarda seçici (DocumentPicker) hiçbir exception
 * fırlatmadan, hiç sonuç döndürmeden "sessizce" takılıyor — uygulama
 * arka plana düşüyor ama geri gelmiyor. Bu durumda normal try/catch
 * hiç tetiklenmez ve Firebase'e hiçbir kayıt düşmez. Bunu görünür
 * kılmak için:
 *   1. Her denemenin BAŞLADIĞI anında (sonucu ne olursa olsun) bir
 *      Firebase kaydı açılıyor (status: 'started', cihaz/OS bilgisiyle).
 *   2. Belirli bir süre (PICKER_TIMEOUT_MS) içinde cevap gelmezse bu
 *      JS tarafında "timeout" olarak işaretlenip kayıt güncelleniyor,
 *      ImagePicker'a fallback yapılıyor ve kullanıcıya tekrar denemesi
 *      söyleniyor.
 * Böylece hem gerçek zamanlı kanıt biriktiriyoruz (hangi cihaz/OS'ta
 * ne sıklıkla takılıyor) hem de kullanıcıyı sonsuza kadar donmuş
 * bırakmıyoruz.
 */
export async function launchSafeGalleryPicker(options = {}) {
  const { userId = '', kresId = '', mode = '', ...pickerOptions } = options;

  if (Platform.OS !== 'android') {
    return ImagePicker.launchImageLibraryAsync(pickerOptions);
  }

  const finishDocumentAttempt = await startGalleryPickerAttempt({
    stage: 'PICKER_DOCUMENT',
    userId,
    kresId,
    mode,
  });

  try {
    crashLog('DocumentPicker.getDocumentAsync çağrılıyor');
    // NOT: type olarak ['image/*','video/*'] gibi bir dizi + multiple:true
    // kombinasyonu bazı OEM dosya seçicilerinde (ör. HyperOS/MIUI
    // DocumentsUI) seçici açılır açılmaz sonuç dönmeden kapanmasına
    // (sessiz hang) yol açabiliyor. Tek '*/*' tipiyle açıp filtrelemeyi
    // burada JS tarafında yapıyoruz.
    const result = await withTimeout(
      DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      }),
      PICKER_TIMEOUT_MS,
      'DocumentPicker'
    );

    if (!result.canceled) {
      const assets = (result.assets || [])
        .filter((asset) => {
          if (!asset?.uri) return false;
          const mime = asset.mimeType || '';
          return mime.startsWith('image/') || mime.startsWith('video/');
        })
        .map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          fileName: asset.name,
          mimeType: asset.mimeType || '',
          type: asset.mimeType?.startsWith('video/') ? 'video' : 'image',
          size: asset.size || 0,
        }));

      await finishDocumentAttempt('completed', { resultType: 'selected', assetCount: assets.length });
      return { canceled: false, assets };
    }

    await finishDocumentAttempt('completed', { resultType: 'canceled' });
    return { canceled: true, assets: [] };
  } catch (documentPickerError) {
    const isTimeout = documentPickerError?.code === 'PICKER_TIMEOUT';
    console.warn(
      'Android DocumentPicker başarısız, ImagePicker deneniyor:',
      documentPickerError?.message || documentPickerError
    );
    await finishDocumentAttempt(isTimeout ? 'timeout' : 'error', {
      fallback: 'image-picker',
    });
    await logGalleryError({
      stage: 'PICKER_DOCUMENT',
      error: documentPickerError,
      userId,
      kresId,
      mode,
      extra: { fallback: 'image-picker', timeout: isTimeout },
    });

    const finishImageAttempt = await startGalleryPickerAttempt({
      stage: 'PICKER_IMAGE',
      userId,
      kresId,
      mode,
    });

    try {
      crashLog('Fallback: ImagePicker.launchImageLibraryAsync çağrılıyor');
      const result = await withTimeout(
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
      await finishImageAttempt('completed', {
        resultType: result.canceled ? 'canceled' : 'selected',
        assetCount: result.assets?.length || 0,
      });
      return result;
    } catch (imagePickerError) {
      const imageIsTimeout = imagePickerError?.code === 'PICKER_TIMEOUT';
      console.error(
        'Android medya seçici tamamen başarısız:',
        imagePickerError?.message || imagePickerError
      );
      await finishImageAttempt(imageIsTimeout ? 'timeout' : 'error', { fallback: 'none' });
      await logGalleryError({
        stage: 'PICKER_IMAGE',
        error: imagePickerError,
        userId,
        kresId,
        mode,
        extra: { fallback: 'none', timeout: imageIsTimeout },
      });
      return { canceled: true, assets: [], failed: true };
    }
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
