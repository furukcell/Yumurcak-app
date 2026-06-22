import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/admin/DashboardScreen';
import ClassListScreen from '../screens/admin/ClassListScreen';
import ClassFormScreen from '../screens/admin/ClassFormScreen';
import ChildListScreen from '../screens/admin/ChildListScreen';
import ChildFormScreen from '../screens/admin/ChildFormScreen';
import ChildDetailScreen from '../screens/admin/ChildDetailScreen';
import TeacherListScreen from '../screens/admin/TeacherListScreen';
import TeacherFormScreen from '../screens/admin/TeacherFormScreen';
import VeliListScreen from '../screens/admin/VeliListScreen';
import VeliFormScreen from '../screens/admin/VeliFormScreen';
import AnnouncementListScreen from '../screens/admin/AnnouncementListScreen';
import AnnouncementFormScreen from '../screens/admin/AnnouncementFormScreen';
import PaymentListScreen from '../screens/admin/PaymentListScreen';
import PaymentFormScreen from '../screens/admin/PaymentFormScreen';
import PollManagementScreen from '../screens/admin/PollManagementScreen';
import AdminBellScreen from '../screens/admin/AdminBellScreen';
import LessonScheduleListScreen from '../screens/admin/LessonScheduleListScreen';
import LessonScheduleFormScreen from '../screens/admin/LessonScheduleFormScreen';
import EventListScreen from '../screens/admin/EventListScreen';
import EventFormScreen from '../screens/admin/EventFormScreen';
import AdminInstitutionSettingsScreen from '../screens/admin/AdminInstitutionSettingsScreen';
import AdminSubscriptionScreen from '../screens/admin/AdminSubscriptionScreen';
import AdminMessagesScreen from '../screens/admin/AdminMessagesScreen';
import AdminAuthMigrationScreen from '../screens/admin/AdminAuthMigrationScreen';
import AdminThemeScreen from '../screens/admin/AdminThemeScreen';
import MessageDetailScreen from '../screens/shared/MessageDetailScreen';

const Stack = createNativeStackNavigator();

function stackScreen(name, component, options) {
  return React.createElement(Stack.Screen, { key: name, name: name, component: component, options: options });
}

export default function AdminStack() {
  return React.createElement(
    Stack.Navigator,
    { screenOptions: { headerStyle: { backgroundColor: '#3C3489' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } } },
    stackScreen('Dashboard', DashboardScreen, { headerShown: false }),
    stackScreen('AuthMigration', AdminAuthMigrationScreen, { headerShown: false }),
    stackScreen('MessageDetail', MessageDetailScreen, { headerShown: false }),
    stackScreen('InstitutionSettings', AdminInstitutionSettingsScreen, { title: 'Kurum Bilgileri' }),
    stackScreen('ThemeSettings', AdminThemeScreen, { title: 'Tema Ayarları' }),
    stackScreen('Subscription', AdminSubscriptionScreen, { title: 'Abonelik / Ödeme' }),
    stackScreen('AdminMessages', AdminMessagesScreen, { title: 'Mesajlar' }),
    stackScreen('ClassList', ClassListScreen, { title: 'Sınıflar' }),
    stackScreen('ClassForm', ClassFormScreen, { title: 'Sınıf Ekle/Düzenle' }),
    stackScreen('ChildList', ChildListScreen, { title: 'Çocuklar' }),
    stackScreen('ChildForm', ChildFormScreen, { title: 'Çocuk Ekle/Düzenle' }),
    stackScreen('ChildDetail', ChildDetailScreen, { title: 'Çocuk Detayı' }),
    stackScreen('TeacherList', TeacherListScreen, { title: 'Öğretmenler' }),
    stackScreen('TeacherForm', TeacherFormScreen, { title: 'Öğretmen Ekle/Düzenle' }),
    stackScreen('VeliList', VeliListScreen, { title: 'Veliler' }),
    stackScreen('VeliForm', VeliFormScreen, { title: 'Veli Ekle/Düzenle' }),
    stackScreen('AnnouncementList', AnnouncementListScreen, { title: 'Duyurular' }),
    stackScreen('AnnouncementForm', AnnouncementFormScreen, { title: 'Duyuru Oluştur' }),
    stackScreen('PaymentList', PaymentListScreen, { title: 'Ödemeler' }),
    stackScreen('PaymentForm', PaymentFormScreen, { title: 'Ödeme Ekle/Düzenle' }),
    stackScreen('PollManagement', PollManagementScreen, { title: 'Anket Yönetimi' }),
    stackScreen('AdminBell', AdminBellScreen, { title: 'Kurum Zili' }),
    stackScreen('LessonScheduleList', LessonScheduleListScreen, { title: 'Ders Programı' }),
    stackScreen('LessonScheduleForm', LessonScheduleFormScreen, { title: 'Programı Düzenle' }),
    stackScreen('EventList', EventListScreen, { title: 'Etkinlikler' }),
    stackScreen('EventForm', EventFormScreen, { title: 'Etkinlik Ekle/Düzenle' })
  );
}
