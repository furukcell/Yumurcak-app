// ============================================================
// YUMURCAK — src/i18n.js
// i18next kurulumu. Şimdilik sadece Türkçe (tr) ve İngilizce (en)
// kaynakları yükleniyor; veli tarafı ekranları Faz 4'te bu anahtarları
// kullanmaya başlayacak. Dil seçici Faz 5'te eklenene kadar uygulama
// her zaman Türkçe açılır — mevcut davranış değişmez.
// ============================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import de from './locales/de.json';
import fr from './locales/fr.json';

export const LANGUAGE_STORAGE_KEY = '@yumurcak_language';
export const SUPPORTED_LANGUAGES = ['tr', 'en', 'ru', 'de', 'fr'];
export const DEFAULT_LANGUAGE = 'tr';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  ru: { translation: ru },
  de: { translation: de },
  fr: { translation: fr },
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

export async function setAppLanguage(lng) {
  if (!SUPPORTED_LANGUAGES.includes(lng)) return;
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch (error) {
    console.warn('Dil tercihi kaydedilemedi:', error?.message || error);
  }
}

export default i18n;
