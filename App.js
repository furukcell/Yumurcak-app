import { useEffect } from 'react';
import { registerForPushNotificationsAsync, savePushTokenToDatabase } from './src/utils/notifications';
import { auth } from './src/config/firebase';

export default function App() {
  useEffect(() => {
    // Kullanıcı giriş yaptığında token kaydet
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushTokenToDatabase(token);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
