import AmbitoDolar from '@ambito-dolar/core';
import { Stack } from 'expo-router';

import { customHeaderBackOptions } from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';

export default function SettingsStackLayout() {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Stack
      screenOptions={
        {
          ...Helper.getStackScreenOptions({ theme, fonts }),
          ...customHeaderBackOptions,
        } as any
      }
    >
      <Stack.Screen
        name="index"
        options={{
          title: Helper.getScreenTitle(I18n.t('settings')),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: Helper.getScreenTitle(I18n.t('notifications')),
        }}
      />
      <Stack.Screen
        name="notifications/[type]"
        options={({ route }) => ({
          title: Helper.getScreenTitle(I18n.t('advanced_notifications')),
          ...((route as any)?.params?.type && {
            title: Helper.getScreenTitle(
              AmbitoDolar.getNotificationTitle((route as any).params.type),
            ),
          }),
        })}
      />
      <Stack.Screen
        name="appearance"
        options={{
          title: Helper.getScreenTitle(I18n.t('appearance')),
        }}
      />
      <Stack.Screen
        name="customize-rates/index"
        options={{
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
        }}
      />
      <Stack.Screen
        name="customize-rates/order"
        options={{
          title: Helper.getScreenTitle(I18n.t('rate_order')),
        }}
      />
      <Stack.Screen
        name="statistics"
        options={{
          title: Helper.getScreenTitle(I18n.t('statistics')),
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: Helper.getScreenTitle(I18n.t('about')),
        }}
      />
      <Stack.Screen
        name="developer"
        options={{
          title: Helper.getScreenTitle(I18n.t('developer')),
        }}
      />
      <Stack.Screen
        name="donate"
        options={{
          title: Helper.getScreenTitle(I18n.t('donate')),
        }}
      />
      <Stack.Screen
        name="rate-widget-preview"
        options={{
          title: Helper.getScreenTitle(I18n.t('detail')),
        }}
      />
    </Stack>
  );
}
