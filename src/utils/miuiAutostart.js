import { Platform, Alert, Linking } from 'react-native';
import * as Device from 'expo-device';

/**
 * Xiaomi / Redmi / POCO (MIUI ve HyperOS) cihazları tespit eder.
 *
 * Bu üreticilerin agresif "arka plan sürecini öldürme" (Autostart kısıtlaması)
 * davranışı, galeri/dosya seçici ekranı açıkken uygulama arka plana düşünce
 * MIUI'nin süreci öldürmesine ve seçici sonucunun asla geri dönmemesine
 * ("sessiz timeout") sebep olabiliyor. Bkz: appErrorLogs kayıtları —
 * Redmi (manufacturer: Xiaomi) cihazlarda hem DocumentPicker hem
 * ImagePicker aynı şekilde 12 sn içinde timeout'a düşüyor.
 */
export function isXiaomiDevice() {
  if (Platform.OS !== 'android') return false;
  const manufacturer = String(Device.manufacturer || '').toLowerCase();
  const brand = String(Device.brand || '').toLowerCase();
  const xiaomiFamily = ['xiaomi', 'redmi', 'poco'];
  return xiaomiFamily.some((name) => manufacturer.includes(name) || brand.includes(name));
}

/**
 * Galeri/görsel seçici başarısız olduğunda (özellikle Xiaomi/MIUI
 * cihazlarda timeout durumunda) kullanıcıya ne yapması gerektiğini gösterir.
 *
 * Xiaomi cihazlarda + timeout durumunda: sorunun sebebini ve çözümünü
 * adım adım anlatan, "Ayarlara Git" butonlu bir diyalog gösterir.
 * Buton Linking.openSettings() ile uygulamanın Ayarlar > Uygulama
 * Bilgileri sayfasını açar. Bu, yeni bir native modül GEREKTİRMEZ —
 * react-native'in kendi Linking API'si, zaten kurulu. Yani bu tamamen
 * OTA (EAS Update) ile gönderilebilir, yeni build/mağaza incelemesi
 * gerekmez.
 *
 * Diğer cihazlarda ya da timeout dışındaki başarısızlıklarda daha genel,
 * nötr bir "tekrar dene" mesajı gösterir.
 *
 * @param {Object} params
 * @param {boolean} [params.isTimeout] - Başarısızlığın timeout kaynaklı olup olmadığı
 * @param {Function} [params.onDismiss] - Diyalog kapandığında çağrılır
 */
export function showPickerFailureGuidance({ isTimeout = true, onDismiss } = {}) {
  if (isXiaomiDevice() && isTimeout) {
    Alert.alert(
      'Galeri Açılmıyor mu?',
      'Bu telefonda (Xiaomi/Redmi/POCO), MIUI uygulamanın arka planda çalışmasını kısıtlayabiliyor. Bu yüzden galeri seçici bazen yanıt vermeden takılabiliyor.\n\n' +
        'Düzeltmek için:\n' +
        '1. "Ayarlara Git" butonuna bas\n' +
        '2. Açılan sayfada İzinler bölümünü bul\n' +
        '3. "Otomatik Başlatma" (Autostart) iznini AÇIK yap\n' +
        '4. Geri dönüp galeriyi tekrar dene',
      [
        { text: 'Vazgeç', style: 'cancel', onPress: onDismiss },
        {
          text: 'Ayarlara Git',
          onPress: async () => {
            try {
              await Linking.openSettings();
            } catch (settingsError) {
              console.warn('Ayarlar açılamadı:', settingsError?.message || settingsError);
              Alert.alert(
                'Hata',
                'Ayarlar açılamadı. Lütfen manuel olarak Ayarlar > Uygulamalar > Yumurcak yolunu izleyip Otomatik Başlatma iznini aç.'
              );
            } finally {
              onDismiss?.();
            }
          },
        },
      ],
      { cancelable: true, onDismiss }
    );
    return;
  }

  Alert.alert(
    'Seçici Açılamadı',
    'Galeri seçici yanıt vermedi. Lütfen tekrar dene. Sorun devam ederse telefonunu yeniden başlatmayı dene.',
    [{ text: 'Tamam', onPress: onDismiss }]
  );
}
