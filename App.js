// ============================================================
// YUMURCAK — App.js
// FAZ 6: SafeAreaProvider + StatusBar düzeni
// Amaç: Android üst bar / alt sistem alanlarının ekranları ezmesini azaltmak
// ============================================================
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
} from './src/utils/notifications';
import { auth } from './src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  useEffect(() => {
    // Firebase Auth durumu değiştiğinde token kaydet
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await registerForPushNotificationsAsync();

          if (token) {
            await savePushTokenToDatabase(token, user.uid);
          }
        } catch (error) {
          console.warn('Bildirim token kaydedilemedi:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#F8F6FF" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
