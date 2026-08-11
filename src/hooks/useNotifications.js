import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

export default function useNotifications() {
  const navigation = useNavigation();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Bildirim geldiğinde
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Bildirim alındı:', notification);
    });

    // Bildirime tıklandığında
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};

      // Backend (functions/index.js) her bildirimde routeName + routeParams gönderiyor.
      // Eskiden burada data.type kontrol ediliyordu ama backend hiç 'type' alanı
      // göndermiyor (tip/routeName gönderiyor) — bu yüzden hiçbir bildirim yönlendirme yapmıyordu.
      if (data.routeName) {
        navigation.navigate(data.routeName, data.routeParams || undefined);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [navigation]);
}
