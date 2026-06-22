// ============================================================
// YUMURCAK — ParentStack.js
// Veli navigasyon stack'i + alt tab bar
// ============================================================
import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ParentSummaryScreen from '../screens/parent/ParentSummaryScreen';
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
import ParentBellScreen from '../screens/parent/ParentBellScreen';
import ParentPaymentsScreen from '../screens/parent/ParentPaymentsScreen';
import ParentPollsScreen from '../screens/parent/ParentPollsScreen';
import MessageDetailScreen from '../screens/shared/MessageDetailScreen';
import { useAppTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused, color }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, color }}>{icon}</Text>
  );
}

function ParentTabs() {
  const { theme } = useAppTheme();

  const tabOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.muted,
    tabBarStyle: {
      height: 70,
      paddingTop: 6,
      paddingBottom: 8,
      backgroundColor: theme.card,
      borderTopColor: theme.border,
      borderTopWidth: 1,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '900',
      marginTop: 2,
    },
  }), [theme]);

  return (
    <Tab.Navigator initialRouteName="ParentSummary" screenOptions={tabOptions}>
      <Tab.Screen name="ParentSummary" component={ParentSummaryScreen} options={{ title: 'Özet', tabBarIcon: ({ focused, color }) => <TabIcon icon="📊" focused={focused} color={color} /> }} />
      <Tab.Screen name="ParentDashboard" component={ParentDashboardScreen} options={{ title: 'Anasayfa', tabBarIcon: ({ focused, color }) => <TabIcon icon="🏠" focused={focused} color={color} /> }} />
      <Tab.Screen name="ParentReportsTab" component={ParentReportsScreen} options={{ title: 'Raporlar', tabBarIcon: ({ focused, color }) => <TabIcon icon="📋" focused={focused} color={color} /> }} />
      <Tab.Screen name="ParentDevelopmentTab" component={ParentDevelopmentScreen} options={{ title: 'Gelişim', tabBarIcon: ({ focused, color }) => <TabIcon icon="📈" focused={focused} color={color} /> }} />
      <Tab.Screen name="ParentMessagesTab" component={ParentMessagesScreen} options={{ title: 'Mesaj', tabBarIcon: ({ focused, color }) => <TabIcon icon="💬" focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function ParentStack() {
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ParentTabs" component={ParentTabs} />
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
        <Stack.Screen name="ParentBell" component={ParentBellScreen} />
        <Stack.Screen name="ParentPayments" component={ParentPaymentsScreen} />
        <Stack.Screen name="ParentPolls" component={ParentPollsScreen} />
        <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
