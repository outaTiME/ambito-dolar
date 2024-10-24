import React from 'react';
import { Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import CardItemView from './CardItemView';
import CardView from './CardView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style, text, onDoubleTap }) => {
  const { theme, fonts } = Helper.useTheme();
  const onDoubleTapGesture = React.useMemo(
    () =>
      Gesture.Tap()
        .enabled(!!onDoubleTap)
        .runOnJS(true)
        .numberOfTaps(2)
        .onEnd(() => {
          onDoubleTap && onDoubleTap();
        }),
    [onDoubleTap],
  );
  return (
    <CardView
      {...{
        plain: true,
        transparent: true,
        style,
      }}
    >
      <CardItemView
        title={
          <GestureDetector gesture={onDoubleTapGesture}>
            <Text
              style={[
                fonts.subhead,
                {
                  color: Settings.getGrayColor(theme),
                  textAlign: 'center',
                },
                {
                  // extend tap area as if it were a hitSlop
                  padding: Settings.PADDING / 2,
                  margin: -(Settings.PADDING / 2),
                  // include the difference between fontSize and lineHeight
                  paddingVertical: Settings.PADDING / 2 - 5 / 2,
                  marginVertical: -(Settings.PADDING / 2 - 5 / 2),
                },
              ]}
              suppressHighlighting
            >
              {text}
            </Text>
          </GestureDetector>
        }
        titleContainerStyle={{
          justifyContent: 'center',
        }}
        useSwitch={false}
        chevron={false}
      />
    </CardView>
  );
};
