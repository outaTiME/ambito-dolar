import * as Device from 'expo-device';
import { Dimensions, Platform } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// below the ipad mini in portrait so a rotation never stretches it, the why in adaptive-layout.md
export const MAX_CONTENT_WIDTH = 640;

// web keeps the width taken at load, half of it outside a phone
// the social cards render at a fixed size
const { width: webWidth } = Dimensions.get('window');
export const WEB_WIDTH =
  Device.deviceType === Device.DeviceType.PHONE ? webWidth : webWidth / 2;

const useContentLayout = () => {
  // the nearest provider, the window or the tab screen
  const { width } = useSafeAreaFrame();
  const { left, right } = useSafeAreaInsets();
  if (Platform.OS === 'web') {
    return WEB_WIDTH;
  }
  // ContentView lays the column out natively, the width here drives js decisions only
  return Math.min(width - left - right, MAX_CONTENT_WIDTH);
};

export default useContentLayout;
