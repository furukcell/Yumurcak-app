// ============================================================
// YUMURCAK — ParentStack.js
// Veli navigasyon stack'i
// ============================================================
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ParentDashboardScreen from '../screens/parent/ParentDashboard';
import ChildReportScreen from '../screens/parent/ChildReportScreen';

const Stack = createStackNavigator();

export default function ParentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#27500A' }, // Yeşil ton
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
