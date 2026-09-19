import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { crashLog } from './crashlyticsSafe';
import { logGalleryError, logGalleryEvent, startGalleryPickerAttempt } from './galleryErrorLogger';

const PICKER_TIMEOUT_MS = 12000;

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

  // Android ve iOS'ta aynı native ImagePicker akışını kullanıyoruz.
  // Native taraftaki hatalar doğrudan JS catch'e düşer ve Crashlytics'e kaydedilir.
  const finishAttempt = await startGalleryPickerAttempt({
    stage: 'PICKER_IMAGE',
    userId,
    kresId,
    mode,
  });

  try {
    crashLog('ImagePicker.launchImageLibraryAsync çağrılıyor: ' + mode);

    const result = await ImagePicker.launchImageLibraryAsync({
      ...pickerOptions,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: pickerOptions.selectionLimit || 10,
      allowsEditing: false,
    });

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
    await logGalleryError({
      stage: 'PICKER_IMAGE_ERROR',
      error,
      userId,
      kresId,
      mode,
      extra: { fallback: 'none' },
    });
    await finishAttempt('error', { fallback: 'none' });
    throw error;
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
