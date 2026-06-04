// @ts-nocheck
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImageManipulator from 'expo-image-manipulator';
import { Stack, useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import {
  findNodeHandle,
  Keyboard,
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import AppIconView from '@/components/AppIconView';
import DividerView from '@/components/DividerView';
import FixedScrollView from '@/components/FixedScrollView';
import HeaderButton from '@/components/HeaderButton';
import SocialView from '@/components/SocialView';
import WatermarkOverlayView from '@/components/WatermarkOverlayView';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';
import { goToCustomizeRatesModal } from '@/utilities/Navigation';

const withScreenshotShareSheet =
  ({ actions: action_opts } = {}) =>
  (Component) =>
  (props) => {
    const { backgroundColor, rateTypes } = props;
    const navigation = useNavigation();
    const { theme, fonts } = Helper.useTheme();
    const safeAreaInsets = useSafeAreaInsets();
    const { showActionSheetWithOptions } = useActionSheet();
    const anchorRef = React.useRef();
    const shareViewContainerRef = React.useRef();
    const [capturedImage, setCapturedImage] = React.useState(null);
    const updatedAt = useSelector((state) => state.rates.updated_at);
    const shareViewGeneratedContainerRef = React.useRef();
    const [sharingAvailable] = Helper.useSharedState('sharingAvailable');
    const share_opt = I18n.t('share');
    const handleMenuSelection = React.useCallback(
      (button_name) => {
        if (button_name === I18n.t('edit')) {
          goToCustomizeRatesModal();
        } else if (button_name === share_opt) {
          captureRef(shareViewContainerRef.current, {
            result: 'data-uri',
          }).then(
            (uri) => {
              Image.getSize(uri, (width, height) => {
                setCapturedImage({
                  uri,
                  width: Settings.DEVICE_WIDTH,
                  // resize according to device width
                  height: (Settings.DEVICE_WIDTH * height) / width,
                });
              });
            },
            (error) => {
              console.error('Unable to generate view snapshot', error);
            },
          );
        } else if (__DEV__ && button_name === 'Forzar crash') {
          throw new Error('Force application crash');
        }
      },
      [share_opt],
    );
    const action_sheet_opts = React.useMemo(() => {
      const opts = [].concat(action_opts ?? []);
      if (sharingAvailable && Settings.IS_HANDSET) {
        opts.push(share_opt);
      }
      return opts;
    }, [action_opts, sharingAvailable, share_opt]);
    const sfSymbolFor = (opt) => {
      if (opt === I18n.t('edit')) {
        return 'pencil';
      }
      if (opt === share_opt) {
        return 'square.and.arrow.up';
      }
      return undefined;
    };
    // iPad pre-iOS 26 crashes presenting UIAlertController.actionSheet via
    // ExpoScreenOrientation.ScreenOrientationViewController (missing popover anchor);
    // gate the header button until LG native toolbar path is available.
    const supportsActionSheet = Settings.IS_HANDSET || Settings.IS_LIQUID_GLASS;
    const shouldShow =
      rateTypes.length > 0 &&
      supportsActionSheet &&
      ((sharingAvailable && Settings.IS_HANDSET) || action_opts?.length > 0);
    // non-Liquid-Glass: custom HeaderButton.Icon + cross-platform action sheet
    const useNativeToolbar = Settings.IS_LIQUID_GLASS;
    React.useLayoutEffect(() => {
      if (useNativeToolbar) {
        return;
      }
      if (!shouldShow) {
        navigation.setOptions({ headerRight: undefined });
        return;
      }
      navigation.setOptions({
        headerRight: () => (
          <View ref={anchorRef}>
            <HeaderButton.Icon
              iconName="more-horiz"
              onPress={() => {
                Keyboard.dismiss();
                // required by ConversionScreen when the TextInput has focus
                setTimeout(() => {
                  const options = [...action_sheet_opts, I18n.t('cancel')];
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
                        backgroundColor: Settings.getContentColor(theme),
                        paddingBottom: safeAreaInsets.bottom,
                      },
                      separatorStyle: {
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: Settings.getStrokeColor(theme),
                      },
                    },
                    (selectedIndex) => {
                      if (selectedIndex === cancelButtonIndex) {
                        return;
                      }
                      handleMenuSelection(action_sheet_opts[selectedIndex]);
                    },
                  );
                });
              }}
            />
          </View>
        ),
      });
    }, [
      useNativeToolbar,
      shouldShow,
      action_sheet_opts,
      handleMenuSelection,
      navigation,
      showActionSheetWithOptions,
      theme,
      safeAreaInsets.bottom,
    ]);
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
              Helper.debug('Snapshot for sharing', new_uri);
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
    }, [screenCaptured, dispatch]);
    const shareTitle =
      navigation?.getCurrentOptions?.()?.title || Settings.APP_NAME;
    return (
      <>
        {shouldShow && useNativeToolbar && (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu icon="ellipsis">
              {action_sheet_opts.map((opt) => {
                const symbolName = sfSymbolFor(opt);
                return (
                  <Stack.Toolbar.MenuAction
                    key={opt}
                    {...(symbolName && { icon: symbolName })}
                    onPress={() => handleMenuSelection(opt)}
                  >
                    {opt}
                  </Stack.Toolbar.MenuAction>
                );
              })}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar>
        )}
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
              collapsable={false}
            >
              <View
                style={[
                  {
                    flex: 1,
                    padding: Settings.CARD_PADDING * 2,
                    backgroundColor: Settings.getContentColor(theme),
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
                    {shareTitle}
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
                  ...(Settings.CONTENT_TOP_SHRINK_STYLE && {
                    marginTop:
                      Settings.CONTENT_MARGIN -
                      Settings.CONTENT_TOP_SHRINK_STYLE.marginTop,
                  }),
                }}
                fadeDuration={0}
                onLoadEnd={() => setCapturedImageLoaded(true)}
              />
              <DividerView />
              <View
                style={{
                  // `fonts.caption1` lineHeight diff
                  paddingVertical: Settings.CARD_PADDING * 2 - (18 - 12),
                  paddingHorizontal: Settings.CARD_PADDING * 2,
                  backgroundColor: Settings.getContentColor(theme),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    fonts.caption1,
                    {
                      flex: 1,
                      color: Settings.getGrayColor(theme),
                      marginRight: Settings.PADDING,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {Settings.APP_COPYRIGHT}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {/* same size as `fonts.caption1` of copyright */}
                  <SocialView size={12} />
                </View>
              </View>
              <WatermarkOverlayView />
            </View>
          </View>
        )}
        <FixedScrollView
          backgroundColor={backgroundColor}
          contentContainerRef={shareViewContainerRef}
        >
          <Component {...props} />
        </FixedScrollView>
      </>
    );
  };

export default (opts) => withScreenshotShareSheet(opts);
