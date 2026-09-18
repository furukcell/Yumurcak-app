import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { logGalleryError } from './galleryErrorLogger';

/**
 * Android medya seçimini cihazlar arası daha güvenli hale getirir.
 *
 * Bazı üreticilerin (özellikle bazı Vivo/Xiaomi yazılımlarının) native
 * ImagePicker ekranında çökme yaşatabildiği cihazlarda DocumentPicker
 * kullanıyoruz. DocumentPicker'da da üreticiye özel sorun olursa ImagePicker
 * yedek olarak deneniyor.
 */
export async function launchSafeGalleryPicker(options = {}) {
  if (Platform.OS !== 'android') {
    return ImagePicker.launchImageLibraryAsync(options);
  }

  const documentPickerType = ['image/*', 'video/*'];

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: documentPickerType,
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      return {
        canceled: false,
        assets: (result.assets || [])
          .filter((asset) => asset?.uri)
          .map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            fileName: asset.name,
            mimeType: asset.mimeType || '',
            type: asset.mimeType?.startsWith('video/') ? 'video' : 'image',
            size: asset.size || 0,
          })),
      };
    }

    return {
      canceled: true,
      assets: [],
    };
  } catch (documentPickerError) {
    console.warn(
      'Android DocumentPicker başarısız, ImagePicker deneniyor:',
      documentPickerError?.message || documentPickerError
    );
    await logGalleryError({
      stage: 'PICKER_DOCUMENT',
      error: documentPickerError,
      extra: { fallback: 'image-picker' },
    });

    try {
      return await ImagePicker.launchImageLibraryAsync({
        ...options,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: options.selectionLimit || 10,
        allowsEditing: false,
      });
    } catch (imagePickerError) {
      console.error(
        'Android medya seçici tamamen başarısız:',
        imagePickerError?.message || imagePickerError
      );
      await logGalleryError({
        stage: 'PICKER_IMAGE',
        error: imagePickerError,
        extra: { fallback: 'none' },
      });
      return {
        canceled: true,
        assets: [],
      };
    }
  }
}
