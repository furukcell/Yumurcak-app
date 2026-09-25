// ============================================================
// YUMURCAK — AuthContext.js
// FAZ 11 v2: Çıkış sonrası otomatik tekrar giriş hatası düzeltildi
// FAZ 11 v3: Uygulama ikonu varsayılana dönmüyordu — 'DEFAULT' geçersiz
// alias adıydı, boş string ile düzeltildi
// ============================================================
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { setAppIcon } from 'expo-dynamic-app-icon';
import { auth, database } from '../config/firebase';
import { getKresForUser, findUserIdByAuthUid, usernameToEmail } from '../utils/authHelpers';
import { setUsageUser, trackLogin, trackLogout } from '../services/usageTracker';

const AuthContext = createContext(null);

const USER_KEY = 'yumurcak_kullanici';
const KRES_KEY = 'yumurcak_kres';

function getStoredPassword(user) {
  return String(
    user?.sifre ??
    user?.['şifre'] ??
    user?.password ??
    user?.parola ??
    user?.pass ??
    ''
  ).trim();
}

function getStoredEmail(user) {
  return String(user?.email || usernameToEmail(user?.kullaniciAdi || user?.username || '')).trim().toLowerCase();
}

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null);
  const [kres, setKres] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const isSigningOutRef = useRef(false);
  const restoringAuthRef = useRef(false);
  // FAZ 12: analitikte şişme yapan tekrarlı "login" event'lerini engeller.
  // onAuthStateChanged; token yenileme, restoreFirebaseSession'ın tetiklediği
  // ikinci auth döngüsü ve app yeniden başlatmalarında da çalışabiliyor —
  // aynı kullanıcı için art arda trackLogin() çağrılmasını burada keseriz.
  const lastTrackedLoginUserIdRef = useRef(null);

  const maybeTrackLogin = useMemo(
    () => (userId) => {
      if (!userId) return;
      if (lastTrackedLoginUserIdRef.current === userId) return;
      lastTrackedLoginUserIdRef.current = userId;
      trackLogin();
    },
    []
  );

  useEffect(() => {
    try {
      const iconKey = kres?.appIconKey || '';
      const result = setAppIcon(iconKey);
      if (result === false) {
        console.warn('Uygulama ikonu değiştirilemedi');
      }
    } catch (error) {
      console.warn('Uygulama ikonu değiştirilemedi:', error?.message || error);
    }
  }, [kres?.appIconKey]);

  useEffect(() => {
    AsyncStorage.getItem(KRES_KEY)
      .then((kayitliKresStr) => {
        if (kayitliKresStr) {
          try {
            setKres(JSON.parse(kayitliKresStr));
          } catch (error) {
            // Bozuk önbellek verisi varsa sessizce yok say, normal akış devam eder
          }
        }
      })
      .catch(() => {});
  }, []);

  const restoreFirebaseSession = async (user) => {
    if (auth.currentUser || restoringAuthRef.current || isSigningOutRef.current) return;

    const email = getStoredEmail(user);
    const password = getStoredPassword(user);
    if (!email || !password || password.length < 6) return;

    restoringAuthRef.current = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.warn('Firebase oturumu geri açılamadı:', error?.code || error?.message || error);
    } finally {
      restoringAuthRef.current = false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (isSigningOutRef.current) {
          setKullanici(null);
          setKres(null);
          setUsageUser(null);
          lastTrackedLoginUserIdRef.current = null;
          setYukleniyor(false);
          return;
        }

        if (firebaseUser) {
          const legacyUserId = await findUserIdByAuthUid(firebaseUser.uid);

          if (legacyUserId) {
            const userSnap = await get(ref(database, `kullanicilar/${legacyUserId}`));

            if (userSnap.exists()) {
              const userData = {
                uid: legacyUserId,
                id: legacyUserId,
                authUid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userSnap.val(),
              };

              const kresObj = await getKresForUser(userData);

              setKullanici(userData);
              setKres(kresObj);
              setUsageUser(userData);
              maybeTrackLogin(legacyUserId);

              await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
              if (kresObj) await AsyncStorage.setItem(KRES_KEY, JSON.stringify(kresObj));
              else await AsyncStorage.removeItem(KRES_KEY);

              setYukleniyor(false);
              return;
            }
          }
        }

        await legacyStorageLogin();
      } catch (error) {
        console.warn('Auth kontrol hatası:', error);
        if (!isSigningOutRef.current) {
          await legacyStorageLogin();
        }
      } finally {
        setYukleniyor(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const legacyStorageLogin = async () => {
    try {
      if (isSigningOutRef.current) {
        setKullanici(null);
        setKres(null);
        setUsageUser(null);
        return;
      }

      const kayitliKullanici = await AsyncStorage.getItem(USER_KEY);
      const kayitliKres = await AsyncStorage.getItem(KRES_KEY);

      if (!kayitliKullanici) {
        setKullanici(null);
        setKres(null);
        setUsageUser(null);
        return;
      }

      const kullaniciObj = JSON.parse(kayitliKullanici);
      const legacyId = kullaniciObj.uid || kullaniciObj.id;

      if (!legacyId) {
        await AsyncStorage.multiRemove([USER_KEY, KRES_KEY]);
        setKullanici(null);
        setKres(null);
        setUsageUser(null);
        return;
      }

      const snap = await get(ref(database, `kullanicilar/${legacyId}`));

      if (snap.exists()) {
        const freshUser = { ...kullaniciObj, uid: legacyId, id: legacyId, ...snap.val() };
        const kresObj = kayitliKres ? JSON.parse(kayitliKres) : await getKresForUser(freshUser);

        setKullanici(freshUser);
        setKres(kresObj);
        setUsageUser(freshUser);
        maybeTrackLogin(legacyId);
        restoreFirebaseSession(freshUser).catch((error) => console.warn('Otomatik auth yenileme hatası:', error?.message || error));
      } else {
        await AsyncStorage.multiRemove([USER_KEY, KRES_KEY]);
        setKullanici(null);
        setKres(null);
        setUsageUser(null);
        lastTrackedLoginUserIdRef.current = null;
      }
    } catch (error) {
      console.warn('Eski oturum kontrol hatası:', error);
      setKullanici(null);
      setKres(null);
      setUsageUser(null);
    }
  };

  const girisYap = async (kullaniciObj, kresObj) => {
    isSigningOutRef.current = false;

    const normalizedUser = {
      ...kullaniciObj,
      uid: kullaniciObj.uid || kullaniciObj.id,
      id: kullaniciObj.id || kullaniciObj.uid,
    };

    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      if (kresObj) await AsyncStorage.setItem(KRES_KEY, JSON.stringify(kresObj));
      else await AsyncStorage.removeItem(KRES_KEY);
    } catch (error) {
      console.warn('Oturum kaydedilemedi:', error);
    }

    setKullanici(normalizedUser);
    setKres(kresObj || null);
    setUsageUser(normalizedUser);
    maybeTrackLogin(normalizedUser.id || normalizedUser.uid);
    restoreFirebaseSession(normalizedUser).catch((error) => console.warn('Giriş sonrası auth yenileme hatası:', error?.message || error));
  };

  const cikisYap = async () => {
    trackLogout();
    isSigningOutRef.current = true;
    lastTrackedLoginUserIdRef.current = null;

    setKullanici(null);
    setKres(null);
    setUsageUser(null);

    try {
      await AsyncStorage.multiRemove([USER_KEY, KRES_KEY]);
    } catch (error) {
      console.warn('Local oturum temizlenemedi:', error);
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Firebase çıkış hatası:', error);
    }

    setTimeout(() => {
      isSigningOutRef.current = false;
    }, 700);
  };

  return (
    <AuthContext.Provider value={{ kullanici, kres, yukleniyor, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
