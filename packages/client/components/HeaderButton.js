import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialIcons';
import { HeaderButton } from '@react-navigation/elements';
import { Text } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const ButtonBase = ({ onPress, children }) => {
  return (
    <HeaderButton
      onPress={onPress}
      style={{
        // prevents ripple cutoff on android
        padding: 8,
      }}
    >
      {children}
    </HeaderButton>
  );
};

const IconButton = ({ iconName, community, onPress, left = true }) => {
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

export default {
  Icon: IconButton,
  Text: TextButton,
};
