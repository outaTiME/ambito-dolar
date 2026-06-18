const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// force Material 3 NavigationBar min-height to 64dp (M3 Expressive baseline,
// base M3 is 80dp). app resources win over library at name resolution so
// rn-screens hardcoded M3 theme picks our value
// ref https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md
const M3_EXPRESSIVE_NAV_BAR_HEIGHT_DP = 64;

module.exports = function withAndroidBottomNavDimens(appConfig) {
  return withDangerousMod(appConfig, [
    'android',
    async (config) => {
      try {
        const dimensPath = path.join(
          config.modRequest.platformProjectRoot,
          'app/src/main/res/values/dimens.xml',
        );
        const xml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <dimen name="m3_bottom_nav_min_height">${M3_EXPRESSIVE_NAV_BAR_HEIGHT_DP}dp</dimen>
</resources>
`;
        fs.mkdirSync(path.dirname(dimensPath), { recursive: true });
        fs.writeFileSync(dimensPath, xml);
      } catch (e) {
        console.error('withAndroidBottomNavDimens failed', e);
      }
      return config;
    },
  ]);
};
