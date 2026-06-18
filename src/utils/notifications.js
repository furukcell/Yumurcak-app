// ============================================================
// YUMURCAK — notifications.js
// Push bildirim sistemi
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ref, set, get } from 'firebase/database';
import { database, auth } from '../config/firebase';
import { ROLLER } from '../../constants';

// Bildirim handler'ı ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Push notification için izin iste ve token al
 */
export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.warn('Bildirim için fiziksel cihaz gerekli');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3C3489',
      });
    }

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

    // TODO: Expo Project ID eklendiğinde projectId parametresini ekle
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
 * @param {string} userId - Kullanıcı ID (Firebase Auth uid)
 */
export async function savePushTokenToDatabase(token, userId) {
  try {
    if (!token || !userId) {
      console.warn('Token veya userId eksik');
      return;
    }

   const userRef = ref(database, `kullanicilar/${userId}/pushToken`);
   await set(userRef, token);
  
    
    console.log('Push token kaydedildi');
  } catch (error) {
    console.warn('Push token kaydedilemedi:', error.message);
  }
}

/**
 * Bildirim gönder
 * TODO: Expo Project ID eklendiğinde aktif edilecek
 */
export async function sendNotification(toToken, title, body, data = {}) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toToken,
        title,
        body,
        data,
        sound: 'default',
      }),
    });

    return await response.json();
  } catch (error) {
    console.warn('Bildirim gönderilemedi:', error.message);
    return null;
  }
}

/**
 * Tüm velilere bildirim gönder
 * TODO: Duyuru sistemi aktif edildiğinde kullanılacak
 */
export async function broadcastNotificationToParents(title, body, data = {}) {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return;

    const users = snapshot.val();
    const tokens = [];

    Object.values(users).forEach(user => {
     if (user.rol === ROLLER.VELI && user.pushToken) {
        tokens.push(user.pushToken);
      }
    });

    const promises = tokens.map(token => 
      sendNotification(token, title, body, data)
    );

    await Promise.all(promises);
  } catch (error) {
    console.warn('Toplu bildirim gönderilemedi:', error.message);
  }
}
