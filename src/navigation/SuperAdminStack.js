// ============================================================
// YUMURCAK — SuperAdminStack.js
// FAZ 17: Firebase Index Migration ekranı eklendi
// FAZ 18: Abonelik Yönetimi (Google Play + Manuel/IBAN) ekranı eklendi
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SuperAdminMenuScreen from '../screens/superadmin/SuperAdminMenuScreen';
import SuperAdminDashboardScreen from '../screens/superadmin/SuperAdminDashboardScreen';
import SuperAdminKresDetailScreen from '../screens/superadmin/SuperAdminKresDetailScreen';
import SuperAdminKresCreateScreen from '../screens/superadmin/SuperAdminKresCreateScreen';
import SuperAdminKresBulkOnboardingScreen from '../screens/superadmin/SuperAdminKresBulkOnboardingScreen';
import SuperAdminIndexMigrationScreen from '../screens/superadmin/SuperAdminIndexMigrationScreen';
import SuperAdminSupportScreen from '../screens/superadmin/SuperAdminSupportScreen';
import SuperAdminSubscriptionsScreen from '../screens/superadmin/SuperAdminSubscriptionsScreen';

const Stack = createNativeStackNavigator();

export default function SuperAdminStack() {
  return (
    <Stack.Navigator
      initialRouteName="SuperAdminMenu"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="SuperAdminMenu" component={SuperAdminMenuScreen} />
      <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
      <Stack.Screen name="SuperAdminKresDetail" component={SuperAdminKresDetailScreen} />
      <Stack.Screen name="SuperAdminKresCreate" component={SuperAdminKresCreateScreen} />
      <Stack.Screen name="SuperAdminKresBulkOnboarding" component={SuperAdminKresBulkOnboardingScreen} />
      <Stack.Screen name="SuperAdminIndexMigration" component={SuperAdminIndexMigrationScreen} />
      <Stack.Screen name="SuperAdminSupport" component={SuperAdminSupportScreen} />
      <Stack.Screen name="SuperAdminSubscriptions" component={SuperAdminSubscriptionsScreen} />
    </Stack.Navigator>
  );
}
