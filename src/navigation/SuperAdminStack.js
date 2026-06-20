// ============================================================
// YUMURCAK — SuperAdminStack.js
// FAZ 13: Platform sahibi / gerçek admin paneli
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SuperAdminDashboardScreen from '../screens/superadmin/SuperAdminDashboardScreen';
import SuperAdminKresDetailScreen from '../screens/superadmin/SuperAdminKresDetailScreen';

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
    </Stack.Navigator>
  );
}
