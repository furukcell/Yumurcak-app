import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ServisciDashboardScreen from '../screens/servisci/ServisciDashboardScreen';
import LegalDocumentsScreen from '../screens/legal/LegalDocumentsScreen';

const Stack = createNativeStackNavigator();

export default function ServisciStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServisciDashboard" component={ServisciDashboardScreen} />
      <Stack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </Stack.Navigator>
  );
}
