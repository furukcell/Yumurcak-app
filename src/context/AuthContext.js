// ============================================================
// YUMURCAK — AuthContext.js
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DB_URL, ROLLER } from '../constants';  // ✅ 1 seviye yukarı

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null);
  const [kres, setKres]           = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Uygulama açılınca kayıtlı kullanıcıyı kontrol et
  useEffect(() => {
    otomatikGirisKontrol();
  }, []);

  const otomatikGirisKontrol = async () => {
    try {
      const kayitliKullanici = await AsyncStorage.getItem('yumurcak_kullanici');
      const kayitliKres      = await AsyncStorage.getItem('yumurcak_kres');

      if (kayitliKullanici) {
        const kullaniciObj = JSON.parse(kayitliKullanici);
        const kresObj      = kayitliKres ? JSON.parse(kayitliKres) : null;

        // Firebase'den güncel bilgiyi doğrula
        const res  = await fetch(`${DB_URL}/kullanicilar/${kullaniciObj.uid}.json`);
        const data = await res.json();

        if (data) {
          setKullanici({ ...kullaniciObj, ...data });
          setKres(kresObj);
        } else {
          // Kullanıcı silinmiş
          await AsyncStorage.multiRemove(['yumurcak_kullanici', 'yumurcak_kres']);
        }
      }
    } catch (e) {
      console.warn('Otomatik giriş hatası:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  const girisYap = async (kullaniciObj, kresObj) => {
    try {
      await AsyncStorage.setItem('yumurcak_kullanici', JSON.stringify(kullaniciObj));
      await AsyncStorage.setItem('yumurcak_kres',      JSON.stringify(kresObj));
    } catch (e) {}
    setKullanici(kullaniciObj);
    setKres(kresObj);
  };

  const cikisYap = async () => {
    try {
      await AsyncStorage.multiRemove(['yumurcak_kullanici', 'yumurcak_kres']);
    } catch (e) {}
    setKullanici(null);
    setKres(null);
  };

  return (
    <AuthContext.Provider value={{ kullanici, setKullanici, kres, yukleniyor, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
