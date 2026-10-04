// Keeps Silent Support's on-device data out of Android cloud backup and
// phone-to-phone transfer. History, preferences and the sign-in session all live
// in one AsyncStorage database, so nothing is backed up: signed-out check-ins stay
// on this phone, and signed-in users get theirs back by signing in.
//
// `android.allowBackup: false` (app.json) turns backup off, but for apps that
// target Android 12+ some phones still run device-to-device transfers. These rules
// exclude every app data location from both modes on Android 12+
// (dataExtractionRules) and from backup on Android 11 and lower
// (fullBackupContent).
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const DOMAINS = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];

const excludeAll = (indent) =>
  DOMAINS.map((domain) => `${indent}<exclude domain="${domain}" path="." />`).join('\n');

const DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${excludeAll('    ')}
  </cloud-backup>
  <device-transfer>
${excludeAll('    ')}
  </device-transfer>
</data-extraction-rules>
`;

const BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
${excludeAll('  ')}
</full-backup-content>
`;

module.exports = function withNoAndroidBackup(config) {
  config = withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    app.$['android:fullBackupContent'] = '@xml/backup_rules';
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const dir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'data_extraction_rules.xml'), DATA_EXTRACTION_RULES);
      fs.writeFileSync(path.join(dir, 'backup_rules.xml'), BACKUP_RULES);
      return mod;
    },
  ]);
};
