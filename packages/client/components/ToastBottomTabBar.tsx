import { BottomTabBar } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';

import Toast from '@/components/Toast';
import ToastPositionContainer from '@/components/ToastPositionContainer';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default function ToastBottomTabBar(props: any) {
  const tabBarHeight = Helper.getTabBarHeight(props.insets);
  const [activityToast, setActivityToast] =
    Helper.useSharedState('activityToast');
  const [activeToast, setActiveToast] = React.useState<any>();
  React.useEffect(() => {
    if (activityToast) {
      setActivityToast(null);
      if (!activeToast?.isVisible) {
        setActiveToast({
          isVisible: true,
          ...activityToast,
        });
        activityToast.feedback &&
          Settings.HAPTICS_ENABLED &&
          Haptics.notificationAsync();
        setTimeout(() => {
          setActiveToast({
            isVisible: false,
            ...activityToast,
          });
        }, 2 * 1000);
      }
    }
  }, [activeToast?.isVisible, activityToast, setActivityToast]);
  return (
    <>
      <ToastPositionContainer height={tabBarHeight}>
        <Toast
          isVisible={activeToast?.isVisible}
          text={activeToast?.message}
          onCompleted={() => {}}
        />
      </ToastPositionContainer>
      <BottomTabBar {...props} />
    </>
  );
}
