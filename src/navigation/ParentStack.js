import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParentDashboard from '../screens/parent/ParentDashboard';

const Stack = createNativeStackNavigator();

export default function ParentStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ParentDashboard"
        component={ParentDashboard}
        options={{ title: 'Veli Paneli' }}
      />
    </Stack.Navigator>
  );
}
