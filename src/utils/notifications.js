import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ref, set, get } from 'firebase/database';
import { db, auth } from '../config/firebase';

// Bildirim ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// İzin al
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3C3489',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni alınamadı');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_EXPO_PROJECT_ID', // Expo proje ID'n
    })).data;
    
    console.log('Push Token:', token);
  } else {
    console.log('Fiziksel cihaz gerekli');
  }

  return token;
}

// Token'ı Firebase'e kaydet
export async function savePushTokenToDatabase(token) {
  const user = auth.currentUser;
  if (!user || !token) return;

  const userRole = getUserRole(); // AuthContext'ten al
  const userRef = ref(db, `users/${user.uid}`);
  
  await set(userRef, {
    pushToken: token,
    role: userRole,
    updatedAt: Date.now(),
  });
}

// Kullanıcı rolünü al (AuthContext'ten)
function getUserRole() {
  const userData = auth.currentUser;
  return userData?.role || 'parent';
}

// Bildirim gönder (Admin/Teacher tarafından)
export async function sendNotification(toToken, title, body, data = {}) {
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

  return response.json();
}

// Tüm velilere bildirim gönder (Duyuru için)
export async function broadcastNotificationToParents(title, body, data = {}) {
  const parentsRef = ref(db, 'users');
  const snapshot = await get(parentsRef);
  
  if (!snapshot.exists()) return;

  const parents = snapshot.val();
  const tokens = [];

  Object.values(parents).forEach(parent => {
    if (parent.role === 'parent' && parent.pushToken) {
      tokens.push(parent.pushToken);
    }
  });

  // Her bir token'a gönder
  const promises = tokens.map(token => 
    sendNotification(token, title, body, data)
  );

  await Promise.all(promises);
}
