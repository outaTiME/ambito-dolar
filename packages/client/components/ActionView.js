import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialIcons';
import { View, ActivityIndicator } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({
  community = false,
  iconName,
  loading,
  color,
  style,
  isModal,
}) => {
  const { theme } = Helper.useTheme();
  const Icon = community === true ? MaterialCommunityIcons : MaterialIcons;
  color = color ?? Settings.getStrokeColor(theme, false, isModal);
  return (
    <View
      style={[
        {
          marginLeft: Settings.PADDING,
          height: Settings.ICON_SIZE,
          width: Settings.ICON_SIZE,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        {
          // borderColor: 'red',
          // borderWidth: 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator animating color={color} size="small" />
      ) : (
        <Icon name={iconName} size={Settings.ICON_SIZE} color={color} />
      )}
    </View>
  );
};
