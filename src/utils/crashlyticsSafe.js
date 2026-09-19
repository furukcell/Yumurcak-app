// Crashlytics'e güvenli ve lazy erişim.
// Amaç: Crashlytics JS modülü yüklenirken bir native/module hatası oluşursa
// uygulamanın açılışını engellememek. Native Crashlytics entegrasyonu yine kalır.

let crashlyticsInstance = null;
let loadAttempted = false;

function getCrashlytics() {
  if (crashlyticsInstance) return crashlyticsInstance;
  if (loadAttempted) return null;

  loadAttempted = true;

  try {
    const module = require('@react-native-firebase/crashlytics');
    const crashlyticsFactory = module?.default ?? module;

    if (typeof crashlyticsFactory !== 'function') {
      console.warn('Crashlytics modülü beklenen factory fonksiyonunu sağlamadı.');
      return null;
    }

    crashlyticsInstance = crashlyticsFactory();
    return crashlyticsInstance;
  } catch (error) {
    console.warn('Crashlytics JS modülü yüklenemedi:', error?.message || error);
    return null;
  }
}

export function crashLog(message) {
  try {
    getCrashlytics()?.log(String(message));
  } catch (error) {
    console.warn('Crashlytics log hatası:', error?.message || error);
  }
}

export function crashRecordError(error, jsErrorName) {
  try {
    const instance = getCrashlytics();
    if (!instance) return;

    const normalizedError = error instanceof Error
      ? error
      : new Error(String(error || 'Bilinmeyen hata'));

    instance.recordError(normalizedError, jsErrorName);
  } catch (crashlyticsError) {
    console.warn('Crashlytics recordError hatası:', crashlyticsError?.message || crashlyticsError);
  }
}

export function crashSetCollectionEnabled(enabled) {
  try {
    const instance = getCrashlytics();
    if (!instance) return;

    const result = instance.setCrashlyticsCollectionEnabled(Boolean(enabled));
    if (result?.catch) {
      result.catch((error) => {
        console.warn('Crashlytics collection ayarlanamadı:', error?.message || error);
      });
    }
  } catch (error) {
    console.warn('Crashlytics collection ayarlanamadı:', error?.message || error);
  }
}
