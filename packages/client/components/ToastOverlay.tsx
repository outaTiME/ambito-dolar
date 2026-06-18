import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Toast from '@/components/Toast';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

// ios UITabBar 49pt, android 64dp M3 Expressive (forced via
// plugins/withAndroidBottomNavDimens, base M3 is 80dp)
const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 64 : 49;

function ToastOverlay() {
  const insets = useSafeAreaInsets();
  const [activityToast, setActivityToast] =
    Helper.useSharedState('activityToast');
  const [activeToast, setActiveToast] = React.useState<any>();
  const timeoutRef = React.useRef(null);
  React.useEffect(() => {
    if (activityToast) {
      setActivityToast(null);
      if (!activeToast?.isVisible) {
        setActiveToast({ isVisible: true, ...activityToast });
        activityToast.feedback &&
          Settings.HAPTICS_ENABLED &&
          Haptics.notificationAsync();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setActiveToast({ isVisible: false, ...activityToast });
          timeoutRef.current = null;
        }, 2 * 1000);
      }
    }
  }, [activeToast?.isVisible, activityToast, setActivityToast]);
  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );
  const bottom = insets.bottom + TAB_BAR_HEIGHT;
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        pointerEvents: 'none',
      }}
    >
      <Toast
        isVisible={activeToast?.isVisible}
        text={activeToast?.message}
        hiddenOffset={TAB_BAR_HEIGHT}
        onCompleted={() => {}}
      />
    </View>
  );
}

// classic Tabs on android renders toasts via ToastBottomTabBar, skip overlay
const isAndroidClassicTabs =
  Platform.OS === 'android' && !Settings.USE_NATIVE_TABS_ANDROID;
export default isAndroidClassicTabs ? () => null : ToastOverlay;
