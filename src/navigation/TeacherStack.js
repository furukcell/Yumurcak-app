// ============================================================
// YUMURCAK — TeacherStack.js
// Öğretmen navigasyon stack'i
// ============================================================
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import ChildReportScreen from '../screens/teacher/ChildReportScreen';

const Stack = createStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#633806' }, // Kahverengi ton
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="TeacherDashboard"
        component={TeacherDashboardScreen}
        options={{ title: 'Sınıfım' }}
      />
      <Stack.Screen
        name="ChildReport"
        component={ChildReportScreen}
        options={{ title: 'Günlük Rapor' }}
      />
    </Stack.Navigator>
  );
}
