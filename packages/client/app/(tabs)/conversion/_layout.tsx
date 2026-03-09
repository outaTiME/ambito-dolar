import { Stack } from 'expo-router';

import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';

export default function ConversionStackLayout() {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Stack
      screenOptions={Helper.getStackScreenOptions({ theme, fonts }) as any}
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
