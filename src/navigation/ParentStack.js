import React, { useMemo } from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ParentSummaryScreen from '../screens/parent/ParentSummaryScreen';
import ParentDashboardScreen from '../screens/parent/ParentDashboard';
import ChildReportScreen from '../screens/parent/ChildReportScreen';
import ParentReportsScreen from '../screens/parent/ParentReportsScreen';
import ParentAnnouncementsScreen from '../screens/parent/ParentAnnouncementsScreen';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
import ParentAboutScreen from '../screens/parent/ParentAboutScreen';
import ParentSupportScreen from '../screens/parent/ParentSupportScreen';
import ParentMealsScreen from '../screens/parent/ParentMealsScreen';
import ParentEventsScreen from '../screens/parent/ParentEventsScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentDevelopmentScreen from '../screens/parent/ParentDevelopmentScreen';
import ParentUyumScreen from '../screens/parent/ParentAdaptationScoreScreen';
import ParentBadgesScreen from '../screens/parent/ParentBadgesScreen';
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
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import { useAppTheme } from '../theme/ThemeProvider';
import LegalDocumentsScreen from '../screens/legal/LegalDocumentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused, color, compact }) {
  return <Text style={{ fontSize: compact ? (focused ? 20 : 18) : (focused ? 22 : 20), color }}>{icon}</Text>;
}

function ParentTabs() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const bottomInset = Math.max(insets.bottom || 0, 8);
  const tabOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.muted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: { height: 58 + bottomInset, paddingTop: compact ? 3 : 5, paddingBottom: bottomInset, backgroundColor: theme.card, borderTopColor: theme.border, borderTopWidth: 1, elevation: 10 },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarIconStyle: { marginTop: 1 },
    tabBarLabelStyle: { fontSize: compact ? 9 : 10, fontWeight: '900', marginTop: compact ? 0 : 1, marginBottom: 1 },
  }), [theme, bottomInset, compact]);
  const iconProps = (icon) => ({ focused, color }) => <TabIcon icon={icon} focused={focused} color={color} compact={compact} />;
  return (
    <Tab.Navigator initialRouteName="ParentSummary" screenOptions={tabOptions}>
      <Tab.Screen name="ParentSummary" component={ParentSummaryScreen} options={{ title: 'Özet', tabBarIcon: iconProps('📊') }} />
      <Tab.Screen name="ParentDashboard" component={ParentDashboardScreen} options={{ title: compact ? 'Ana' : 'Anasayfa', tabBarIcon: iconProps('🏠') }} />
      <Tab.Screen name="ParentReportsTab" component={ParentReportsScreen} options={{ title: 'Rapor', tabBarIcon: iconProps('📋') }} />
      <Tab.Screen name="ParentDevelopmentTab" component={ParentDevelopmentScreen} options={{ title: 'Gelişim', tabBarIcon: iconProps('📈') }} />
      <Tab.Screen name="ParentMessagesTab" component={ParentMessagesScreen} options={{ title: 'Mesaj', tabBarIcon: iconProps('💬') }} />
    </Tab.Navigator>
  );
}

export default function ParentStack() {
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ParentTabs" component={ParentTabs} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
        <Stack.Screen name="ChildReport" component={ChildReportScreen} />
        <Stack.Screen name="ParentReports" component={ParentReportsScreen} />
        <Stack.Screen name="ParentAnnouncements" component={ParentAnnouncementsScreen} />
        <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
        <Stack.Screen name="ParentAbout" component={ParentAboutScreen} />
        <Stack.Screen name="ParentSupport" component={ParentSupportScreen} />
        <Stack.Screen name="ParentMeals" component={ParentMealsScreen} />
        <Stack.Screen name="ParentEvents" component={ParentEventsScreen} />
        <Stack.Screen name="ParentAttendance" component={ParentAttendanceScreen} />
        <Stack.Screen name="ParentDevelopment" component={ParentDevelopmentScreen} />
        <Stack.Screen name="ParentUyum" component={ParentUyumScreen} />
        <Stack.Screen name="ParentBadges" component={ParentBadgesScreen} />
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
        <Stack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
      </Stack.Navigator>
    </View>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 } });
