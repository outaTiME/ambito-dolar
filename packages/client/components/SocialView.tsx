import FontAwesome6 from '@expo/vector-icons/build/vendor/react-native-vector-icons/FontAwesome6';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default ({
  // same size as "fonts.body" of FundingView
  size = Settings.SOCIAL_ICON_SIZE,
  extraSpace = false,
  condensed = false,
}) => {
  const { theme } = Helper.useTheme();
  const grayColor = (Settings as any).getGrayColor(theme);
  if (condensed === true) {
    // same size as "fonts.subhead" of FundingView
    size = 15;
  }
  return (
    <>
      <FontAwesome6
        name="x-twitter"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="telegram"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="instagram"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="facebook"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="reddit-alien"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="mastodon"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      {false && (
        <FontAwesome6
          name="whatsapp"
          size={size}
          color={grayColor}
          style={{
            marginRight: size,
          }}
        />
      )}
      <FontAwesome6
        name="bluesky"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="threads"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="github"
        size={size}
        color={grayColor}
        style={{
          ...(extraSpace === true && {
            marginRight: size,
          }),
        }}
      />
    </>
  );
};
