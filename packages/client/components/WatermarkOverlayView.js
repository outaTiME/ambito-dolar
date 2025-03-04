import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default () => {
  const { theme } = Helper.useTheme();
  // https://codepen.io/dudleystorey/pen/PqBLjd/
  return (
    <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
      <Defs>
        <Pattern
          id="textstripe"
          patternUnits="userSpaceOnUse"
          width="250"
          height="100"
          // https://github.com/react-native-svg/react-native-svg/issues/1386#issuecomment-852581471
          {...(Platform.OS !== 'ios' && {
            patternTransform: 'rotate(-45)',
          })}
        >
          <SvgText
            // use height without font size
            y="80"
            // https://github.com/expo/expo/issues/1959#issuecomment-780198250
            fontFamily={Settings.getFontObject().fontFamily}
            // same as fonts.title
            fontSize="20"
            opacity="0.1"
            fill={Settings.getGrayColor(theme)}
          >
            {Settings.APP_COPYRIGHT}
          </SvgText>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#textstripe)" />
    </Svg>
  );
};
