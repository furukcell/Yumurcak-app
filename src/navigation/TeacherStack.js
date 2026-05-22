import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherDashboard from '../screens/teacher/TeacherDashboard';

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TeacherDashboard"
        component={TeacherDashboard}
        options={{ title: 'Öğretmen Paneli' }}
      />
    </Stack.Navigator>
  );
}
