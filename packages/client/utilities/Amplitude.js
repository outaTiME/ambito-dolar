import { Amplitude } from '@amplitude/react-native';

import Settings from '../config/settings';

const init = (key) => {
  const instance = Amplitude.getInstance();
  instance.init(key).catch(console.warn);
  // extras here
  return instance;
};

const instance =
  Settings.IS_PRODUCTION &&
  Settings.AMPLITUDE_KEY &&
  init(Settings.AMPLITUDE_KEY);

const setUserId = (id) =>
  instance && instance.setUserId(id).catch(console.warn);
const logEvent = (type, props) =>
  instance && instance.logEvent(type, props).catch(console.warn);

export default {
  setUserId,
  logEvent,
};
