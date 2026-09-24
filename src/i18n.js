// ============================================================
// YUMURCAK — src/i18n.js
// i18next kurulumu. tr/en/ru/de/fr/ar kaynakları yüklü. Arapça (ar)
// RTL bir dildir — setAppLanguage() dil Arapça <-> diğer arasında
// geçtiğinde I18nManager RTL bayrağını günceller ve çağırana restart
// gerektiğini bildirir (bkz. setAppLanguage altındaki not).
// ============================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import tr from './locales/tr.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const LANGUAGE_STORAGE_KEY = '@yumurcak_language';
export const SUPPORTED_LANGUAGES = ['tr', 'en', 'ru', 'de', 'fr', 'ar'];
export const DEFAULT_LANGUAGE = 'tr';
// Arapça sağdan sola (RTL) bir dildir; layout şimdilik LTR bırakıldı,
// sadece metin çevirisi eklendi (bkz. plan notu).
export const RTL_LANGUAGES = ['ar'];

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  ru: { translation: ru },
  de: { translation: de },
  fr: { translation: fr },
  ar: { translation: ar },
};

// Senkron init: uygulama hiçbir ekranı beklemeden, doğrudan Türkçe
// kaynaklarla hazır olur. Böylece i18n kurulumu App.js'in render'ını
// geciktirmez ve mevcut kullanıcı deneyimi bu fazda birebir aynı kalır.
i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

// Daha önce kaydedilmiş bir dil tercihi varsa (Faz 5'teki dil seçiciden
// gelir) arka planda sessizce ona geçilir. Şu an için hiçbir yerden bu
// anahtara yazılmıyor, dolayısıyla pratikte hep Türkçe kalınır.
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  .then((stored) => {
    if (stored && SUPPORTED_LANGUAGES.includes(stored) && stored !== i18n.language) {
      i18n.changeLanguage(stored);
    }
  })
  .catch((error) => {
    console.warn('Dil tercihi okunamadı:', error?.message || error);
  });

export function isRTLLanguage(lng) {
  return RTL_LANGUAGES.includes(lng);
}

// Dili değiştirir ve gerekirse (Arapça <-> diğer diller geçişinde)
// native RTL bayrağını günceller. React Native'de RTL değişikliği
// canlı olarak uygulanmaz — bayrak sadece bir sonraki tam yeniden
// başlatmada (reload/restart) devreye girer ve o andan sonra native
// tarafta kalıcı olarak saklanır. Bu yüzden çağıran taraf (ekran),
// dönen { restartNeeded: true } durumunda kullanıcıya "uygulama
// yeniden başlatılacak" bildirimini gösterip restart'ı tetiklemeli
// (bkz. ParentProfileScreen.js — Updates.reloadAsync ile aynı desen
// App.js'teki OTA güncelleme akışında da kullanılıyor).
export async function setAppLanguage(lng) {
  if (!SUPPORTED_LANGUAGES.includes(lng)) return { restartNeeded: false };

  const wasRTL = I18nManager.isRTL;
  const willBeRTL = isRTLLanguage(lng);

  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch (error) {
    console.warn('Dil tercihi kaydedilemedi:', error?.message || error);
  }

  if (willBeRTL !== wasRTL) {
    I18nManager.allowRTL(willBeRTL);
    I18nManager.forceRTL(willBeRTL);
    return { restartNeeded: true };
  }

  return { restartNeeded: false };
}

export default i18n;
