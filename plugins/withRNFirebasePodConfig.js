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
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};
