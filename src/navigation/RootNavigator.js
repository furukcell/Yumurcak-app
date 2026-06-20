// ============================================================
// YUMURCAK — RootNavigator.js
// FAZ 13: superadmin rolü için platform yönetim paneli eklendi
// ============================================================
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ROLLER } from '../constants';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';
import ParentStack from './ParentStack';
import SuperAdminStack from './SuperAdminStack';

export default function RootNavigator() {
  const { kullanici, yukleniyor } = useAuth();

  if (yukleniyor) {
    return (
      <View style={s.yuklemeEkrani}>
        <Text style={s.logo}>🌟</Text>
        <Text style={s.logoYazi}>YUMURCAK</Text>
        <ActivityIndicator color="#FFF" size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!kullanici) return <AuthStack />;

  switch (kullanici.rol) {
    case ROLLER.SUPERADMIN:
      return <SuperAdminStack />;
    case ROLLER.YONETICI:
      return <AdminStack />;
    case ROLLER.OGRETMEN:
      return <TeacherStack />;
    case ROLLER.VELI:
      return <ParentStack />;
    default:
      return <AuthStack />;
  }
}

const s = StyleSheet.create({
  yuklemeEkrani: {
    flex: 1,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 72, marginBottom: 10 },
  logoYazi: { fontSize: 36, fontWeight: '900', color: '#FFF', letterSpacing: 4 },
});
