import { Stack } from 'expo-router';

import { customHeaderBackOptions } from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';

export default function ConversionStackLayout() {
  const { theme, fonts } = Helper.useTheme();
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
          title: Helper.getScreenTitle(I18n.t('conversion')),
        }}
      />
    </Stack>
  );
}
