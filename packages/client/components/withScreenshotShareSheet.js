import { connectActionSheet } from '@expo/react-native-action-sheet';
import * as Amplitude from 'expo-analytics-amplitude';
import { processFontFamily } from 'expo-font';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as React from 'react';
import { StyleSheet, Keyboard, View, Text, Image } from 'react-native';
import Svg, { Defs, Pattern, Rect, Text as SvgText } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { useSelector } from 'react-redux';
import { compose } from 'redux';

import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import { MaterialHeaderButtons, Item } from './HeaderButtons';
import ScrollView from './ScrollView';

const withScreenshotShareSheet = (Component) => (props) => {
  const { navigation, showActionSheetWithOptions, backgroundColor } = props;
  const { theme, fonts } = Helper.useTheme();
  const shareViewContainerRef = React.useRef();
  const [capturedImage, setCapturedImage] = React.useState(null);
  const processed_at = useSelector((state) => state.rates?.processed_at);
  const shareViewGeneratedContainerRef = React.useRef();
  const headerRight = React.useCallback(
    () => (
      <MaterialHeaderButtons>
        <Item
          title="more"
          iconName="more-horiz"
          onPress={() => {
            Keyboard.dismiss();
            // required by ConvertionScreen when the TextInput has focus
            setTimeout(() => {
              const share_opt = 'Compartir';
              const crash_opt = 'Forzar crash';
              const action_sheet_opts = [share_opt];
              const options = [...action_sheet_opts, 'Cancelar'];
              const cancelButtonIndex = options.length - 1;
              showActionSheetWithOptions(
                {
                  options,
                  cancelButtonIndex,
                  containerStyle: {
                    backgroundColor: Settings.getContentColor(theme),
                  },
                  separatorStyle: {
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: Settings.getStrokeColor(theme),
                  },
                  textStyle: {
                    color: Settings.getForegroundColor(theme),
                  },
                },
                (button_index) => {
                  const button_name = action_sheet_opts[button_index];
                  if (button_name === share_opt) {
                    Amplitude.logEventAsync('Share rates');
                    captureRef(shareViewContainerRef.current, {
                      result: 'data-uri',
                    }).then(
                      async (uri) => {
                        Image.getSize(uri, (width, height) => {
                          setCapturedImage({
                            uri,
                            width: Settings.DEVICE_WIDTH,
                            // resize according to device width
                            height: (Settings.DEVICE_WIDTH * height) / width,
                          });
                        });
                      },
                      (error) =>
                        console.error('Unable to generate view snapshot', error)
                    );
                  } else if (button_name === crash_opt) {
                    throw new Error('Force application crash');
                  }
                }
              );
            });
          }}
        />
      </MaterialHeaderButtons>
    ),
    [theme]
  );
  const [isPhoneDevice] = Helper.useSharedState('isPhoneDevice', false);
  React.useEffect(() => {
    isPhoneDevice &&
      Sharing.isAvailableAsync().then(() => {
        navigation.setOptions({
          headerRight,
        });
      });
  }, [isPhoneDevice]);
  const capturedImageLoaded = React.useCallback(() => {
    captureRef(shareViewGeneratedContainerRef.current, {
      // opts
    })
      .then(
        async (uri) => {
          const { uri: new_uri } = await ImageManipulator.manipulateAsync(uri);
          console.log('>>> capturedImageLoaded', new_uri);
          // https://github.com/expo/expo/issues/6920#issuecomment-580966657
          Sharing.shareAsync(new_uri, {
            // pass
          });
        },
        (error) =>
          console.error('Unable to generate the snapshot for sharing', error)
      )
      .finally(() => {
        // clear captured image to fire onLoadEnd next time
        setCapturedImage(null);
      });
  }, []);
  return (
    <>
      {capturedImage && (
        <View
          style={[
            {
              opacity: 0,
              position: 'absolute',
            },
          ]}
        >
          <View
            style={{
              backgroundColor,
            }}
            ref={shareViewGeneratedContainerRef}
          >
            <Image
              source={{
                uri: capturedImage.uri,
              }}
              style={{
                width: capturedImage.width,
                height: capturedImage.height,
              }}
              onLoadEnd={capturedImageLoaded}
            />
            <View
              style={[
                {
                  flexDirection: 'row',
                  marginHorizontal: Settings.CARD_PADDING,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: Settings.CARD_PADDING * 2,
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
                numberOfLines={1}
              >
                {Settings.APP_COPYRIGHT}
                {processed_at &&
                  ` ${Settings.DASH_SEPARATOR} ${DateUtils.datetime(
                    processed_at,
                    { short: true }
                  )}`}
              </Text>
            </View>
            {/* TODO: add svg overlay when react-native-svg fix the patternTransform */}
            {false && (
              <Svg
                style={StyleSheet.absoluteFillObject}
                width="100%"
                height="100%"
              >
                <Defs>
                  <Pattern
                    id="textstripe"
                    patternUnits="userSpaceOnUse"
                    width="225"
                    height="100"
                    // patternTransform="rotate(-45)"
                  >
                    <SvgText
                      y="30"
                      // https://github.com/expo/expo/issues/1959#issuecomment-780198250
                      fontFamily={processFontFamily(
                        Settings.getFontObject().fontFamily
                      )}
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
            )}
          </View>
        </View>
      )}
      <ScrollView
        // required for better view shot (same as parent)
        backgroundColor={backgroundColor}
        contentContainerRef={shareViewContainerRef}
        watermark
      >
        <Component {...props} />
      </ScrollView>
    </>
  );
};

/* export default (title) =>
  compose(connectActionSheet, withScreenshotShareSheet(title)); */

export default compose(connectActionSheet, withScreenshotShareSheet);
