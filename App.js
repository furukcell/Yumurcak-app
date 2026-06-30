// ============================================================
// YUMURCAK — App.js
// SafeAreaProvider + StatusBar + Push token + Android navigation bar + Notification deep links
// ============================================================
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
} from './src/utils/notifications';

const YUMURCAK_LINKING = {
  prefixes: ['yumurcak://'],
  config: {
    screens: {
      Notifications: 'notifications',
      MessageDetail: 'messages/:messageId?',

      ParentDashboard: 'parent/home',
      ParentReports: 'parent/reports',
      ParentAnnouncements: 'parent/announcements',
      ParentMeals: 'parent/meals',
      ParentEvents: 'parent/events',
      ParentAttendance: 'parent/attendance',
      ParentDevelopment: 'parent/development',
      ParentMedical: 'parent/medical',
      ParentService: 'parent/service',
      ParentMessages: 'parent/messages',
      ParentGallery: 'parent/gallery',
      ParentDocuments: 'parent/documents',
      ParentBell: 'parent/bell',
      ParentPayments: 'parent/payments',
      ParentPolls: 'parent/polls',

      TeacherDashboard: 'teacher/home',
      TeacherChildren: 'teacher/children',
      TeacherAttendance: 'teacher/attendance',
      TeacherSchedule: 'teacher/schedule',
      TeacherEvents: 'teacher/events',
      TeacherMeals: 'teacher/meals',
      TeacherDocuments: 'teacher/documents',
      TeacherMedical: 'teacher/medical',
      TeacherAnnouncements: 'teacher/announcements',
      TeacherMessages: 'teacher/messages',
      TeacherGallery: 'teacher/gallery',
      TeacherProfile: 'teacher/profile',

      AdminDashboard: 'admin/home',
      AdminAnnouncements: 'admin/announcements',
      AdminMessages: 'admin/messages',
      AdminGallery: 'admin/gallery',
      AdminPayments: 'admin/payments',
    },
  },
};

const ROUTE_TO_URL = {
  Notifications: 'yumurcak://notifications',
  MessageDetail: 'yumurcak://messages',

  ParentDashboard: 'yumurcak://parent/home',
  ParentReports: 'yumurcak://parent/reports',
  ParentAnnouncements: 'yumurcak://parent/announcements',
  ParentMeals: 'yumurcak://parent/meals',
  ParentEvents: 'yumurcak://parent/events',
  ParentAttendance: 'yumurcak://parent/attendance',
  ParentDevelopment: 'yumurcak://parent/development',
  ParentMedical: 'yumurcak://parent/medical',
  ParentService: 'yumurcak://parent/service',
  ParentMessages: 'yumurcak://parent/messages',
  ParentGallery: 'yumurcak://parent/gallery',
  ParentDocuments: 'yumurcak://parent/documents',
  ParentBell: 'yumurcak://parent/bell',
  ParentPayments: 'yumurcak://parent/payments',
  ParentPolls: 'yumurcak://parent/polls',

  TeacherDashboard: 'yumurcak://teacher/home',
  TeacherChildren: 'yumurcak://teacher/children',
  TeacherAttendance: 'yumurcak://teacher/attendance',
  TeacherSchedule: 'yumurcak://teacher/schedule',
  TeacherEvents: 'yumurcak://teacher/events',
  TeacherMeals: 'yumurcak://teacher/meals',
  TeacherDocuments: 'yumurcak://teacher/documents',
  TeacherMedical: 'yumurcak://teacher/medical',
  TeacherAnnouncements: 'yumurcak://teacher/announcements',
  TeacherMessages: 'yumurcak://teacher/messages',
  TeacherGallery: 'yumurcak://teacher/gallery',
  TeacherProfile: 'yumurcak://teacher/profile',

  AdminDashboard: 'yumurcak://admin/home',
  AdminAnnouncements: 'yumurcak://admin/announcements',
  AdminMessages: 'yumurcak://admin/messages',
  AdminGallery: 'yumurcak://admin/gallery',
  AdminPayments: 'yumurcak://admin/payments',
};

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function getRoleGroup(role) {
  const value = normalizeText(role);
  if (value.includes('ogretmen') || value.includes('öğretmen')) return 'teacher';
  if (value.includes('veli') || value.includes('parent')) return 'parent';
  if (value.includes('yonetici') || value.includes('yönetici') || value.includes('admin')) return 'admin';
  return 'parent';
}

function rolePrefix(role) {
  return getRoleGroup(role) === 'teacher' ? 'teacher' : getRoleGroup(role) === 'admin' ? 'admin' : 'parent';
}

function getNotificationUrlFromData(data = {}, role) {
  const directUrl = data.url || data.deepLink || data.link;
  if (typeof directUrl === 'string' && directUrl.startsWith('yumurcak://')) return directUrl;
  if (typeof directUrl === 'string' && directUrl.startsWith('/')) return `yumurcak://${directUrl.replace(/^\/+/, '')}`;

  const route = data.screen || data.route || data.targetScreen || data.navigateTo;
  if (route && ROUTE_TO_URL[route]) return ROUTE_TO_URL[route];

  const targetRole = data.role || data.targetRole || role;
  const prefix = rolePrefix(targetRole);
  const type = normalizeText(data.type || data.notificationType || data.kind || data.category);
  const documentType = normalizeText(data.documentType || data.dokumanTipi || data.belgeTipi);

  if (type.includes('document') || type.includes('dokuman') || type.includes('belge') || documentType) {
    return `yumurcak://${prefix === 'teacher' ? 'teacher/documents' : 'parent/documents'}`;
  }

  if (type.includes('message') || type.includes('mesaj')) return `yumurcak://${prefix}/messages`;
  if (type.includes('announcement') || type.includes('duyuru')) return `yumurcak://${prefix}/announcements`;
  if (type.includes('gallery') || type.includes('galeri') || type.includes('photo') || type.includes('foto')) return `yumurcak://${prefix}/gallery`;
  if (type.includes('meal') || type.includes('yemek')) return `yumurcak://${prefix}/meals`;
  if (type.includes('schedule') || type.includes('program') || type.includes('ders')) return prefix === 'teacher' ? 'yumurcak://teacher/schedule' : 'yumurcak://parent/documents';
  if (type.includes('event') || type.includes('etkinlik')) return `yumurcak://${prefix}/events`;
  if (type.includes('report') || type.includes('rapor')) return prefix === 'teacher' ? 'yumurcak://teacher/children' : 'yumurcak://parent/reports';
  if (type.includes('attendance') || type.includes('yoklama')) return `yumurcak://${prefix}/attendance`;
  if (type.includes('payment') || type.includes('odeme') || type.includes('ödeme')) return 'yumurcak://parent/payments';
  if (type.includes('poll') || type.includes('anket')) return 'yumurcak://parent/polls';
  if (type.includes('bell') || type.includes('zil')) return 'yumurcak://parent/bell';

  return null;
}

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
        <NavigationContainer linking={YUMURCAK_LINKING}>
          <PushTokenSync />
          <NotificationDeepLinkHandler />
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