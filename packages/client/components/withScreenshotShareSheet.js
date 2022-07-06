import { connectActionSheet } from '@expo/react-native-action-sheet';
import { compose } from '@reduxjs/toolkit';
import * as Amplitude from 'expo-analytics-amplitude';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { StyleSheet, Keyboard, View, Text, Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '../actions';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import { MaterialHeaderButtons, Item } from './HeaderButtons';
import ScrollView from './ScrollView';
import WatermarkOverlayView from './WatermarkOverlayView';

const withScreenshotShareSheet = (Component) => (props) => {
  const { navigation, showActionSheetWithOptions, backgroundColor } = props;
  const { theme, fonts } = Helper.useTheme();
  const shareViewContainerRef = React.useRef();
  const [capturedImage, setCapturedImage] = React.useState(null);
  const updatedAt = useSelector((state) => state.rates?.updated_at);
  const shareViewGeneratedContainerRef = React.useRef();
  React.useLayoutEffect(() => {
    Settings.IS_HANDSET &&
      Sharing.isAvailableAsync().then(() => {
        navigation.setOptions({
          headerRight: () => (
            <MaterialHeaderButtons>
              <Item
                title="more"
                iconName="more-horiz"
                onPress={() => {
                  Keyboard.dismiss();
                  // required by ConvertionScreen when the TextInput has focus
                  setTimeout(() => {
                    const share_opt = I18n.t('share');
                    const crash_opt = 'Forzar crash';
                    const action_sheet_opts = [share_opt];
                    const options = [...action_sheet_opts, I18n.t('cancel')];
                    const cancelButtonIndex = options.length - 1;
                    showActionSheetWithOptions(
                      {
                        options,
                        cancelButtonIndex,
                        // ios
                        userInterfaceStyle: theme,
                        // android / web
                        textStyle: {
                          color: Settings.getForegroundColor(theme),
                        },
                        containerStyle: {
                          backgroundColor: Settings.getContentColor(theme),
                        },
                        separatorStyle: {
                          height: StyleSheet.hairlineWidth,
                          backgroundColor: Settings.getStrokeColor(theme),
                        },
                      },
                      (button_index) => {
                        const button_name = action_sheet_opts[button_index];
                        if (button_name === share_opt) {
                          Amplitude.logEventAsync('Share rates').catch(
                            console.warn
                          );
                          captureRef(shareViewContainerRef.current, {
                            result: 'data-uri',
                          }).then(
                            (uri) => {
                              Image.getSize(uri, (width, height) => {
                                setCapturedImage({
                                  uri,
                                  width: Settings.DEVICE_WIDTH,
                                  // resize according to device width
                                  height:
                                    (Settings.DEVICE_WIDTH * height) / width,
                                });
                              });
                            },
                            (error) =>
                              console.error(
                                'Unable to generate view snapshot',
                                error
                              )
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
        });
      });
  }, [navigation, theme]);
  const dispatch = useDispatch();
  const capturedImageLoaded = React.useCallback(() => {
    captureRef(shareViewGeneratedContainerRef.current, {
      // opts
    })
      .then(
        async (uri) => {
          const { uri: new_uri } = await ImageManipulator.manipulateAsync(uri);
          if (__DEV__) {
            console.log('Snapshot for sharing', new_uri);
          }
          // https://github.com/expo/expo/issues/6920#issuecomment-580966657
          Sharing.shareAsync(new_uri, {
            // pass
          }).then(() => {
            dispatch(actions.registerApplicationShareRates());
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
  const scrollViewRef = React.useRef(null);
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
                  marginHorizontal: Settings.CARD_PADDING * 2,
                  marginBottom: Settings.CARD_PADDING * 2,
                },
                {
                  borderColor: 'red',
                  // borderWidth: 1,
                },
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: Settings.CARD_PADDING,
                },
              ]}
            >
              <Text
                style={[
                  fonts.subhead,
                  {
                    color: Settings.getGrayColor(theme),
                    // textTransform: 'uppercase',
                    textAlign: 'center',
                  },
                ]}
              >
                {Settings.APP_COPYRIGHT}
                {updatedAt &&
                  ` ${Settings.DASH_SEPARATOR} ${DateUtils.humanize(
                    updatedAt,
                    6
                  )}`}
              </Text>
            </View>
            <WatermarkOverlayView />
          </View>
        </View>
      )}
      <ScrollView
        // required for better view shot (same as parent)
        backgroundColor={backgroundColor}
        contentContainerRef={shareViewContainerRef}
        containerRef={scrollViewRef}
      >
        <Component {...props} scrollViewRef={scrollViewRef} />
      </ScrollView>
    </>
  );
};

/* export default (title) =>
  compose(connectActionSheet, withScreenshotShareSheet(title)); */

export default compose(connectActionSheet, withScreenshotShareSheet);
