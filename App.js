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
    // Kullanıcı giriş yaptığında push token kaydet
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushTokenToDatabase(token);
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
