import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { crashLog } from './crashlyticsSafe';
import { logGalleryError, logGalleryEvent, startGalleryPickerAttempt } from './galleryErrorLogger';

const XIAOMI_MANUFACTURERS = ['xiaomi', 'redmi', 'poco'];

function isXiaomiFamilyDevice() {
  if (Platform.OS !== 'android') return false;

  const values = [
    Device.manufacturer,
    Device.brand,
    Device.modelName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return values.some((value) =>
    XIAOMI_MANUFACTURERS.some(
      (name) => value === name || value.startsWith(name + ' ') || value.startsWith(name + '-')
    )
  );
}

function showCameraFallbackDialog() {
  return new Promise((resolve) => {
    Alert.alert(
      'Fotoğraf seçimi',
      'Bu cihazda galeriden fotoğraf seçimi kullanılamıyor. Kameradan fotoğraf çekmek ister misin?',
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Kameradan Çek',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false }
    );
  });
}

async function launchCameraFallback({ userId, kresId, mode }) {
  const shouldOpenCamera = await showCameraFallbackDialog();
  if (!shouldOpenCamera) {
    return { canceled: true, assets: [] };
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    await logGalleryEvent({
      stage: 'CAMERA_PERMISSION_DENIED',
      userId,
      kresId,
      mode,
      extra: { fallback: 'camera' },
    });

    Alert.alert(
      'Kamera izni gerekli',
      'Fotoğraf çekebilmek için Yumurcak kamera iznine ihtiyaç duyuyor.'
    );

    return { canceled: true, assets: [] };
  }

  try {
    crashLog('Xiaomi/Redmi/POCO kamera fallback açılıyor: ' + mode);

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.78,
      cameraType: ImagePicker.CameraType.back,
    });

    await logGalleryEvent({
      stage: result?.canceled ? 'CAMERA_FALLBACK_CANCELED' : 'CAMERA_FALLBACK_RETURNED',
      userId,
      kresId,
      mode,
      asset: result?.assets?.[0],
      extra: { assetCount: result?.assets?.length || 0 },
    });

    return result;
  } catch (error) {
    await logGalleryError({
      stage: 'CAMERA_FALLBACK_ERROR',
      error,
      userId,
      kresId,
      mode,
      extra: { fallback: 'camera' },
    });
    throw error;
  }
}

async function launchLibrary(options, { userId, kresId, mode, multiple = false }) {
  if (isXiaomiFamilyDevice()) {
    return launchCameraFallback({ userId, kresId, mode });
  }

  return ImagePicker.launchImageLibraryAsync({
    ...options,
    allowsEditing: false,
    exif: false,
    base64: false,
    ...(multiple
      ? {
          allowsMultipleSelection: true,
          selectionLimit: options.selectionLimit || 10,
        }
      : {}),
  });
}

/**
 * Galeri yükleme akışı.
 *
 * Android'de DocumentPicker/fallback zinciri yoktur. Normal cihazlarda tek
 * ImagePicker çağrısı kullanılır. Xiaomi/Redmi/POCO cihazlarda sistem
 * galerisindeki bilinen çökme yoluna hiç girilmez; kullanıcıya kamera
 * fallback'i sunulur.
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
    crashLog('ImagePicker.launchImageLibraryAsync çağrılıyor: ' + mode);

    const result = await launchLibrary(
      {
        ...pickerOptions,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
      },
      { userId, kresId, mode, multiple: true }
    );

    await logGalleryEvent({
      stage: result?.canceled ? 'IMAGE_PICKER_CANCELED' : 'IMAGE_PICKER_RETURNED',
      userId,
      kresId,
      mode,
      asset: result?.assets?.[0],
      extra: {
        assetCount: result?.assets?.length || 0,
        fallback: isXiaomiFamilyDevice() ? 'camera' : 'none',
      },
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
 * Profil/yemek gibi tek fotoğraflık seçimler için ortak güvenli giriş.
 *
 * Android MainActivity yeniden oluşturulursa Expo'nun pending sonucu kontrol edilir.
 * Xiaomi/Redmi/POCO cihazlarda galeri picker'ı hiç açılmaz; kamera fallback'i kullanılır.
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
      extra: {
        platform: Platform.OS,
        xiaomiFamily: isXiaomiFamilyDevice(),
      },
    });

    crashLog('ImagePicker.launchImageLibraryAsync çağrılıyor: ' + mode);

    let result = await launchLibrary(pickerOptions, {
      userId,
      kresId,
      mode,
      multiple: false,
    });

    if (!result?.canceled && !result?.assets?.length) {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending?.assets?.length) {
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
    }

    await logGalleryEvent({
      stage: result?.canceled ? 'IMAGE_PICKER_CANCELED' : 'IMAGE_PICKER_RETURNED',
      userId,
      kresId,
      mode,
      asset: result?.assets?.[0],
      extra: {
        assetCount: result?.assets?.length || 0,
        fallback: isXiaomiFamilyDevice() ? 'camera' : 'none',
      },
    });

    await finishAttempt('completed', {
      resultType: result?.canceled ? 'canceled' : 'selected',
      assetCount: result?.assets?.length || 0,
    });

    return result;
  } catch (error) {
    await logGalleryError({
      stage: 'IMAGE_PICKER_ERROR',
      error,
      userId,
      kresId,
      mode,
    });
    await finishAttempt('error');
    throw error;
  }
}
