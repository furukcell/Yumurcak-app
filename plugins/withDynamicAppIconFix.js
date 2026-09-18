// plugins/withDynamicAppIconFix.js
//
// expo-dynamic-app-icon v1.2.0 Android tarafında MainActivity'yi doğrudan
// LAUNCHER olarak bırakıyor. setAppIcon() bir activity-alias'ı açtığında
// MainActivity de launcher olarak açık kaldığı için bazı cihazlarda iki
// Yumurcak ikonu görünebiliyor.
//
// Bu plugin:
// 1) MainActivity üzerindeki sadece MAIN/LAUNCHER filtresini kaldırır.
// 2) DEFAULT ikon için ayrı bir MainActivityDEFAULT alias'ı oluşturur.
// 3) expo-dynamic-app-icon native kodunu DEFAULT alias'ını başlangıç ikonu
//    olarak kullanacak şekilde patch'ler.
//
// Böylece aynı anda yalnızca bir launcher component'i aktif kalır ve
// deep-link/notification işlemleri gerçek MainActivity üzerinde çalışmaya
// devam eder.

const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

const DEFAULT_ALIAS_SUFFIX = 'DEFAULT';

function removeLauncherIntentFilter(activity) {
  const filters = activity['intent-filter'] || [];
  activity['intent-filter'] = filters.filter((filter) => {
    const actions = filter.action || [];
    const categories = filter.category || [];

    const isMain = actions.some(
      (action) => action?.$?.['android:name'] === 'android.intent.action.MAIN'
    );
    const isLauncher = categories.some(
      (category) =>
        category?.$?.['android:name'] === 'android.intent.category.LAUNCHER'
    );

    return !(isMain && isLauncher);
  });

  if (activity['intent-filter'].length === 0) {
    delete activity['intent-filter'];
  }
}

module.exports = function withDynamicAppIconFix(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];

    if (!application) {
      throw new Error('Yumurcak dynamic icon fix: Android application bulunamadı.');
    }

    const activities = application.activity || [];
    const mainActivity = activities.find(
      (activity) => activity?.$?.['android:name'] === '.MainActivity'
    );

    if (!mainActivity) {
      throw new Error('Yumurcak dynamic icon fix: .MainActivity bulunamadı.');
    }

    // MainActivity uygulamanın gerçek Activity'si olarak kalır; yalnızca
    // launcher filtresini alias'a taşırız. VIEW/BROWSABLE gibi deep-link
    // filtrelerine dokunmuyoruz.
    removeLauncherIntentFilter(mainActivity);

    const packageName = config.android?.package;
    if (!packageName) {
      throw new Error('Yumurcak dynamic icon fix: android.package bulunamadı.');
    }

    const aliasName = packageName + '.MainActivity' + DEFAULT_ALIAS_SUFFIX;
    const aliases = application['activity-alias'] || [];

    // Dynamic icon plugin'in önceki üretiminden kalmış aynı alias varsa
    // duplicate oluşmasını engelle.
    application['activity-alias'] = aliases.filter(
      (alias) => alias?.$?.['android:name'] !== aliasName
    );

    application['activity-alias'].unshift({
      $: {
        'android:name': aliasName,
        'android:enabled': 'true',
        'android:exported': 'true',
        'android:icon': '@mipmap/ic_launcher',
        'android:label': '@string/app_name',
        'android:targetActivity': '.MainActivity',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.intent.action.MAIN' } },
          ],
          category: [
            { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
          ],
        },
      ],
    });

    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const modulePath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-dynamic-app-icon',
        'android',
        'src',
        'main',
        'java',
        'expo',
        'modules',
        'dynamicappicon',
        'ExpoDynamicAppIconModule.kt'
      );

      if (!fs.existsSync(modulePath)) {
        throw new Error(
          'Yumurcak dynamic icon fix: expo-dynamic-app-icon native Kotlin dosyası bulunamadı: ' +
            modulePath
        );
      }

      let source = fs.readFileSync(modulePath, 'utf8');

      const oldNewIcon =
        'var newIcon:String = context.packageName + ".MainActivity" + name';
      const oldCurrentIcon =
        'var currentIcon:String = if(!SharedObject.icon.isEmpty()) SharedObject.icon else context.packageName + ".MainActivity"';

      const newNewIcon =
        'var newIcon:String = if(name.isEmpty()) context.packageName + ".MainActivityDEFAULT" else context.packageName + ".MainActivity" + name';
      const newCurrentIcon =
        'var currentIcon:String = if(!SharedObject.icon.isEmpty()) SharedObject.icon else context.packageName + ".MainActivityDEFAULT"';

      if (source.includes(oldNewIcon)) {
        source = source.replace(oldNewIcon, newNewIcon);
      } else if (!source.includes(newNewIcon)) {
        throw new Error(
          'Yumurcak dynamic icon fix: setAppIcon newIcon satırı beklenen formatta değil.'
        );
      }

      if (source.includes(oldCurrentIcon)) {
        source = source.replace(oldCurrentIcon, newCurrentIcon);
      } else if (!source.includes(newCurrentIcon)) {
        throw new Error(
          'Yumurcak dynamic icon fix: currentIcon satırı beklenen formatta değil.'
        );
      }

      fs.writeFileSync(modulePath, source, 'utf8');

      return config;
    },
  ]);

  return config;
};
