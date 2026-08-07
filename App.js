// ============================================================
// YUMURCAK — App.js
// SafeAreaProvider + StatusBar + Push token + Android navigation bar + Notification deep links
// ============================================================
import { useEffect, useRef } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
} from './src/utils/notifications';
import {
  YUMURCAK_LINKING,
  getNotificationUrlFromData,
} from './src/utils/notificationDeepLinks';

async function openNotificationUrl(data, role) {
  const url = getNotificationUrlFromData(data, role);
  if (!url) return;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn('Bildirim linki açılamadı:', url, error?.message || error);
  }
}

export default function App() {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.warn('OTA güncelleme hatası:', error);
      }
    };
    checkForUpdates();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const hideAndroidNavigationBar = async () => {
      try {
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBackgroundColorAsync('transparent');
        await NavigationBar.setButtonStyleAsync('dark');
      } catch (error) {
        console.warn('Android navigation bar gizlenemedi:', error);
      }
    };
    hideAndroidNavigationBar();
  }, []);

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer linking={YUMURCAK_LINKING}>
            <PushTokenSync />
            <NotificationDeepLinkHandler />
            <StatusBar style="dark" backgroundColor="#F8F6FF" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

function PushTokenSync() {
  const { kullanici } = useAuth();
  const syncingRef = useRef(false);
  const lastTokenOwnerRef = useRef('');

  useEffect(() => {
    const userId = kullanici?.id || kullanici?.uid;
    const authUid = kullanici?.authUid || '';
    if (!userId) return undefined;

    let cancelled = false;

    const syncToken = async () => {
      if (syncingRef.current || cancelled) return;
      syncingRef.current = true;

      try {
        const token = await registerForPushNotificationsAsync();
        if (!token || cancelled) return;

        const tokenOwnerKey = `${userId}:${authUid || 'legacy'}:${token}`;
        if (lastTokenOwnerRef.current === tokenOwnerKey) return;

        await savePushTokenToDatabase(token, userId, authUid);
        lastTokenOwnerRef.current = tokenOwnerKey;
      } catch (error) {
        console.warn('Bildirim token kaydedilemedi:', error?.message || error);
      } finally {
        syncingRef.current = false;
      }
    };

    syncToken();
    const retryTimer = setTimeout(syncToken, 2500);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncToken();
    });

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      appStateSubscription?.remove?.();
    };
  }, [kullanici?.id, kullanici?.uid, kullanici?.authUid]);

  return null;
}

function NotificationDeepLinkHandler() {
  const { kullanici } = useAuth();
  const role = kullanici?.rol;

  useEffect(() => {
    if (!kullanici?.id && !kullanici?.uid) return undefined;

    let cancelled = false;

    const handleResponse = async (response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (!data || cancelled) return;
      await openNotificationUrl(data, role);
    };

    const handleInitialResponse = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync?.();
        if (response && !cancelled) {
          await handleResponse(response);
          await Notifications.clearLastNotificationResponseAsync?.();
        }
      } catch (error) {
        console.warn('İlk bildirim yönlendirmesi okunamadı:', error?.message || error);
      }
    };

    handleInitialResponse();

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, [kullanici?.id, kullanici?.uid, role]);

  return null;
}
