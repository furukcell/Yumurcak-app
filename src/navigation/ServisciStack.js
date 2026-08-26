import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ServisciDashboardScreen from '../screens/servisci/ServisciDashboardScreen';
import ServisciRouteScreen from '../screens/servisci/ServisciRouteScreen';
import ServisciProfileScreen from '../screens/servisci/ServisciProfileScreen';
import LegalDocumentsScreen from '../screens/legal/LegalDocumentsScreen';

const Stack = createNativeStackNavigator();

export default function ServisciStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServisciDashboard" component={ServisciDashboardScreen} />
      <Stack.Screen name="ServisciRoute" component={ServisciRouteScreen} />
      <Stack.Screen name="ServisciProfile" component={ServisciProfileScreen} />
      <Stack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </Stack.Navigator>
  );
}
