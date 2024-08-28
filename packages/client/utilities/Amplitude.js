import { init, setUserId, track } from '@amplitude/analytics-react-native';

import Settings from '../config/settings';

// https://www.docs.developers.amplitude.com/data/sdks/typescript-react-native/#optional-tracking
// https://www.docs.developers.amplitude.com/data/sdks/typescript-react-native/#advertising-identifiers
Settings.IS_PRODUCTION &&
  Settings.AMPLITUDE_KEY &&
  init(Settings.AMPLITUDE_KEY);

export default {
  setUserId,
  track,
};
