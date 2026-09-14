// plugins/withAllowBackupFix.js
//
// Bazı üçüncü parti Android kütüphaneleri (örn. com.github.kaushik-naik:TAndroidLame)
// kendi AndroidManifest.xml dosyalarında allowBackup=true tanımlıyor. Bizim
// projemizde ise app.json > android.allowBackup = false olarak ayarlı.
// Gradle, iki farklı değeri otomatik birleştiremediği için
// "Manifest merger failed: Attribute application@allowBackup value=(false) ...
//  is also present at [...] value=(true)" hatası veriyor.
//
// Bu plugin, prebuild sırasında oluşturulan AndroidManifest.xml'deki
// <application> etiketine tools:replace="android:allowBackup" ekleyerek
// "çakışma olursa bizim değerimiz (false) geçerli olsun" diyor.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAllowBackupFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // xmlns:tools namespace'inin manifest kökünde tanımlı olduğundan emin ol
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application?.[0];
    if (application) {
      const existingReplace = application.$['tools:replace'];
      const replaceValue = 'android:allowBackup';

      if (!existingReplace) {
        application.$['tools:replace'] = replaceValue;
      } else if (!existingReplace.includes('allowBackup')) {
        application.$['tools:replace'] = `${existingReplace},${replaceValue}`;
      }
    }

    return config;
  });
};
