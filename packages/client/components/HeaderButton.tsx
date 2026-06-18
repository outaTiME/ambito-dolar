import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { HeaderButton } from 'expo-router/react-navigation';
import { Text } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import { goBack } from '@/utilities/Navigation';

const ButtonBase = ({ onPress, children }) => {
  const { theme } = Helper.useTheme();
  return (
    <HeaderButton
      onPress={onPress}
      pressColor={Settings.getRippleColor(theme)}
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

const IconButton = ({ iconName, community = false, onPress }) => {
  const { theme } = Helper.useTheme();
  const Icon = community === true ? MaterialCommunityIcons : MaterialIcons;
  return (
    <ButtonBase onPress={onPress}>
      <Icon
        name={iconName}
        size={Settings.ICON_SIZE}
        color={Settings.getForegroundColor(theme)}
      />
    </ButtonBase>
  );
};

const TextButton = ({ title, onPress }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <ButtonBase onPress={onPress}>
      <Text
        style={{
          ...fonts.body,
          color: Settings.getForegroundColor(theme),
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
      headerLeft: ({ canGoBack }) =>
        canGoBack ? (
          <IconButton iconName="arrow-back" onPress={goBack} />
        ) : null,
    };

export default {
  Icon: IconButton,
  Text: TextButton,
};
