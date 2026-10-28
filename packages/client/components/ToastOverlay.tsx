import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLUMN_STYLE } from '@/components/ContentView';
import Toast from '@/components/Toast';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

// ios UITabBar 49pt, android 64dp M3 Expressive (forced via
// plugins/withAndroidBottomNavDimens, base M3 is 80dp)
const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 64 : 49;

export default function ToastOverlay() {
  const insets = useSafeAreaInsets();
  const [activityToast, setActivityToast] =
    Helper.useSharedState('activityToast');
  const [activeToast, setActiveToast] = React.useState<any>();
  const timeoutRef = React.useRef<any>(null);
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
  // the focused screen inset, published by withContainer
  const [screenInset] = Helper.useSharedState('toastInset');
  const bottom =
    Platform.OS === 'ios'
      ? (screenInset?.bottom ?? insets.bottom)
      : insets.bottom +
        (screenInset?.hasBottomTab === false ? 0 : TAB_BAR_HEIGHT);
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        // over the content column of the focused screen
        paddingLeft: screenInset?.left ?? insets.left,
        paddingRight: screenInset?.right ?? insets.right,
        pointerEvents: 'none',
      }}
    >
      <View style={COLUMN_STYLE}>
        <Toast
          isVisible={activeToast?.isVisible}
          text={activeToast?.message}
          hiddenOffset={TAB_BAR_HEIGHT}
        />
      </View>
    </View>
  );
}
