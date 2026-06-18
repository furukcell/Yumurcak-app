// ============================================================
// YUMURCAK — App.js
// Uygulama giriş noktası
// ============================================================
import { AuthProvider } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
