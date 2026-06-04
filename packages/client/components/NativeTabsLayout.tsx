import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default function NativeTabsLayout() {
  const { theme } = Helper.useTheme();
  return (
    <NativeTabs
      minimizeBehavior="never"
      // keep tab bar opaque at scroll edge (iOS 18 defaults to transparent).
      // pinned to current react-native-screens; revisit on expo 56 upgrade.
      disableTransparentOnScrollEdge
      {...(!Settings.IS_LIQUID_GLASS && {
        blurEffect: theme,
      })}
      {...(Platform.OS === 'android' && {
        backgroundColor: Settings.getContentColor(theme),
        shadowColor: Settings.getSeparatorColor(theme),
        indicatorColor: 'transparent',
      })}
      tintColor={Settings.getForegroundColor(theme)}
      iconColor={Settings.getStrokeColor(theme)}
    >
      <NativeTabs.Trigger name="rates">
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons as any}
              name="cards-outline"
            />
          }
        />
        <NativeTabs.Trigger.Label hidden>Cotizaciones</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conversion">
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons as any}
              name="swap-horizontal-variant"
            />
          }
        />
        <NativeTabs.Trigger.Label hidden>Conversor</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons as any}
              name="cog-outline"
            />
          }
        />
        <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
