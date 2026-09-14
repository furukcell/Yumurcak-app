// plugins/withJvmTargetFix.js
//
// Bazı üçüncü parti Expo native modülleri (örn. expo-dynamic-app-icon)
// kendi android/build.gradle dosyalarında Kotlin jvmTarget'i eski bir
// sürüme (VERSION_11) sabitliyor. Proje Java 17 ile derlendiği için
// Gradle "Inconsistent JVM-target compatibility" hatası veriyor.
//
// Bu plugin, prebuild sırasında root android/build.gradle dosyasının
// sonuna TÜM alt modülleri (subprojects) Java 17 / Kotlin 17'ye
// zorlayan bir blok ekliyor.
//
// NOT: "subprojects { afterEvaluate {} }" yerine "gradle.projectsEvaluated"
// kullanılıyor — çünkü Expo'nun autolinking sistemi bazı alt modülleri
// bizim kodumuz çalışmadan önce zaten evaluate ediyor, bu da
// "Cannot run Project.afterEvaluate(Closure) when the project is
// already evaluated" hatasına yol açıyordu. gradle.projectsEvaluated
// tüm projeler evaluate olduktan SONRA, tek seferde ve güvenli şekilde
// çalışır, bu hatayı tamamen ortadan kaldırır.
const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// JVM_TARGET_FIX';

const FIX_BLOCK = `
${MARKER}
gradle.projectsEvaluated {
  rootProject.subprojects.each { subproject ->
    if (subproject.hasProperty('android')) {
      subproject.android {
        compileOptions {
          sourceCompatibility JavaVersion.VERSION_17
          targetCompatibility JavaVersion.VERSION_17
        }
      }
    }
    subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      kotlinOptions {
        jvmTarget = "17"
      }
    }
  }
}
`;

module.exports = function withJvmTargetFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      if (!config.modResults.contents.includes(MARKER)) {
        config.modResults.contents += `\n${FIX_BLOCK}\n`;
      }
    }
    return config;
  });
};
