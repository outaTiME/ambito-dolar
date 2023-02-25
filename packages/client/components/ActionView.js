import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ community = false, iconName, color, style, isModal }) => {
  const { theme } = Helper.useTheme();
  const Icon = community === true ? MaterialCommunityIcons : MaterialIcons;
  return (
    <Icon
      name={iconName}
      size={Settings.ICON_SIZE}
      color={color ?? Settings.getStrokeColor(theme, false, isModal)}
      // color={color ?? Settings.getGrayColor(theme)}
      style={[
        {
          marginLeft: Settings.PADDING,
          height: Settings.ICON_SIZE,
        },
        style,
      ]}
    />
  );
};
