const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withArcore(config) {
  return withAndroidManifest(config, (modConfig) => {
    modConfig.modResults.manifest['uses-feature'] = modConfig.modResults.manifest['uses-feature'] || [];
    const cameraAr = modConfig.modResults.manifest['uses-feature'].find(
      (item) => item.$?.['android:name'] === 'android.hardware.camera.ar'
    );
    if (cameraAr) {
      cameraAr.$['android:required'] = 'false';
    } else {
      modConfig.modResults.manifest['uses-feature'].push({
        $: { 'android:name': 'android.hardware.camera.ar', 'android:required': 'false' },
      });
    }

    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) return modConfig;

    application['meta-data'] = application['meta-data'] || [];
    const metadataName = 'com.google.ar.core';
    const existing = application['meta-data'].find((item) => item.$?.['android:name'] === metadataName);
    if (existing) {
      existing.$['android:value'] = 'optional';
    } else {
      application['meta-data'].push({
        $: { 'android:name': metadataName, 'android:value': 'optional' },
      });
    }
    return modConfig;
  });
};
