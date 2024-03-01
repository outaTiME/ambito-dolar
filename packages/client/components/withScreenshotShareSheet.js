import { connectActionSheet } from '@expo/react-native-action-sheet';
import { useTheme } from '@react-navigation/native';
import { compose } from '@reduxjs/toolkit';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import React from 'react';
import {
  StyleSheet,
  Keyboard,
  View,
  Text,
  Image,
  findNodeHandle,
  // ActionSheetIOS,
  // Platform,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSelector, useDispatch } from 'react-redux';

import AppIconView from './AppIconView';
import DividerView from './DividerView';
import FixedScrollView from './FixedScrollView';
import { MaterialHeaderButtons, Item } from './HeaderButtons';
import SocialView from './SocialView';
import WatermarkOverlayView from './WatermarkOverlayView';
import * as actions from '../actions';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Amplitude from '../utilities/Amplitude';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const withScreenshotShareSheet =
  ({ actions: action_opts, handleContentChangeSize } = {}) =>
  (Component) =>
  (props) => {
    const {
      navigation,
      showActionSheetWithOptions,
      backgroundColor,
      headerHeight,
      tabBarheight,
      rateTypes,
    } = props;
    const { theme, fonts } = Helper.useTheme();
    const shareViewContainerRef = React.useRef();
    const [capturedImage, setCapturedImage] = React.useState(null);
    const updatedAt = useSelector((state) => state.rates.updated_at);
    const shareViewGeneratedContainerRef = React.useRef();
    const [sharingAvailable] = Helper.useSharedState('sharingAvailable');
    const anchorRef = React.useRef();
    React.useLayoutEffect(() => {
      navigation.setOptions({
        headerRight:
          rateTypes.length > 0 &&
          ((sharingAvailable && Settings.IS_HANDSET) || action_opts?.length > 0)
            ? () => (
                <MaterialHeaderButtons>
                  <View ref={anchorRef}>
                    <Item
                      title="more"
                      iconName="more-horiz"
                      onPress={() => {
                        Keyboard.dismiss();
                        // required by ConvertionScreen when the TextInput has focus
                        setTimeout(() => {
                          const share_opt = I18n.t('share');
                          const crash_opt = 'Forzar crash';
                          const action_sheet_opts = [].concat(
                            action_opts || [],
                          );
                          if (sharingAvailable && Settings.IS_HANDSET) {
                            action_sheet_opts.push(share_opt);
                          }
                          const options = [
                            ...action_sheet_opts,
                            I18n.t('cancel'),
                          ];
                          const cancelButtonIndex = options.length - 1;
                          showActionSheetWithOptions(
                            {
                              options,
                              cancelButtonIndex,
                              // ios
                              anchor: findNodeHandle(anchorRef.current),
                              userInterfaceStyle: theme,
                              // android / web
                              textStyle: {
                                color: Settings.getForegroundColor(theme),
                              },
                              containerStyle: {
                                backgroundColor:
                                  Settings.getContentColor(theme),
                              },
                              separatorStyle: {
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: Settings.getStrokeColor(theme),
                              },
                            },
                            (button_index) => {
                              const button_name =
                                action_sheet_opts[button_index];
                              if (button_name === I18n.t('edit')) {
                                navigation.navigate('Modals', {
                                  screen: 'CustomizeRates',
                                  params: {
                                    modal: true,
                                  },
                                  // https://reactnavigation.org/docs/nesting-navigators/#rendering-initial-route-defined-in-the-navigator
                                  // initial: false,
                                });
                                /*
                            navigation.navigate('CustomizeRates', {
                              modal: true,
                            }); */
                                /* navigation.navigate('SettingsTab', {
                              screen: 'CustomizeRates',
                              // https://reactnavigation.org/docs/nesting-navigators/#rendering-initial-route-defined-in-the-navigator
                              initial: false,
                            }); */
                              } else if (button_name === share_opt) {
                                Amplitude.track('Share rates');
                                captureRef(shareViewContainerRef.current, {
                                  result: 'data-uri',
                                }).then(
                                  (uri) => {
                                    // Remove line breaks to prevent image component fails on Expo48
                                    // https://github.com/facebook/react-native/issues/36512
                                    uri = uri.replace(/[\r\n]+/gm, '');
                                    Image.getSize(uri, (width, height) => {
                                      setCapturedImage({
                                        uri,
                                        width: Settings.DEVICE_WIDTH,
                                        // resize according to device width
                                        height:
                                          (Settings.DEVICE_WIDTH * height) /
                                          width,
                                      });
                                    });
                                  },
                                  (error) =>
                                    console.error(
                                      'Unable to generate view snapshot',
                                      error,
                                    ),
                                );
                              } else if (button_name === crash_opt) {
                                throw new Error('Force application crash');
                              }
                            },
                          );
                        });
                      }}
                    />
                  </View>
                </MaterialHeaderButtons>
              )
            : undefined,
      });
    }, [navigation, rateTypes, sharingAvailable, theme]);
    const dispatch = useDispatch();
    // screen capture customization
    const [appIconLoaded, setAppIconLoaded] = React.useState(false);
    const [capturedImageLoaded, setCapturedImageLoaded] = React.useState(false);
    const screenCaptured =
      capturedImage && appIconLoaded && capturedImageLoaded;
    React.useEffect(() => {
      if (screenCaptured) {
        captureRef(shareViewGeneratedContainerRef.current, {
          // opts
        })
          .then(
            async (uri) => {
              const { uri: new_uri } = await ImageManipulator.manipulateAsync(
                uri,
                [
                  // ignore
                ],
                { compress: 1, format: ImageManipulator.SaveFormat.PNG },
              );
              if (__DEV__) {
                console.log('Snapshot for sharing', new_uri);
              }
              /* if (Settings.IS_IPAD) {
              ActionSheetIOS.showShareActionSheetWithOptions(
                {
                  url: new_uri,
                  anchor: findNodeHandle(anchorRef.current),
                },
                () => {
                  // failure
                },
                (success, shareMethod) => {
                  if (success) {
                    dispatch(actions.registerApplicationShareRates());
                  }
                }
              );
            } */
              // https://github.com/expo/expo/issues/6920#issuecomment-580966657
              Sharing.shareAsync(new_uri, {
                // pass
              })
                .then(() => {
                  dispatch(actions.registerApplicationShareRates());
                })
                .catch(console.warn);
            },
            (error) =>
              console.error(
                'Unable to generate the snapshot for sharing',
                error,
              ),
          )
          .finally(() => {
            // reset
            setCapturedImage(null);
            setAppIconLoaded(false);
            setCapturedImageLoaded(false);
          });
      }
    }, [screenCaptured]);
    const { colors } = useTheme();
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
              <View
                style={[
                  {
                    flex: 1,
                    padding: Settings.CARD_PADDING * 2,
                    backgroundColor: colors.card,
                  },
                  {
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      fonts.title,
                      {
                        // pass
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {
                      Helper.getNavigationContainerRef().getCurrentOptions()
                        .title
                    }
                  </Text>
                  <Text
                    style={[
                      fonts.subhead,
                      {
                        color: Settings.getGrayColor(theme),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {DateUtils.humanize(updatedAt, 2)}
                  </Text>
                </View>
                <AppIconView half onLoadEnd={() => setAppIconLoaded(true)} />
              </View>
              <DividerView />
              <Image
                source={{
                  uri: capturedImage.uri,
                }}
                style={{
                  width: capturedImage.width,
                  height: capturedImage.height,
                }}
                fadeDuration={0}
                onLoadEnd={() => setCapturedImageLoaded(true)}
              />
              <DividerView />
              <View
                style={[
                  {
                    // footnote lineHeight diff
                    paddingVertical: Settings.CARD_PADDING * 2 - (18 - 13),
                    // paddingVertical: Settings.CARD_PADDING,
                    paddingHorizontal: Settings.CARD_PADDING * 2,
                    backgroundColor: colors.card,
                  },
                  {
                    borderColor: 'red',
                    // borderWidth: 1,
                  },
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Text
                  style={[
                    fonts.footnote,
                    {
                      flex: 1,
                      color: Settings.getGrayColor(theme),
                      marginRight: Settings.PADDING,
                    },
                    {
                      borderColor: 'blue',
                      // borderWidth: 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {Settings.APP_COPYRIGHT}
                </Text>
                <View
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                    {
                      borderColor: 'red',
                      // borderWidth: 1,
                    },
                  ]}
                >
                  {/* same size as `fonts.footnote` of copyright */}
                  <SocialView size={13} />
                </View>
              </View>
              <WatermarkOverlayView />
            </View>
          </View>
        )}
        <FixedScrollView
          {...{
            // required for better view shot (same as parent)
            backgroundColor,
            contentContainerRef: shareViewContainerRef,
            headerHeight,
            tabBarheight,
            // containerRef: scrollViewRef,
            handleContentChangeSize,
          }}
        >
          <Component {...props} />
        </FixedScrollView>
      </>
    );
  };

export default (opts) =>
  compose(connectActionSheet, withScreenshotShareSheet(opts));

// export default compose(connectActionSheet, withScreenshotShareSheet);
