import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default ({
  // same size as "fonts.body" of FundingView
  size = Settings.SOCIAL_ICON_SIZE,
  extraSpace = false,
  compact = null,
}) => {
  const { theme } = Helper.useTheme();
  const grayColor = Settings.getGrayColor(theme);
  if (compact != null) {
    // same size as "fonts.subhead" of FundingView
    size = 15;
  }
  return (
    <>
      <FontAwesome6
        iconStyle="brand"
        name="x-twitter"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
        name="telegram"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
        name="instagram"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
        name="facebook"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
        name="reddit-alien"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
        name="mastodon"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      {false && (
        <FontAwesome6
          iconStyle="brand"
          name="whatsapp"
          size={size}
          color={grayColor}
          style={{
            marginRight: size,
          }}
        />
      )}
      <FontAwesome6
        iconStyle="brand"
        name="bluesky"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
        name="threads"
        size={size}
        color={grayColor}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        iconStyle="brand"
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
