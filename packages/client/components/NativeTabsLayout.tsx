import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default function NativeTabsLayout() {
  const { theme } = Helper.useTheme();
  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      labelVisibilityMode="unlabeled"
      minimizeBehavior="never"
      tintColor={Settings.getForegroundColor(theme)}
      iconColor={Settings.getStrokeColor(theme)}
      {...Platform.select({
        android: {
          // bg matches header card color for coherent surface
          backgroundColor: Settings.getContentColor(theme),
          // soft gray pill to match iOS native subtle selection tone
          indicatorColor: Settings.getStrokeColor(theme, true),
          selectedIconColor: Settings.getForegroundColor(theme),
          rippleColor: Settings.getRippleColor(theme),
        },
        // LG iOS 26+ ships its own material
        ios: !Settings.IS_LIQUID_GLASS && { blurEffect: theme },
      })}
    >
      <NativeTabs.Trigger name="rates">
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="cards-outline"
            />
          }
        />
        <NativeTabs.Trigger.Label hidden>
          {I18n.t('rates')}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conversion">
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="swap-horizontal-variant"
            />
          }
        />
        <NativeTabs.Trigger.Label hidden>
          {I18n.t('conversion')}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="cog-outline"
            />
          }
        />
        <NativeTabs.Trigger.Label hidden>
          {I18n.t('settings')}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
