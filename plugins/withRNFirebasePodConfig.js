const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withRNFirebasePodConfig(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      const setting = "$RNFirebaseDisableSPM = true";
      if (!podfile.includes(setting)) {
        podfile = setting + "\n" + podfile;
      }

      const modularPods = [
        "GoogleUtilities",
        "GoogleDataTransport",
        "nanopb",
        "FirebaseCore",
        "FirebaseCoreInternal",
        "FirebaseCoreExtension",
        "FirebaseInstallations",
        "FirebaseCrashlytics",
        "FirebaseSessions"
      ];

      const marker = "# RNFirebase modular headers (Expo 54)";
      if (!podfile.includes(marker)) {
        const lines = modularPods
          .map((name) => "  pod '" + name + "', :modular_headers => true")
          .join("\n");

        const insertion = "\n" + marker + "\n" + lines + "\n";
        const useNativeModulesIndex = podfile.indexOf("config = use_native_modules!");

        if (useNativeModulesIndex !== -1) {
          podfile =
            podfile.slice(0, useNativeModulesIndex) +
            insertion +
            podfile.slice(useNativeModulesIndex);
        } else {
          const targetEnd = podfile.lastIndexOf("\nend");
          podfile =
            podfile.slice(0, targetEnd) +
            insertion +
            podfile.slice(targetEnd);
        }
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    }
  ]);
};
