import React from 'react';
import { useTranslation } from 'react-i18next';
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
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminLanguageScreen from '../screens/admin/AdminLanguageScreen';
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
import AdminSupportScreen from '../screens/admin/AdminSupportScreen';

const Stack = createNativeStackNavigator();

function stackScreen(name, component, options) {
  return React.createElement(Stack.Screen, { key: name, name, component, options });
}

export default function AdminStack() {
  const { t } = useTranslation();
  return React.createElement(
    Stack.Navigator,
    { screenOptions: { headerStyle: { backgroundColor: '#3C3489' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } } },
    stackScreen('Dashboard', DashboardScreen, { headerShown: false }),
    stackScreen('Notifications', NotificationsScreen, { headerShown: false }),
    stackScreen('AdminStatistics', AdminStatisticsScreen, { title: t('admin.navigation.statistics') }),
    stackScreen('AdminGallery', AdminGalleryScreen, { headerShown: false }),
    stackScreen('AdminMonthlyMeal', AdminMonthlyMealScreen, { title: t('admin.navigation.monthlyMeal') }),
    stackScreen('AdminMonthlyStaffTasks', AdminMonthlyStaffTasksScreen, { title: t('admin.navigation.monthlyStaffTasks') }),
    stackScreen('AdminMonthlyDutyRoster', AdminMonthlyDutyRosterScreen, { title: t('admin.navigation.monthlyDutyRoster') }),
    stackScreen('AdminService', AdminServiceScreen, { title: t('admin.navigation.service') }),
    stackScreen('AdminVehicleList', AdminVehicleListScreen, { headerShown: false }),
    stackScreen('AdminVehicleForm', AdminVehicleFormScreen, { title: t('admin.navigation.vehicleForm') }),
    stackScreen('AdminServiceStats', AdminServiceStatsScreen, { headerShown: false }),
    stackScreen('AdminServiceMonthlyStats', AdminServiceMonthlyStatsScreen, { headerShown: false }),
    stackScreen('AdminBirthdayCalendar', AdminBirthdayCalendarScreen, { title: t('admin.navigation.birthdayCalendar') }),
    stackScreen('MessageDetail', MessageDetailScreen, { headerShown: false }),
    stackScreen('Support', AdminSupportScreen, { headerShown: false }),
    stackScreen('InstitutionSettings', AdminInstitutionSettingsScreen, { title: t('admin.navigation.institutionSettings') }),
    stackScreen('AdminProfile', AdminProfileScreen, { headerShown: false }),
    stackScreen('AdminLanguage', AdminLanguageScreen, { headerShown: false }),
    stackScreen('ThemeSettings', AdminThemeScreen, { title: t('admin.navigation.theme') }),
    stackScreen('Subscription', AdminSubscriptionScreen, { title: t('admin.navigation.subscription') }),
    stackScreen('AdminMessages', AdminMessagesScreen, { title: t('admin.navigation.messages') }),
    stackScreen('ClassList', ClassListScreen, { title: t('admin.navigation.classList') }),
    stackScreen('ClassForm', ClassFormScreen, { title: t('admin.navigation.classForm') }),
    stackScreen('ChildList', ChildListScreen, { title: t('admin.navigation.childList') }),
    stackScreen('ChildForm', ChildFormScreen, { title: t('admin.navigation.childForm') }),
    stackScreen('ChildDetail', ChildDetailScreen, { title: t('admin.navigation.childDetail') }),
    stackScreen('TeacherList', TeacherListScreen, { title: t('admin.navigation.teacherList') }),
    stackScreen('TeacherForm', TeacherFormScreen, { title: t('admin.navigation.teacherForm') }),
    stackScreen('VeliList', VeliListScreen, { title: t('admin.navigation.veliList') }),
    stackScreen('VeliForm', VeliFormScreen, { title: t('admin.navigation.veliForm') }),
    stackScreen('AnnouncementList', AnnouncementListScreen, { title: t('admin.navigation.announcementList') }),
    stackScreen('AnnouncementForm', AnnouncementFormScreen, { title: t('admin.navigation.announcementForm') }),
    stackScreen('PaymentList', PaymentListScreen, { title: t('admin.navigation.paymentList') }),
    stackScreen('PaymentForm', PaymentFormScreen, { title: t('admin.navigation.paymentForm') }),
    stackScreen('PollManagement', PollManagementScreen, { title: t('admin.navigation.pollManagement') }),
    stackScreen('AdminBell', AdminBellScreen, { title: t('admin.navigation.bell') }),
    stackScreen('LessonScheduleList', LessonScheduleListScreen, { title: t('admin.navigation.lessonSchedule') }),
    stackScreen('AdminMonthlySchedule', AdminMonthlyScheduleScreen, { title: t('admin.navigation.monthlySchedule') }),
    stackScreen('EventList', EventListScreen, { title: t('admin.navigation.eventList') }),
    stackScreen('EventForm', EventFormScreen, { title: t('admin.navigation.eventForm') }),
    stackScreen('LegalDocuments', LegalDocumentsScreen, { headerShown: false }),
  );
}
