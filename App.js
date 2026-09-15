// ============================================================
// YUMURCAK — App.js
// SafeAreaProvider + StatusBar + Push token + Android navigation bar + Notification deep links
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import './src/i18n';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationContainer, useNavigationState } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { startUsageTracking, stopUsageTracking, trackScreen } from './src/services/usageTracker';
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
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;
        await Updates.fetchUpdateAsync();

        Alert.alert(
          '🧸 Yumurcak Güncellemesi',
          'Yeni bir güncelleme hazır. Uygulamayı şimdi güncellemek ister misiniz?',
          [
            { text: 'Daha Sonra', style: 'cancel' },
            { text: 'Güncelle', onPress: () => Updates.reloadAsync() },
          ],
        );
      } catch (error) {
        console.warn('OTA güncelleme hatası:', error);
      }
    };

    checkForUpdates();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let hideTimeoutId = null;
    const hideAndroidNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
      } catch (error) {
        console.warn('Android navigation bar gizlenemedi:', error);
      }
    };

    hideAndroidNavigationBar();

    const subscription = NavigationBar.addVisibilityListener(({ visibility }) => {
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }
      if (visibility === 'visible') {
        hideTimeoutId = setTimeout(() => hideAndroidNavigationBar(), 3000);
      }
    });

    return () => {
      if (hideTimeoutId) clearTimeout(hideTimeoutId);
      subscription.remove();
    };
  }, []);

  const [navKey, setNavKey] = useState(0);

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <NavigationContainer linking={YUMURCAK_LINKING}>
              <UsageTrackingBridge />
              <PushTokenSync />
              <NotificationDeepLinkHandler />
              <StatusBar style="dark" backgroundColor="#F8F6FF" />
              <ErrorBoundary onRetry={() => setNavKey((k) => k + 1)}>
                <RootNavigator key={navKey} />
              </ErrorBoundary>
            </NavigationContainer>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

function getActiveRouteName(state) {
  let current = state;
  while (current?.routes?.[current.index ?? 0]) {
    const route = current.routes[current.index ?? 0];
    if (!route.state) return route.name;
    current = route.state;
  }
  return undefined;
}

function UsageTrackingBridge() {
  const { kullanici } = useAuth();
  const navigationState = useNavigationState((state) => state);
  const lastRouteRef = useRef('');
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!kullanici?.id && !kullanici?.uid) {
      stopUsageTracking();
      cleanupRef.current?.();
      cleanupRef.current = null;
      return undefined;
    }

    cleanupRef.current?.();
    cleanupRef.current = startUsageTracking(kullanici);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      stopUsageTracking();
    };
  }, [kullanici?.id, kullanici?.uid, kullanici?.kresId, kullanici?.rol]);

  useEffect(() => {
    if (!kullanici?.id && !kullanici?.uid) return;

    const routeName = getActiveRouteName(navigationState);
    if (!routeName || routeName === lastRouteRef.current) return;

    lastRouteRef.current = routeName;
    trackScreen(routeName);
  }, [navigationState, kullanici?.id, kullanici?.uid]);

  useEffect(() => {
    if (kullanici?.id || kullanici?.uid) return;
    lastRouteRef.current = '';
  }, [kullanici?.id, kullanici?.uid]);

  return null;
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
