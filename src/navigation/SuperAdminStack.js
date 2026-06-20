// ============================================================
// YUMURCAK — SuperAdminStack.js
// FAZ 14: Yeni kreş onboarding ekranı eklendi
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SuperAdminDashboardScreen from '../screens/superadmin/SuperAdminDashboardScreen';
import SuperAdminKresDetailScreen from '../screens/superadmin/SuperAdminKresDetailScreen';
import SuperAdminKresCreateScreen from '../screens/superadmin/SuperAdminKresCreateScreen';

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
    </Stack.Navigator>
  );
}
