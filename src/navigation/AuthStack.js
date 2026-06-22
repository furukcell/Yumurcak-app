import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import LegalDocumentsScreen from '../screens/legal/LegalDocumentsScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </Stack.Navigator>
  );
}
