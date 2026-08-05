import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherChildrenScreen from '../screens/teacher/TeacherChildrenScreen';
import ChildReportScreen from '../screens/teacher/ChildReportScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';
import TeacherScheduleScreen from '../screens/teacher/TeacherScheduleScreen';
import TeacherEventsScreen from '../screens/teacher/TeacherEventsScreen';
import TeacherMealsScreen from '../screens/teacher/TeacherMealsScreen';
import TeacherMedicationFormListScreen from '../screens/teacher/TeacherMedicationFormListScreen';
import TeacherMedicationFormEditScreen from '../screens/teacher/TeacherMedicationFormEditScreen';
import TeacherMedicationFormDetailScreen from '../screens/teacher/TeacherMedicationFormDetailScreen';
import TeacherMedicalScreen from '../screens/teacher/TeacherMedicalScreen';
import TeacherPhysicalDevelopmentScreen from '../screens/teacher/TeacherPhysicalDevelopmentScreen';
import UyumTakibiScreen from '../screens/teacher/TeacherAdaptationTrackingScreen';
import TeacherBirthdaysScreen from '../screens/teacher/TeacherBirthdaysScreen';
import TeacherWeeklyStarScreen from '../screens/teacher/TeacherWeeklyStarScreen';
import TeacherThemeScreen from '../screens/teacher/TeacherThemeScreen';
import TeacherAnnouncementsScreen from '../screens/teacher/TeacherAnnouncementsScreen';
import TeacherMessagesScreen from '../screens/teacher/TeacherMessagesScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
import TeacherSupportScreen from '../screens/teacher/TeacherSupportScreen';
import TeacherGalleryScreen from '../screens/teacher/TeacherGalleryScreen';
import MessageDetailScreen from '../screens/shared/MessageDetailScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import LegalDocumentsScreen from '../screens/legal/LegalDocumentsScreen';

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8F6FF' } }}>
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="TeacherChildren" component={TeacherChildrenScreen} />
      <Stack.Screen name="ChildReport" component={ChildReportScreen} />
      <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
      <Stack.Screen name="TeacherSchedule" component={TeacherScheduleScreen} />
      <Stack.Screen name="TeacherEvents" component={TeacherEventsScreen} />
      <Stack.Screen name="TeacherMeals" component={TeacherMealsScreen} />
      <Stack.Screen name="TeacherMedicationFormList" component={TeacherMedicationFormListScreen} />
      <Stack.Screen name="TeacherMedicationFormEdit" component={TeacherMedicationFormEditScreen} />
      <Stack.Screen name="TeacherMedicationFormDetail" component={TeacherMedicationFormDetailScreen} />
      <Stack.Screen name="TeacherMedical" component={TeacherMedicalScreen} />
      <Stack.Screen name="TeacherPhysicalDevelopment" component={TeacherPhysicalDevelopmentScreen} />
      <Stack.Screen name="TeacherAdaptationTracking" component={UyumTakibiScreen} />
      <Stack.Screen name="TeacherBirthdays" component={TeacherBirthdaysScreen} />
      <Stack.Screen name="TeacherWeeklyStar" component={TeacherWeeklyStarScreen} />
      <Stack.Screen name="TeacherTheme" component={TeacherThemeScreen} />
      <Stack.Screen name="TeacherAnnouncements" component={TeacherAnnouncementsScreen} />
      <Stack.Screen name="TeacherMessages" component={TeacherMessagesScreen} />
      <Stack.Screen name="TeacherGallery" component={TeacherGalleryScreen} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />
      <Stack.Screen name="TeacherSupport" component={TeacherSupportScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
      <Stack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </Stack.Navigator>
  );
}
