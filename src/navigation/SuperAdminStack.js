// ============================================================
// YUMURCAK — SuperAdminStack.js
// FAZ 17: Firebase Index Migration ekranı eklendi
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SuperAdminDashboardScreen from '../screens/superadmin/SuperAdminDashboardScreen';
import SuperAdminKresDetailScreen from '../screens/superadmin/SuperAdminKresDetailScreen';
import SuperAdminKresCreateScreen from '../screens/superadmin/SuperAdminKresCreateScreen';
import SuperAdminIndexMigrationScreen from '../screens/superadmin/SuperAdminIndexMigrationScreen';

const Stack = createNativeStackNavigator();

export default function SuperAdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
      <Stack.Screen name="SuperAdminKresDetail" component={SuperAdminKresDetailScreen} />
      <Stack.Screen name="SuperAdminKresCreate" component={SuperAdminKresCreateScreen} />
      <Stack.Screen name="SuperAdminIndexMigration" component={SuperAdminIndexMigrationScreen} />
    </Stack.Navigator>
  );
}
