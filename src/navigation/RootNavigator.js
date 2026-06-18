// ============================================================
// YUMURCAK — RootNavigator.js
// ============================================================
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RENKLER, ROLLER } from '../constants';  // ✅ 1 seviye yukarı
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';
import ParentStack from './ParentStack';

export default function RootNavigator() {
  const { kullanici, yukleniyor } = useAuth();

  // Splash / yükleme ekranı
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
    case ROLLER.YONETICI: return <AdminStack />;
    case ROLLER.OGRETMEN: return <TeacherStack />;
    case ROLLER.VELI:     return <ParentStack />;
    default:              return <AuthStack />;
  }
}

const s = StyleSheet.create({
  yuklemeEkrani: {
    flex: 1,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo:     { fontSize: 72, marginBottom: 10 },
  logoYazi: { fontSize: 36, fontWeight: '900', color: '#FFF', letterSpacing: 4 },
});
