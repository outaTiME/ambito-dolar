import { init, setUserId, track } from '@amplitude/analytics-react-native';

import Settings from '../config/settings';

Settings.IS_PRODUCTION &&
  Settings.AMPLITUDE_KEY &&
  init(Settings.AMPLITUDE_KEY);

export default {
  setUserId,
  track,
};
