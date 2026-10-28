import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import HeaderButton, {
  customHeaderBackOptions,
} from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import { goBack } from '@/utilities/Navigation';

// android headerLeft comes from parent customHeaderBackOptions spread
const doneOptions = Platform.OS === 'ios' &&
  !Settings.IS_LIQUID_GLASS && {
    headerRight: () => (
      <HeaderButton.Text title={I18n.t('done')} onPress={goBack} />
    ),
  };

export default function ModalsLayout() {
  const { theme, fonts } = Helper.useTheme();
  // a native item, a react view in the Liquid Glass header breaks on window resize
  const doneToolbar = Settings.IS_LIQUID_GLASS && (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button onPress={goBack}>
        {I18n.t('done')}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
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
        options={{
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          ...doneOptions,
        }}
      >
        {doneToolbar}
      </Stack.Screen>
      <Stack.Screen
        name="customize-markets/index"
        options={{
          title: Helper.getScreenTitle(I18n.t('markets')),
          ...doneOptions,
        }}
      >
        {doneToolbar}
      </Stack.Screen>
      <Stack.Screen
        name="customize-rates/order"
        options={{
          title: Helper.getScreenTitle(I18n.t('rate_order')),
        }}
      />
    </Stack>
  );
}
