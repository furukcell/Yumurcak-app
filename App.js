// ============================================================
// YUMURCAK — App.js
// SafeAreaProvider + StatusBar + Push token + Android navigation bar + Notification deep links
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { crashLog, crashRecordError, crashSetCollectionEnabled } from './src/utils/crashlyticsSafe';
import { recoverPendingImagePickerResult } from './src/utils/safeImagePicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import './src/i18n';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import {
  NavigationContainer,
  useNavigationContainerRef,
  useNavigationState,
} from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { startUsageTracking, stopUsageTracking, trackScreen } from './src/services/usageTracker';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
} from './src/utils/notifications';
import {
  YUMURCAK_LINKING,
  getNotificationNavigationTarget,
} from './src/utils/notificationDeepLinks';

// ------------------------------------------------------------
// Crashlytics kurulumu
// Crashlytics JS modülü burada import edilmez; uygulama render olduktan
// sonra güvenli wrapper üzerinden lazy olarak yüklenir. Böylece native
// module yükleme problemi uygulamanın açılışını engelleyemez.
// ------------------------------------------------------------


export default function App() {
  useEffect(() => {
    if (__DEV__) return;

    crashSetCollectionEnabled(true);

    const defaultGlobalHandler = global.ErrorUtils?.getGlobalHandler?.();
    global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
      crashLog('GlobalHandler isFatal=' + String(isFatal));
      crashRecordError(error instanceof Error ? error : new Error(String(error)));
      defaultGlobalHandler?.(error, isFatal);
    });

    const defaultRejectionHandler = global.HermesInternal
      ? null
      : global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      const reason = event?.reason ?? event;
      crashLog('UnhandledPromiseRejection');
      crashRecordError(reason instanceof Error ? reason : new Error(String(reason)));
      defaultRejectionHandler?.(event);
    };

    return () => {
      global.ErrorUtils?.setGlobalHandler?.(defaultGlobalHandler);
      global.onunhandledrejection = defaultRejectionHandler;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    recoverPendingImagePickerResult({ mode: 'app_start' }).catch((error) => {
      console.warn('Pending ImagePicker sonucu okunamadı:', error?.message || error);
    });
  }, []);

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
  const navigationRef = useNavigationContainerRef();

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <NavigationContainer ref={navigationRef} linking={YUMURCAK_LINKING}>
              <UsageTrackingBridge />
              <PushTokenSync />
              <NotificationDeepLinkHandler navigationRef={navigationRef} />
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

function getNotificationResponseId(response) {
  const request = response?.notification?.request;
  const identifier = request?.identifier;
  if (identifier) return String(identifier);

  const data = request?.content?.data || {};
  const date = response?.notification?.date || '';
  return String(date) + ':' + JSON.stringify(data);
}

function NotificationDeepLinkHandler({ navigationRef }) {
  const { kullanici } = useAuth();
  const role = kullanici?.rol;
  const navigationState = useNavigationState((state) => state);

  const pendingResponseRef = useRef(null);
  const handledIdsRef = useRef(new Set());
  const [, setNotificationQueueVersion] = useState(0);
  const flushingRef = useRef(false);

  const queueResponse = useCallback((response) => {
    if (!response) return;
    if (
      response.actionIdentifier &&
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }

    const id = getNotificationResponseId(response);
    if (handledIdsRef.current.has(id)) return;

    const data = response?.notification?.request?.content?.data || {};
    if (!data || typeof data !== 'object') return;

    pendingResponseRef.current = { id, data };
    setNotificationQueueVersion((version) => version + 1);
  }, []);

  const flushPendingResponse = useCallback(async () => {
    if (flushingRef.current || !pendingResponseRef.current) return;
    if (!kullanici?.id && !kullanici?.uid) return;
    if (!navigationRef?.isReady?.()) return;

    const pending = pendingResponseRef.current;
    const target = getNotificationNavigationTarget(pending.data, role);

    if (!target?.routeName) {
      console.warn('Bildirim için geçerli navigation hedefi bulunamadı:', pending.data);
      pendingResponseRef.current = null;
      try {
        await Notifications.clearLastNotificationResponseAsync?.();
      } catch {}
      return;
    }

    flushingRef.current = true;

    try {
      if (target.params === undefined) {
        navigationRef.navigate(target.routeName);
      } else {
        navigationRef.navigate(target.routeName, target.params);
      }

      handledIdsRef.current.add(pending.id);
      if (handledIdsRef.current.size > 50) {
        const firstId = handledIdsRef.current.values().next().value;
        if (firstId) handledIdsRef.current.delete(firstId);
      }

      pendingResponseRef.current = null;

      // Navigation başlatıldıktan sonra native last-response kaydını temizliyoruz.
      // Uygulama navigation hazır olmadan kapanırsa response yeniden alınabilir.
      try {
        await Notifications.clearLastNotificationResponseAsync?.();
      } catch {}
    } catch (error) {
      console.warn('Bildirim navigation hatası:', error?.message || error);
    } finally {
      flushingRef.current = false;
    }
  }, [kullanici?.id, kullanici?.uid, navigationRef, role]);

  useEffect(() => {
    let cancelled = false;

    const handleInitialResponse = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync?.();
        if (!cancelled && response) {
          queueResponse(response);
        }
      } catch (error) {
        console.warn('İlk bildirim yönlendirmesi okunamadı:', error?.message || error);
      }
    };

    handleInitialResponse();

    const subscription = Notifications.addNotificationResponseReceivedListener(queueResponse);

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, [queueResponse]);

  // Auth ve RootNavigator değiştiğinde tekrar deniyoruz. Kurumun 3 saniyelik
  // splash ekranı aynen kalır; navigationRef.isReady() false olduğu sürece
  // pending bildirim sadece kuyrukta bekler.
  useEffect(() => {
    flushPendingResponse();
  }, [flushPendingResponse, navigationState]);

  return null;
}
