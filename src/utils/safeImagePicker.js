import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export async function launchSafeGalleryPicker(options = {}) {
  // Android'de Vivo gibi cihazlarda ImagePicker native picker
  // çökebildiği için DocumentPicker kullanıyoruz.
  if (Platform.OS === 'android') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'video/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return {
        canceled: true,
        assets: [],
      };
    }

    return {
      canceled: false,
      assets: result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        fileName: asset.name,
        mimeType: asset.mimeType,
        type: asset.mimeType?.startsWith('video/') ? 'video' : 'image',
        size: asset.size,
      })),
    };
  }

  // iOS'ta mevcut sistemi aynen koruyoruz.
  return ImagePicker.launchImageLibraryAsync(options);
}
