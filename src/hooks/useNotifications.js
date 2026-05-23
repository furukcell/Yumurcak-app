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
      const data = response.notification.request.content.data;
      
      // Rapor bildirimi ise rapor ekranına git
      if (data.type === 'report') {
        navigation.navigate('ChildReport', { childId: data.childId });
      }
      // Duyuru bildirimi ise duyuru ekranına git
      else if (data.type === 'announcement') {
        navigation.navigate('AnnouncementList');
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [navigation]);
}
