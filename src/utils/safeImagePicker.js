import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function launchSafeGalleryPicker(options = {}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return {
      canceled: true,
      assets: [],
      permissionDenied: true,
    };
  }

  const pickerOptions = {
    ...options,
  };

  // Android'de Vivo gibi bazı cihazlarda modern sistem picker
  // uygulamanın kapanmasına sebep olabildiği için legacy picker kullanılır.
  if (Platform.OS === 'android') {
    pickerOptions.legacy = true;
  }

  return ImagePicker.launchImageLibraryAsync(pickerOptions);
}
