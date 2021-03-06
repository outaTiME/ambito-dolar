import { MaterialIcons } from '@expo/vector-icons';
import * as React from 'react';
import { View, Text, Switch } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { RectButton } from 'react-native-gesture-handler';

import { Separator } from '../components/CardView';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const ChevronView = () => {
  const { theme } = Helper.useTheme();
  return (
    <MaterialIcons
      name="chevron-right"
      size={Settings.ICON_SIZE}
      color={Settings.getStrokeColor(theme)}
      style={{
        marginLeft: Settings.PADDING,
        height: Settings.ICON_SIZE,
      }}
    />
  );
};

export default ({
  title,
  titleDetail,
  value,
  onValueChange,
  customization = false,
  onAction,
  useSwitch = true,
  selectable = false,
  chevron = true,
  ActionIndicator = <ChevronView />,
  ...extra
}) => {
  const { theme, fonts } = Helper.useTheme();
  const CardContainer = useSwitch !== true && !!onAction ? RectButton : View;
  return (
    <>
      <CardContainer
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Settings.PADDING,
          },
          extra.containerStyle,
        ]}
        onPress={onAction}
        activeOpacity={1}
        underlayColor={Settings.getStrokeColor(theme, true)}
      >
        <>
          <View
            style={[
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Settings.PADDING,
              },
              extra.titleContainerStyle,
            ]}
          >
            {React.isValidElement(title) ? (
              title
            ) : (
              <View
                style={[
                  {
                    marginRight: Settings.PADDING,
                    flexShrink: 0,
                    flexGrow: 1,
                  },
                ]}
              >
                <Text style={[fonts.body, extra.titleStyle]} numberOfLines={1}>
                  {title}
                </Text>
                {titleDetail && (
                  <Text
                    style={[
                      fonts.footnote,
                      {
                        color: Settings.getGrayColor(theme),
                        marginTop: 2,
                      },
                      extra.titleDetailStyle,
                    ]}
                    numberOfLines={1}
                  >
                    {titleDetail}
                  </Text>
                )}
              </View>
            )}
            {value &&
              (React.isValidElement(value) ? (
                value
              ) : (
                <Text
                  style={[
                    fonts.body,
                    {
                      color: Settings.getGrayColor(theme),
                      textAlign: 'right',
                      flexShrink: 1,
                      flexGrow: 0,
                    },
                    extra.valueStyle,
                  ]}
                  numberOfLines={1}
                  selectable={selectable}
                >
                  {value}
                </Text>
              ))}
          </View>
          {useSwitch && (
            <Switch value={value === true} onValueChange={onValueChange} />
          )}
          {!useSwitch && onAction && chevron && ActionIndicator}
        </>
      </CardContainer>
      {customization === true && (
        <Collapsible
          duration={Settings.ANIMATION_DURATION}
          collapsed={value !== true}
        >
          <Separator />
          <RectButton
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: Settings.PADDING,
              },
            ]}
            onPress={onAction}
            activeOpacity={1}
            underlayColor={Settings.getStrokeColor(theme, true)}
          >
            <>
              <View
                style={[
                  {
                    paddingVertical: Settings.PADDING,
                    marginRight: Settings.PADDING,
                    flexShrink: 0,
                    flexGrow: 1,
                  },
                ]}
              >
                <Text style={fonts.body} numberOfLines={1}>
                  {I18n.t('customize')}
                </Text>
              </View>
              <ChevronView />
            </>
          </RectButton>
        </Collapsible>
      )}
    </>
  );
};
