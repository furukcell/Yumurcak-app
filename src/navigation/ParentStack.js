// ============================================================
// YUMURCAK — ParentStack.js
// Veli navigasyon stack'i - FAZ 1 mesajlaşma
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ParentDashboardScreen from '../screens/parent/ParentDashboard';
import ChildReportScreen from '../screens/parent/ChildReportScreen';
import ParentReportsScreen from '../screens/parent/ParentReportsScreen';
import ParentAnnouncementsScreen from '../screens/parent/ParentAnnouncementsScreen';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
import ParentMealsScreen from '../screens/parent/ParentMealsScreen';
import ParentEventsScreen from '../screens/parent/ParentEventsScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentDevelopmentScreen from '../screens/parent/ParentDevelopmentScreen';
import ParentMedicalScreen from '../screens/parent/ParentMedicalScreen';
import ParentContactScreen from '../screens/parent/ParentContactScreen';
import ParentServiceScreen from '../screens/parent/ParentServiceScreen';
import ParentMessagesScreen from '../screens/parent/ParentMessagesScreen';
import ParentGalleryScreen from '../screens/parent/ParentGalleryScreen';
import ParentDocumentsScreen from '../screens/parent/ParentDocumentsScreen';
import MessageDetailScreen from '../screens/shared/MessageDetailScreen';

const Stack = createNativeStackNavigator();

export default function ParentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
      <Stack.Screen name="ChildReport" component={ChildReportScreen} />
      <Stack.Screen name="ParentReports" component={ParentReportsScreen} />
      <Stack.Screen name="ParentAnnouncements" component={ParentAnnouncementsScreen} />
      <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
      <Stack.Screen name="ParentMeals" component={ParentMealsScreen} />
      <Stack.Screen name="ParentEvents" component={ParentEventsScreen} />
      <Stack.Screen name="ParentAttendance" component={ParentAttendanceScreen} />
      <Stack.Screen name="ParentDevelopment" component={ParentDevelopmentScreen} />
      <Stack.Screen name="ParentMedical" component={ParentMedicalScreen} />
      <Stack.Screen name="ParentContact" component={ParentContactScreen} />
      <Stack.Screen name="ParentService" component={ParentServiceScreen} />
      <Stack.Screen name="ParentMessages" component={ParentMessagesScreen} />
      <Stack.Screen name="ParentGallery" component={ParentGalleryScreen} />
      <Stack.Screen name="ParentDocuments" component={ParentDocumentsScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
    </Stack.Navigator>
  );
}
