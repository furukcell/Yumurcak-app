import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { onValue, ref, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ROLLER } from '../constants';
import { getSubscriptionStatus } from '../utils/subscriptionStatus';
import { ThemeProvider } from '../theme/ThemeProvider';

import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';
import ParentStack from './ParentStack';
import SuperAdminStack from './SuperAdminStack';
import ServisciStack from './ServisciStack';

import AdminSubscriptionScreen from '../screens/admin/AdminSubscriptionScreen';
import SubscriptionBlockedScreen from '../screens/shared/SubscriptionBlockedScreen';

export default function RootNavigator() {
  const { kullanici, kres, yukleniyor } = useAuth();

  const [subLoading, setSubLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionKresId, setSubscriptionKresId] = useState(undefined);
  const [resolvedSinifId, setResolvedSinifId] = useState(null);

  // Kreşe özel splash ekranı, veri hızlı yüklendiğinde göz açıp kapayana kadar
  // (birkaç yüz milisaniye) kaybolup fark edilmiyordu. Veri ne kadar hızlı
  // gelirse gelsin splash'i en az 3 saniye ekranda tutmak için bu sayaç kullanılıyor.
  const [minSplashSuresiDoldu, setMinSplashSuresiDoldu] = useState(false);
  useEffect(() => {
    const zamanlayici = setTimeout(() => setMinSplashSuresiDoldu(true), 3000);
    return () => clearTimeout(zamanlayici);
  }, []);

  const role = kullanici?.rol;
  const kresId = kullanici?.kresId;
  const userId = kullanici?.uid || kullanici?.id;
  const userSinifId = kullanici?.sinifId || null;
  const classThemeSinifId = userSinifId || resolvedSinifId || null;

  useEffect(() => {
    if (!kullanici || role === ROLLER.SUPERADMIN || !kresId) {
      setSubscription(null);
      setSubscriptionKresId(kresId ?? null);
      setSubLoading(false);
      return undefined;
    }

    setSubLoading(true);

    const unsubscribe = onValue(
      ref(database, 'abonelikler/' + kresId),
      (snap) => {
        setSubscription(snap.val() || null);
        setSubscriptionKresId(kresId);
        setSubLoading(false);
      },
      () => {
        setSubscription(null);
        setSubscriptionKresId(kresId);
        setSubLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kullanici, role, kresId]);

  // Giriş yapılır yapılmaz kullanici state'i güncelleniyor ama bu effect
  // henüz çalışmadan önceki tek bir render karesinde subscription hâlâ
  // eski/null değerinde kalıyordu — bu da "blocked" sanılıp YONETICI için
  // AdminSubscriptionScreen'in veri gelmeden bir anlığına mount olmasına
  // (ve nadiren hata ekranına) yol açıyordu. subscriptionKresId, elimizdeki
  // subscription verisinin hangi kreşe ait olduğunu tutar; kresId ile
  // eşleşmiyorsa (henüz bu kullanıcı için hiç veri gelmediyse) durum
  // hesaplanmadan yükleme ekranında bekleniyor.
  const subscriptionReady =
    !kullanici || role === ROLLER.SUPERADMIN || !kresId || subscriptionKresId === kresId;

  useEffect(() => {
    setResolvedSinifId(null);

    if (!kullanici || !userId || userSinifId || !kresId) {
      return undefined;
    }

    if (role === ROLLER.OGRETMEN) {
      const unsubscribe = onValue(
        query(ref(database, 'siniflar'), orderByChild('kresId'), equalTo(kresId)),
        (snap) => {
          const data = snap.val() || {};
          let nextSinifId = null;

          Object.entries(data).some(([id, item]) => {
            const sinif = item || {};
            const ogretmenIds = Array.isArray(sinif.ogretmenIds) ? sinif.ogretmenIds.map(String) : [];
            const matches =
              ogretmenIds.includes(String(userId)) ||
              String(sinif.ogretmenId || '') === String(userId);

            if (matches) {
              nextSinifId = id;
              return true;
            }

            return false;
          });

          setResolvedSinifId(nextSinifId);
        },
        () => setResolvedSinifId(null)
      );

      return () => unsubscribe();
    }

    if (role === ROLLER.VELI) {
      const unsubscribe = onValue(
        query(ref(database, 'cocuklar'), orderByChild('kresId'), equalTo(kresId)),
        (snap) => {
          const data = snap.val() || {};
          let nextSinifId = null;

          Object.values(data).some((item) => {
            const child = item || {};
            const veliIds = Array.isArray(child.veliIds) ? child.veliIds.map(String) : [];
            const matches =
              veliIds.includes(String(userId)) ||
              String(child.veliId || '') === String(userId) ||
              String(child.parentId || '') === String(userId);

            if (matches && child.sinifId) {
              nextSinifId = child.sinifId;
              return true;
            }

            return false;
          });

          setResolvedSinifId(nextSinifId);
        },
        () => setResolvedSinifId(null)
      );

      return () => unsubscribe();
    }

    return undefined;
  }, [kullanici, role, userId, userSinifId, kresId]);

  const subscriptionStatus = useMemo(() => getSubscriptionStatus(subscription), [subscription]);

  const withTheme = (screen) => (
    <ThemeProvider
      kresId={kresId}
      classThemeSinifId={classThemeSinifId}
      userId={userId}
    >
      {screen}
    </ThemeProvider>
  );

    if (yukleniyor || subLoading || !subscriptionReady || !minSplashSuresiDoldu) {
    if (role !== ROLLER.SUPERADMIN && kres?.splashUrl) {
      return (
        <View style={s.customSplash}>
          <Image source={{ uri: kres.splashUrl }} style={s.customSplashImage} resizeMode="cover" />
          <ActivityIndicator color="#FFFFFF" size="large" style={s.customSplashSpinner} />
        </View>
      );
    }

    return (
      <View style={s.yuklemeEkrani}>
        <View style={s.cloudLeft} />
        <View style={s.cloudRight} />

        <Text style={s.sun}>☀️</Text>
        <Text style={s.starLeft}>⭐</Text>
        <Text style={s.starRight}>✨</Text>

        <View style={s.logoCard}>
          {role !== ROLLER.SUPERADMIN && kres?.logoUrl ? (
            <>
              <Image source={{ uri: kres.logoUrl }} style={s.kresLogoImage} resizeMode="cover" />
              <Text style={[s.logoYazi, s.kresLogoYazi]}>{kres?.ad || 'YUMURCAK'}</Text>
            </>
          ) : (
            <>
              <Text style={s.logo}>🌈</Text>
              <Text style={s.logoYazi}>YUMURCAK</Text>
            </>
          )}
          <Text style={s.logoAltYazi}>Kreşin hazırlanıyor</Text>
        </View>

        <View style={s.loadingRow}>
          <View style={[s.dot, s.dotBlue]} />
          <View style={[s.dot, s.dotOrange]} />
          <View style={[s.dot, s.dotGreen]} />
        </View>

        <ActivityIndicator color="#0B5EAD" size="large" style={s.spinner} />
        <Text style={s.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!kullanici) return <AuthStack />;

  if (role === ROLLER.SUPERADMIN) {
    return <SuperAdminStack />;
  }

  if (subscriptionStatus.blocked) {
    if (role === ROLLER.YONETICI) {
      return withTheme(<AdminSubscriptionScreen />);
    }

    if (role === ROLLER.OGRETMEN || role === ROLLER.VELI || role === ROLLER.SERVISCI) {
      return withTheme(<SubscriptionBlockedScreen subscription={subscription} />);
    }
  }

  switch (role) {
    case ROLLER.YONETICI:
      return withTheme(<AdminStack />);
    case ROLLER.OGRETMEN:
      return withTheme(<TeacherStack />);
    case ROLLER.VELI:
      return withTheme(<ParentStack />);
    case ROLLER.SERVISCI:
      return withTheme(<ServisciStack />);
    default:
      return <AuthStack />;
  }
}

const s = StyleSheet.create({
  yuklemeEkrani: {
    flex: 1,
    backgroundColor: '#FFF7E8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 28,
  },

  cloudLeft: {
    position: 'absolute',
    left: -70,
    top: 90,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(177, 222, 255, 0.42)',
  },

  cloudRight: {
    position: 'absolute',
    right: -80,
    bottom: 120,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255, 203, 164, 0.38)',
  },

  sun: {
    position: 'absolute',
    right: 42,
    top: 92,
    fontSize: 46,
    opacity: 0.9,
  },

  starLeft: {
    position: 'absolute',
    left: 34,
    top: 170,
    fontSize: 25,
    opacity: 0.78,
  },

  starRight: {
    position: 'absolute',
    right: 48,
    bottom: 190,
    fontSize: 26,
    opacity: 0.75,
  },

  logoCard: {
    width: 230,
    minHeight: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(11,94,173,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B5EAD',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },

  logo: {
    fontSize: 72,
    marginBottom: 6,
  },

  customSplash: {
    flex: 1,
    backgroundColor: '#000',
  },

  customSplashImage: {
    ...StyleSheet.absoluteFillObject,
  },

  customSplashSpinner: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
  },

  kresLogoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 6,
  },

  kresLogoYazi: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  logoYazi: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0B5EAD',
    letterSpacing: 2,
  },

  logoAltYazi: {
    marginTop: 8,
    color: '#728197',
    fontSize: 13,
    fontWeight: '800',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 34,
  },

  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },

  dotBlue: { backgroundColor: '#32A8F2' },
  dotOrange: { backgroundColor: '#FF9F1C' },
  dotGreen: { backgroundColor: '#71C94D' },

  spinner: {
    marginTop: 18,
  },

  loadingText: {
    marginTop: 12,
    color: '#0B5EAD',
    fontSize: 18,
    fontWeight: '900',
  },
});
