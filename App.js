// ============================================================
// YUMURCAK — App.js
// Otomatik giriş + rol bazlı yönlendirme
// ============================================================

import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RENKLER, ROLLER, DB_URL } from './constants';

// Ekranlar
import { GirisEkrani }     from './screens/AuthScreens';
import { YoneticiEkrani }  from './screens/YoneticiScreen';
import { OgretmenEkrani }  from './screens/OgretmenScreen';
import { VeliEkrani }      from './screens/VeliScreen';

export default function App() {
  const [yukleniyor, setYukleniyor]   = useState(true);
  const [kullanici, setKullanici]     = useState(null);
  const [token, setToken]             = useState(null);
  const [kres, setKres]               = useState(null);   // hangi kreş
  const [ekran, setEkran]             = useState('giris');

  // ============================================================
  // UYGULAMA AÇILINCA — AsyncStorage'dan kullanıcı kontrol et
  // ============================================================
  useEffect(() => {
    otomatikGirisKontrol();
  }, []);

  const otomatikGirisKontrol = async () => {
    try {
      const kayitliKullanici = await AsyncStorage.getItem('yumurcak_kullanici');
      const kayitliToken     = await AsyncStorage.getItem('yumurcak_token');
      const kayitliKres      = await AsyncStorage.getItem('yumurcak_kres');

      if (kayitliKullanici && kayitliToken) {
        const kullaniciObj = JSON.parse(kayitliKullanici);
        const kresObj      = kayitliKres ? JSON.parse(kayitliKres) : null;

        // Firebase'den güncel kullanıcı bilgisini çek
        const res  = await fetch(`${DB_URL}/kullanicilar/${kullaniciObj.uid}.json`);
        const data = await res.json();

        if (data) {
          setKullanici({ ...kullaniciObj, ...data });
          setToken(kayitliToken);
          setKres(kresObj);
          rolEkraninaGit(data.rol);
        } else {
          // Kullanıcı silinmiş olabilir
          await AsyncStorage.multiRemove(['yumurcak_kullanici', 'yumurcak_token', 'yumurcak_kres']);
          setEkran('giris');
        }
      } else {
        setEkran('giris');
      }
    } catch (e) {
      setEkran('giris');
    } finally {
      setYukleniyor(false);
    }
  };

  const rolEkraninaGit = (rol) => {
    if (rol === ROLLER.YONETICI)       setEkran('yonetici');
    else if (rol === ROLLER.OGRETMEN)  setEkran('ogretmen');
    else if (rol === ROLLER.COCUK)     setEkran('veli');
    else                               setEkran('giris');
  };

  // ============================================================
  // GİRİŞ BAŞARILI — kaydet ve yönlendir
  // ============================================================
  const girisYapildi = async (kullaniciObj, tokenStr, kresObj) => {
    try {
      await AsyncStorage.setItem('yumurcak_kullanici', JSON.stringify(kullaniciObj));
      await AsyncStorage.setItem('yumurcak_token',     tokenStr);
      await AsyncStorage.setItem('yumurcak_kres',      JSON.stringify(kresObj));
    } catch (e) {}

    setKullanici(kullaniciObj);
    setToken(tokenStr);
    setKres(kresObj);
    rolEkraninaGit(kullaniciObj.rol);
  };

  // ============================================================
  // ÇIKIŞ YAP
  // ============================================================
  const cikisYap = async () => {
    try {
      await AsyncStorage.multiRemove(['yumurcak_kullanici', 'yumurcak_token', 'yumurcak_kres']);
    } catch (e) {}
    setKullanici(null);
    setToken(null);
    setKres(null);
    setEkran('giris');
  };

  // ============================================================
  // YÜKLEME EKRANI
  // ============================================================
  if (yukleniyor) {
    return (
      <View style={s.yuklemeEkrani}>
        <Text style={s.logo}>🌟</Text>
        <Text style={s.logoYazi}>YUMURCAK</Text>
        <ActivityIndicator color={RENKLER.turuncu} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  // ============================================================
  // ORTAK PROPS
  // ============================================================
  const ortakProps = { kullanici, setKullanici, token, kres, cikisYap };

  // ============================================================
  // EKRAN YÖNLENDIRME
  // ============================================================
  if (ekran === 'giris') {
    return <GirisEkrani onGiris={girisYapildi} />;
  }

  if (ekran === 'yonetici') {
    return <YoneticiEkrani {...ortakProps} />;
  }

  if (ekran === 'ogretmen') {
    return <OgretmenEkrani {...ortakProps} />;
  }

  if (ekran === 'veli') {
    return <VeliEkrani {...ortakProps} />;
  }

  return <GirisEkrani onGiris={girisYapildi} />;
}

// ============================================================
// STİLLER
// ============================================================
const s = StyleSheet.create({
  yuklemeEkrani: {
    flex: 1,
    backgroundColor: RENKLER.turuncu,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    marginBottom: 10,
  },
  logoYazi: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
  },
});
