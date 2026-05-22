import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';
import ParentStack from './ParentStack';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!user) return <AuthStack />;

  switch (user.rol) {
    case 'yonetici': return <AdminStack />;
    case 'ogretmen': return <TeacherStack />;
    case 'veli':     return <ParentStack />;
    default:         return <AuthStack />;
  }
}
