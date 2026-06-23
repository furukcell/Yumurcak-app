// ============================================================
// YUMURCAK — TeacherStack.js
// Öğretmen navigasyon stack'i
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherChildrenScreen from '../screens/teacher/TeacherChildrenScreen';
import ChildReportScreen from '../screens/teacher/ChildReportScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';
import TeacherScheduleScreen from '../screens/teacher/TeacherScheduleScreen';
import TeacherEventsScreen from '../screens/teacher/TeacherEventsScreen';
import TeacherMealsScreen from '../screens/teacher/TeacherMealsScreen';
import TeacherMedicalScreen from '../screens/teacher/TeacherMedicalScreen';
import TeacherPhysicalDevelopmentScreen from '../screens/teacher/TeacherPhysicalDevelopmentScreen';
import TeacherAnnouncementsScreen from '../screens/teacher/TeacherAnnouncementsScreen';
import TeacherMessagesScreen from '../screens/teacher/TeacherMessagesScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
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
      <Stack.Screen name="TeacherMedical" component={TeacherMedicalScreen} />
      <Stack.Screen name="TeacherPhysicalDevelopment" component={TeacherPhysicalDevelopmentScreen} />
      <Stack.Screen name="TeacherAnnouncements" component={TeacherAnnouncementsScreen} />
      <Stack.Screen name="TeacherMessages" component={TeacherMessagesScreen} />
      <Stack.Screen name="TeacherGallery" component={TeacherGalleryScreen} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
      <Stack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </Stack.Navigator>
  );
}
