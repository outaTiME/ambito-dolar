import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import HeaderButton, {
  customHeaderBackOptions,
} from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';
import { goBack } from '@/utilities/Navigation';

export default function ModalsLayout() {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Stack
      screenOptions={{
        ...Helper.getStackScreenOptions({
          theme,
          fonts,
          modal: true,
        }),
        ...customHeaderBackOptions,
      }}
    >
      <Stack.Screen
        name="customize-rates/index"
        initialParams={{ modal: 'true' }}
        options={{
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          // android headerLeft comes from parent customHeaderBackOptions spread
          ...(Platform.OS === 'ios' && {
            headerRight: () => (
              <HeaderButton.Text title={I18n.t('done')} onPress={goBack} />
            ),
          }),
        }}
      />
      <Stack.Screen
        name="customize-rates/order"
        initialParams={{ modal: 'true' }}
        options={{
          title: Helper.getScreenTitle(I18n.t('rate_order')),
        }}
      />
    </Stack>
  );
}
