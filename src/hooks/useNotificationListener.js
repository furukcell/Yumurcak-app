import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export default function useNotificationListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      // Arka planda gelen bildirimleri işle
      console.log('Bildirim:', notification);
    });

    return () => {
      Notifications.removeNotificationSubscription(subscription);
    };
  }, []);
}
