import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialIcons';
import { HeaderButton } from '@react-navigation/elements';
import { router } from 'expo-router';
import { Text } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

const ButtonBase = ({ onPress, children }: any) => {
  return (
    <HeaderButton
      onPress={onPress}
      style={{
        // marginHorizontal: -8,
        // prevents ripple cutoff on android
        padding: 8,
      }}
    >
      {children}
    </HeaderButton>
  );
};

const IconButton = ({ iconName, community = false, onPress }: any) => {
  const { theme } = Helper.useTheme();
  const Icon = community === true ? MaterialCommunityIcons : MaterialIcons;
  return (
    <ButtonBase onPress={onPress}>
      <Icon
        name={iconName}
        size={Settings.ICON_SIZE}
        color={(Settings as any).getForegroundColor(theme)}
      />
    </ButtonBase>
  );
};

const TextButton = ({ title, onPress }: any) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <ButtonBase onPress={onPress}>
      <Text
        style={{
          ...fonts.body,
          color: (Settings as any).getForegroundColor(theme),
        }}
      >
        {title}
      </Text>
    </ButtonBase>
  );
};

// non-Liquid-Glass platforms (legacy iOS + Android) get custom back button matching headerRight
export const customHeaderBackOptions = Settings.IS_LIQUID_GLASS
  ? {}
  : {
      headerBackVisible: false,
      headerLeft: ({ canGoBack }: { canGoBack?: boolean }) =>
        canGoBack ? (
          <IconButton iconName="arrow-back" onPress={() => router.back()} />
        ) : null,
    };

export default {
  Icon: IconButton,
  Text: TextButton,
};
