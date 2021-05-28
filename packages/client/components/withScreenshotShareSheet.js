import { connectActionSheet } from '@expo/react-native-action-sheet';
import * as Amplitude from 'expo-analytics-amplitude';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as React from 'react';
import { StyleSheet, Keyboard } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { compose } from 'redux';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';
import { MaterialHeaderButtons, Item } from './HeaderButtons';
import ScrollView from './ScrollView';

const withScreenshotShareSheet = (Component) => (props) => {
  const { navigation, showActionSheetWithOptions, backgroundColor } = props;
  const { theme } = Helper.useTheme();
  const shareViewContainerRef = React.useRef();
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
                      // opts
                    }).then(
                      async (uri) => {
                        const { uri: new_uri } =
                          await ImageManipulator.manipulateAsync(uri);
                        // https://github.com/expo/expo/issues/6920#issuecomment-580966657
                        Sharing.shareAsync(new_uri, {
                          // pass
                        });
                      },
                      (error) =>
                        console.error('Unable to generate snapshot', error)
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
  return (
    <ScrollView
      // required for better view shot (same as parent)
      backgroundColor={backgroundColor}
      contentContainerRef={shareViewContainerRef}
      watermark
    >
      <Component {...props} />
    </ScrollView>
  );
};

/* export default (title) =>
  compose(connectActionSheet, withScreenshotShareSheet(title)); */

export default compose(connectActionSheet, withScreenshotShareSheet);
