import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export const Separator = ({
  full = false,
  style,
  soft = false,
  isModal = false,
}) => {
  const { theme } = Helper.useTheme();
  return (
    <View
      style={[
        full === false && { marginLeft: Settings.PADDING },
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: Settings.getStrokeColor(theme, soft, isModal),
        },
        style,
      ]}
    />
  );
};

export default ({
  style,
  containerStyle,
  onPress,
  title,
  note,
  children,
  plain,
  separatorStyle,
  transparent,
  isModal,
}) => {
  const { theme, fonts } = Helper.useTheme();
  const row_items = React.useMemo(
    () =>
      React.Children.toArray(children)
        // exclude null
        .filter((child) => child !== null)
        // add separator for each item
        .map((child, index, array) => {
          return [
            child,
            index !== array.length - 1 && (
              <Separator
                key={`sep-${index}`}
                style={separatorStyle}
                isModal={isModal}
              />
            ),
          ];
        }),
    [children, isModal],
  );
  return (
    <View
      style={[
        {
          margin: Settings.CARD_PADDING,
        },
        style,
      ]}
    >
      {title && (
        <View
          style={[
            {
              padding: Settings.PADDING,
              marginTop: -Settings.CARD_PADDING,
            },
          ]}
        >
          <Text
            style={[
              fonts.subhead,
              {
                color: Settings.getGrayColor(theme),
                textTransform: 'uppercase',
              },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
      <View
        style={[
          {
            borderRadius: Settings.BORDER_RADIUS,
            ...(transparent !== true && {
              backgroundColor: Settings.getContentColor(theme, false, isModal),
            }),
            // flexGrow required when customization on CardItemView
            [Platform.OS === 'web' ? 'flex' : 'flexGrow']: 1,
            overflow: 'hidden',
          },
        ]}
      >
        {onPress ? (
          <RectButton
            style={[
              styles.container,
              plain && styles.container_plain,
              containerStyle,
            ]}
            onPress={onPress}
            activeOpacity={1}
            underlayColor={Settings.getStrokeColor(theme, true)}
          >
            <>{row_items}</>
          </RectButton>
        ) : (
          <View
            style={[
              styles.container,
              plain && styles.container_plain,
              containerStyle,
            ]}
          >
            {row_items}
          </View>
        )}
      </View>
      {note && (
        <View
          style={[
            {
              padding: Settings.PADDING,
              marginBottom: -Settings.CARD_PADDING,
            },
          ]}
        >
          <Text
            style={[
              fonts.footnote,
              {
                color: Settings.getGrayColor(theme),
              },
            ]}
          >
            {note}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Settings.PADDING,
    justifyContent: 'space-around',
  },
  container_plain: {
    padding: 0,
  },
});
