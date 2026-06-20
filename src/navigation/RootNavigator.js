// ============================================================
// YUMURCAK — RootNavigator.js
// FAZ 15: Abonelik guard / kilitleme eklendi
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { onValue, ref } from 'firebase/database';

import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ROLLER } from '../constants';
import { getSubscriptionStatus } from '../utils/subscriptionStatus';

import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';
import ParentStack from './ParentStack';
import SuperAdminStack from './SuperAdminStack';

import AdminSubscriptionScreen from '../screens/admin/AdminSubscriptionScreen';
import SubscriptionBlockedScreen from '../screens/shared/SubscriptionBlockedScreen';

export default function RootNavigator() {
  const { kullanici, yukleniyor } = useAuth();

  const [subLoading, setSubLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const role = kullanici?.rol;
  const kresId = kullanici?.kresId;

  useEffect(() => {
    if (!kullanici || role === ROLLER.SUPERADMIN || !kresId) {
      setSubscription(null);
      setSubLoading(false);
      return undefined;
    }

    setSubLoading(true);

    const unsubscribe = onValue(
      ref(database, `abonelikler/${kresId}`),
      (snap) => {
        setSubscription(snap.val() || null);
        setSubLoading(false);
      },
      () => {
        setSubscription(null);
        setSubLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kullanici, role, kresId]);

  const subscriptionStatus = useMemo(() => getSubscriptionStatus(subscription), [subscription]);

  if (yukleniyor || subLoading) {
    return (
      <View style={s.yuklemeEkrani}>
        <Text style={s.logo}>🌟</Text>
        <Text style={s.logoYazi}>YUMURCAK</Text>
        <ActivityIndicator color="#FFF" size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!kullanici) return <AuthStack />;

  if (role === ROLLER.SUPERADMIN) {
    return <SuperAdminStack />;
  }

  // Abonelik yok/bitti/pasif ise:
  // - Kurum yöneticisi ödeme/abonelik ekranını görebilir.
  // - Öğretmen ve veli kilit ekranı görür.
  if (subscriptionStatus.blocked) {
    if (role === ROLLER.YONETICI) {
      return <AdminSubscriptionScreen />;
    }

    if (role === ROLLER.OGRETMEN || role === ROLLER.VELI) {
      return <SubscriptionBlockedScreen subscription={subscription} />;
    }
  }

  switch (role) {
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
