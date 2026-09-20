import { Alert } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { crashLog } from './crashlyticsSafe';
import { logGalleryError, logGalleryEvent, startGalleryPickerAttempt } from './galleryErrorLogger';

const deviceBrand = Device.brand?.toLowerCase();
const isXiaomi = ['xiaomi', 'redmi', 'poco'].includes(deviceBrand);

function showCameraPrompt() {
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

async function launchCamera({ userId, kresId, mode }) {
  const shouldOpenCamera = await showCameraPrompt();

  if (!shouldOpenCamera) {
    await logGalleryEvent({
      stage: 'CAMERA_FALLBACK_CANCELED',
      userId,
      kresId,
      mode,
      extra: { reason: 'user_cancelled' },
    });

    return { canceled: true, assets: [] };
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    await logGalleryEvent({
      stage: 'CAMERA_PERMISSION_DENIED',
      userId,
      kresId,
      mode,
    });

    Alert.alert(
      'Kamera izni gerekli',
      'Fotoğraf çekebilmek için Yumurcak kamera iznine ihtiyaç duyuyor.'
    );

    return { canceled: true, assets: [] };
  }

  try {
    crashLog('Xiaomi/Redmi/POCO kamera açılıyor: ' + mode);

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      exif: false,
      base64: false,
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
    });
    throw error;
  }
}

async function pickFromLibrary(options, context) {
  // Xiaomi/Redmi/POCO cihazlarda sorunlu galeri picker'ını hiç açma.
  if (isXiaomi) {
    return launchCamera(context);
  }

  // Normal cihazlarda tek ve doğrudan ImagePicker çağrısı.
  return ImagePicker.launchImageLibraryAsync({
    ...options,
    allowsEditing: false,
    exif: false,
    base64: false,
  });
}

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

    const result = await pickFromLibrary(
      {
        ...pickerOptions,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: pickerOptions.selectionLimit || 10,
      },
      { userId, kresId, mode }
    );

    await logGalleryEvent({
      stage: result?.canceled ? 'IMAGE_PICKER_CANCELED' : 'IMAGE_PICKER_RETURNED',
      userId,
      kresId,
      mode,
      asset: result?.assets?.[0],
      extra: {
        assetCount: result?.assets?.length || 0,
        deviceBrand: deviceBrand || 'unknown',
        xiaomi: isXiaomi,
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
    });

    await finishAttempt('error');
    throw error;
  }
}

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
        deviceBrand: deviceBrand || 'unknown',
        xiaomi: isXiaomi,
      },
    });

    const result = await pickFromLibrary(
      {
        ...pickerOptions,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      },
      { userId, kresId, mode }
    );

    await logGalleryEvent({
      stage: result?.canceled ? 'IMAGE_PICKER_CANCELED' : 'IMAGE_PICKER_RETURNED',
      userId,
      kresId,
      mode,
      asset: result?.assets?.[0],
      extra: {
        assetCount: result?.assets?.length || 0,
        deviceBrand: deviceBrand || 'unknown',
        xiaomi: isXiaomi,
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
