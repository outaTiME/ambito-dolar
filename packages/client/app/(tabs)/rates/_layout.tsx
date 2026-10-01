import AmbitoDolar from '@ambito-dolar/core';
import { Stack } from 'expo-router';

import { customHeaderBackOptions } from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RatesStackLayout() {
  const { theme, fonts } = Helper.useTheme();
  const marketsEnabled = Helper.useMarketsEnabled();
  return (
    <Stack
      screenOptions={{
        ...Helper.getStackScreenOptions({ theme, fonts }),
        ...customHeaderBackOptions,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          // the app name while there are no markets to tell apart
          title: Helper.getScreenTitle(
            marketsEnabled ? I18n.t('rates') : Settings.APP_NAME,
          ),
        }}
      />
      <Stack.Screen
        name="[type]"
        options={({ route }) => ({
          title: Helper.getScreenTitle(
            (route as any)?.params?.type
              ? AmbitoDolar.getRateTitle((route as any).params.type)
              : I18n.t('detail'),
          ),
        })}
      />
      <Stack.Screen
        name="[type]/raw"
        options={{
          title: Helper.getScreenTitle(I18n.t('detail')),
        }}
      />
    </Stack>
  );
}
