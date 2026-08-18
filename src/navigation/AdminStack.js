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
import EventListScreen from '../screens/admin/EventListScreen';
import EventFormScreen from '../screens/admin/EventFormScreen';
import AdminInstitutionSettingsScreen from '../screens/admin/AdminInstitutionSettingsScreen';
import AdminSubscriptionScreen from '../screens/admin/AdminSubscriptionScreen';
import AdminMessagesScreen from '../screens/admin/AdminMessagesScreen';
import AdminThemeScreen from '../screens/admin/AdminThemeScreen';
import AdminStatisticsScreen from '../screens/admin/AdminStatisticsScreen';
import AdminGalleryScreen from '../screens/admin/AdminGalleryScreen';
import AdminMonthlyMealScreen from '../screens/admin/AdminMonthlyMealScreen';
import AdminMonthlyStaffTasksScreen from '../screens/admin/AdminMonthlyStaffTasksScreen';
import AdminMonthlyDutyRosterScreen from '../screens/admin/AdminMonthlyDutyRosterScreen';
import AdminServiceScreen from '../screens/admin/AdminServiceScreen';
import AdminVehicleListScreen from '../screens/admin/AdminVehicleListScreen';
import AdminVehicleFormScreen from '../screens/admin/AdminVehicleFormScreen';
import AdminServiceStatsScreen from '../screens/admin/AdminServiceStatsScreen';
import AdminServiceMonthlyStatsScreen from '../screens/admin/AdminServiceMonthlyStatsScreen';
import AdminBirthdayCalendarScreen from '../screens/admin/AdminBirthdayCalendarScreen';
import AdminMonthlyScheduleScreen from '../screens/admin/AdminMonthlyScheduleScreen';
import MessageDetailScreen from '../screens/shared/MessageDetailScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import LegalDocumentsScreen from '../screens/legal/LegalDocumentsScreen';

const Stack = createNativeStackNavigator();

function stackScreen(name, component, options) {
  return React.createElement(Stack.Screen, { key: name, name, component, options });
}

export default function AdminStack() {
  return React.createElement(
    Stack.Navigator,
    { screenOptions: { headerStyle: { backgroundColor: '#3C3489' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } } },
    stackScreen('Dashboard', DashboardScreen, { headerShown: false }),
    stackScreen('Notifications', NotificationsScreen, { headerShown: false }),
    stackScreen('AdminStatistics', AdminStatisticsScreen, { title: 'Kurum İstatistikleri' }),
    stackScreen('AdminGallery', AdminGalleryScreen, { headerShown: false }),
    stackScreen('AdminMonthlyMeal', AdminMonthlyMealScreen, { title: 'Aylık Yemek Listesi' }),
    stackScreen('AdminMonthlyStaffTasks', AdminMonthlyStaffTasksScreen, { title: 'Personel Görev Listesi' }),
    stackScreen('AdminMonthlyDutyRoster', AdminMonthlyDutyRosterScreen, { title: 'Nöbet Çizelgesi' }),
    stackScreen('AdminService', AdminServiceScreen, { title: 'Servis Listesi' }),
    stackScreen('AdminVehicleList', AdminVehicleListScreen, { headerShown: false }),
    stackScreen('AdminVehicleForm', AdminVehicleFormScreen, { title: 'Servis Aracı Ekle/Düzenle' }),
    stackScreen('AdminServiceStats', AdminServiceStatsScreen, { headerShown: false }),
    stackScreen('AdminServiceMonthlyStats', AdminServiceMonthlyStatsScreen, { headerShown: false }),
    stackScreen('AdminBirthdayCalendar', AdminBirthdayCalendarScreen, { title: 'Doğum Günü Takvimi' }),
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
    stackScreen('AdminMonthlySchedule', AdminMonthlyScheduleScreen, { title: 'Aylık Ders Programı' }),
    stackScreen('EventList', EventListScreen, { title: 'Etkinlikler' }),
    stackScreen('EventForm', EventFormScreen, { title: 'Etkinlik Ekle/Düzenle' }),
    stackScreen('LegalDocuments', LegalDocumentsScreen, { headerShown: false }),
  );
}
