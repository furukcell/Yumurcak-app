// ============================================================
// YUMURCAK — ParentStack.js
// Veli navigasyon stack'i
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParentDashboardScreen from '../screens/parent/ParentDashboard';
import ChildReportScreen from '../screens/parent/ChildReportScreen';

const Stack = createNativeStackNavigator();

export default function ParentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#27500A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
        options={{ title: 'Çocuklarım' }}
      />
      <Stack.Screen
        name="ChildReport"
        component={ChildReportScreen}
        options={{ title: 'Günlük Raporlar' }}
      />
    </Stack.Navigator>
  );
}
