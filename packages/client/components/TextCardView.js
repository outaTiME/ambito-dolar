import React from 'react';
import { Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import CardItemView from './CardItemView';
import CardView from './CardView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style, text, onDoubleTap, onLongPress }) => {
  const { theme, fonts } = Helper.useTheme();
  const gesture = React.useMemo(() => {
    const gestures = [];
    if (onDoubleTap) {
      gestures.push(
        Gesture.Tap()
          .numberOfTaps(2)
          .runOnJS(true)
          .onEnd(() => onDoubleTap()),
      );
    }
    if (onLongPress) {
      gestures.push(
        Gesture.LongPress()
          .minDuration(1500)
          .runOnJS(true)
          .onStart(() => onLongPress()),
      );
    }
    if (gestures.length > 0) {
      return Gesture.Exclusive(...gestures);
    }
  }, [onDoubleTap, onLongPress]);
  const content = React.useMemo(() => {
    const textComponent = (
      <Text
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            textAlign: 'center',
            padding: Settings.PADDING / 2,
            margin: -(Settings.PADDING / 2),
            paddingVertical: Settings.PADDING / 2 - 5 / 2,
            marginVertical: -(Settings.PADDING / 2 - 5 / 2),
          },
        ]}
        suppressHighlighting
      >
        {text}
      </Text>
    );
    return gesture ? (
      <GestureDetector gesture={gesture}>{textComponent}</GestureDetector>
    ) : (
      textComponent
    );
  }, [gesture, text, fonts.subhead, theme]);
  return (
    <CardView plain transparent style={style}>
      <CardItemView
        title={content}
        titleContainerStyle={{ justifyContent: 'center' }}
        useSwitch={false}
        chevron={false}
      />
    </CardView>
  );
};
