// ============================================================
// YUMURCAK — App.js
// SafeAreaProvider + StatusBar + Push token + Android navigation bar
// ============================================================
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
} from './src/utils/notifications';

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
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <PushTokenSync />
          <StatusBar style="dark" backgroundColor="#F8F6FF" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function PushTokenSync() {
  const { kullanici } = useAuth();

  useEffect(() => {
    if (!kullanici?.id && !kullanici?.uid) return;

    let cancelled = false;

    const syncToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token || cancelled) return;

        await savePushTokenToDatabase(token, kullanici.id || kullanici.uid);
      } catch (error) {
        console.warn('Bildirim token kaydedilemedi:', error);
      }
    };

    syncToken();

    return () => {
      cancelled = true;
    };
  }, [kullanici?.id, kullanici?.uid]);

  return null;
}
