// ============================================================
// YUMURCAK — notifications.js
// Push bildirim sistemi
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ref, set, get, update } from 'firebase/database';
import { database } from '../config/firebase';
import { ROLLER } from '../constants';
import { findUserIdByAuthUid } from './authHelpers';

const EXPO_PROJECT_ID = '522bbf0b-0a2c-4198-93b8-429848df9a43';

function tokenKeyForDatabase(token = '') {
  return String(token).replace(/[.#$/[\]]/g, '_');
}

// Bildirim handler'ı ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
    const token = tokenData?.data;

    if (token) {
      console.log('Push token alındı:', token);
    } else {
      console.warn('Push token boş döndü');
    }

    return token || null;
  } catch (error) {
    console.warn('Bildirim token alınamadı:', error?.message || error);
    return null;
  }
}

/**
 * Push token'ı Firebase'e kaydet
 * @param {string} token - Expo push token
 * @param {string} userId - legacy kullanıcı id veya Firebase Auth uid
 * @param {string} authUid - Firebase Auth uid
 */
export async function savePushTokenToDatabase(token, userId, authUid = '') {
  try {
    if (!token || !userId) {
      console.warn('Token veya userId eksik');
      return;
    }

    const legacyUserId = authUid ? await findUserIdByAuthUid(authUid) : await findUserIdByAuthUid(userId);
    const resolvedUserId = legacyUserId || userId;
    const now = Date.now();
    const tokenKey = tokenKeyForDatabase(token);

    await update(ref(database, `kullanicilar/${resolvedUserId}`), {
      pushToken: token,
      expoPushToken: token,
      notificationToken: token,
      pushPlatform: Platform.OS,
      pushTokenUpdatedAt: now,
      pushTokenAuthUid: authUid || null,
      pushTokenUserId: resolvedUserId,
      [`pushTokens/${tokenKey}`]: {
        token,
        platform: Platform.OS,
        authUid: authUid || null,
        updatedAt: now,
        active: true,
      },
    });

    const indexKey = authUid || userId;
    await set(ref(database, `authPushTokenIndex/${indexKey}`), {
      userId: resolvedUserId,
      authUid: authUid || null,
      pushToken: token,
      platform: Platform.OS,
      updatedAt: now,
    }).catch(() => null);

    console.log('Push token kaydedildi:', resolvedUserId);
  } catch (error) {
    console.warn('Push token kaydedilemedi:', error?.message || error);
  }
}

/**
 * Tek cihaza push bildirim gönder
 */
export async function sendNotification(toToken, title, body, data = {}) {
  try {
    if (!toToken) return null;

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
        priority: 'high',
        channelId: 'default',
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
 */
export async function broadcastNotificationToParents(title, body, data = {}) {
  try {
    const usersRef = ref(database, 'kullanicilar');
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
