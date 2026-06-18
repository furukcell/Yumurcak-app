// ============================================================
// YUMURCAK — notifications.js
// Push bildirim sistemi (şimdilik pasif)
// TODO: Expo Project ID eklendiğinde aktif edilecek
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';

// Bildirim handler'ı ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Push notification için izin iste ve token al
 * Şu an pasif - projectId yoksa null döner
 */
export async function registerForPushNotificationsAsync() {
  try {
    // Fiziksel cihaz kontrolü
    if (!Device.isDevice) {
      console.warn('Bildirim için fiziksel cihaz gerekli');
      return null;
    }

    // Android için notification channel oluştur
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Bildirim izni kontrol et
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Bildirim izni verilmedi');
      return null;
    }

    // Token al (projectId yoksa null döner)
    // TODO: Expo Project ID eklendiğinde aktif et
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    
    if (token) {
      console.log('Push token alındı:', token);
    }

    return token || null;
  } catch (error) {
    console.warn('Bildirim token alınamadı:', error.message);
    return null;
  }
}

/**
 * Push token'ı Firebase'e kaydet
 * @param {string} token - Expo push token
 * @param {string} userId - Kullanıcı ID
 * @param {string} role - Kullanıcı rolü (admin, teacher, parent)
 */
export async function savePushTokenToDatabase(token, userId, role = 'parent') {
  try {
    if (!token || !userId) {
      console.warn('Token veya userId eksik');
      return;
    }

    const tokenRef = ref(database, `users/${userId}`);
    await set(tokenRef, {
      pushToken: token,
      role: role,
      updatedAt: Date.now(),
    });
    
    console.log('Push token kaydedildi');
  } catch (error) {
    console.warn('Push token kaydedilemedi:', error.message);
  }
}

/**
 * Bildirim gönder (şu an pasif)
 * TODO: Backend fonksiyonu eklendiğinde aktif edilecek
 */
export async function sendNotification(toToken, title, body, data = {}) {
  console.warn('Bildirim gönderme şu an pasif');
  return;
}

/**
 * Tüm velilere bildirim gönder (şu an pasif)
 * TODO: Duyuru sistemi aktif edildiğinde kullanılacak
 */
export async function broadcastNotificationToParents(title, body, data = {}) {
  console.warn('Toplu bildirim gönderme şu an pasif');
  return;
}
