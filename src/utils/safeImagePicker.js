import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

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

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
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
            mimeType: asset.mimeType || 'image/jpeg',
            type: 'image',
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

    try {
      return await ImagePicker.launchImageLibraryAsync({
        ...options,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: options.selectionLimit || 10,
        allowsEditing: false,
      });
    } catch (imagePickerError) {
      console.error(
        'Android medya seçici tamamen başarısız:',
        imagePickerError?.message || imagePickerError
      );
      return {
        canceled: true,
        assets: [],
      };
    }
  }
}
