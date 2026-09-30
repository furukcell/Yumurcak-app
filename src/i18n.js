// ============================================================
// YUMURCAK — src/i18n.js
// ============================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { auth, database } from './config/firebase';
import { ref, update } from 'firebase/database';
import { findUserIdByAuthUid } from './utils/authHelpers';
import tr from './locales/tr.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const LANGUAGE_STORAGE_KEY = '@yumurcak_language';
export const SUPPORTED_LANGUAGES = ['tr', 'en', 'ru', 'de', 'fr', 'ar'];
export const DEFAULT_LANGUAGE = 'tr';
export const RTL_LANGUAGES = ['ar'];
const resources = { tr: { translation: tr }, en: { translation: en }, ru: { translation: ru }, de: { translation: de }, fr: { translation: fr }, ar: { translation: ar } };

i18n.use(initReactI18next).init({ resources, lng: DEFAULT_LANGUAGE, fallbackLng: DEFAULT_LANGUAGE, compatibilityJSON: 'v4', interpolation: { escapeValue: false }, returnEmptyString: false });
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
  if (stored && SUPPORTED_LANGUAGES.includes(stored) && stored !== i18n.language) i18n.changeLanguage(stored);
}).catch((error) => console.warn('Dil tercihi okunamadı:', error?.message || error));
export function isRTLLanguage(lng) { return RTL_LANGUAGES.includes(lng); }
export async function setAppLanguage(lng) {
  if (!SUPPORTED_LANGUAGES.includes(lng)) return { restartNeeded: false };
  const wasRTL = I18nManager.isRTL;
  const willBeRTL = isRTLLanguage(lng);
  await i18n.changeLanguage(lng);
  try { await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng); } catch (error) { console.warn('Dil tercihi kaydedilemedi:', error?.message || error); }
  try {
    const authUid = auth.currentUser?.uid;
    if (authUid) {
      const userId = await findUserIdByAuthUid(authUid);
      if (userId) await update(ref(database, `kullanicilar/${userId}`), { dil: lng });
    }
  } catch (error) {
    console.warn("Kullanıcı dili Firebase'e kaydedilemedi:", error?.message || error);
  }
  if (willBeRTL !== wasRTL) {
    I18nManager.allowRTL(willBeRTL);
    I18nManager.forceRTL(willBeRTL);
    return { restartNeeded: true };
  }
  return { restartNeeded: false };
}
export default i18n;
