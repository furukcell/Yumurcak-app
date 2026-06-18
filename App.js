// ============================================================
// YUMURCAK — App.js
// Uygulama giriş noktası
// ============================================================
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { registerForPushNotificationsAsync, savePushTokenToDatabase } from './src/utils/notifications';
import { auth } from './src/config/firebase';

export default function App() {
  useEffect(() => {
    // Firebase Auth durumu değiştiğinde token kaydet
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
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
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
