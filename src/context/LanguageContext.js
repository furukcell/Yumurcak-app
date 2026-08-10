// ============================================================
// YUMURCAK — src/context/LanguageContext.js
// Aktif dili ve dil değiştirme fonksiyonunu uygulamaya yayar.
// Faz 5'te dil seçici ekranı bu context'i kullanacak.
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import i18n, { DEFAULT_LANGUAGE, setAppLanguage } from '../i18n';

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  changeLanguage: async () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(i18n.language || DEFAULT_LANGUAGE);

  useEffect(() => {
    const handleLanguageChanged = (lng) => setLanguage(lng);
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const value = useMemo(
    () => ({
      language,
      changeLanguage: setAppLanguage,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
