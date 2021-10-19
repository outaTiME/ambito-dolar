import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, Switch } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { RectButton } from 'react-native-gesture-handler';

import { Separator } from '../components/CardView';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const ActionView = ({ iconName, color }) => {
  const { theme } = Helper.useTheme();
  return (
    <MaterialIcons
      name={iconName}
      size={Settings.ICON_SIZE}
      color={color ?? Settings.getStrokeColor(theme)}
      style={{
        marginLeft: Settings.PADDING,
        height: Settings.ICON_SIZE,
      }}
    />
  );
};

const ChevronActionView = () => {
  return <ActionView iconName="chevron-right" />;
};

const CheckActionView = () => {
  const { theme } = Helper.useTheme();
  return (
    <ActionView iconName="check" color={Settings.getForegroundColor(theme)} />
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
  check = false,
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
                        marginTop: Settings.SMALL_PADDING,
                      },
                      extra.titleDetailStyle,
                    ]}
                    // numberOfLines={1}
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
          {!useSwitch &&
            onAction &&
            (chevron || check) &&
            (chevron ? <ChevronActionView /> : <CheckActionView />)}
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
              <ChevronActionView />
            </>
          </RectButton>
        </Collapsible>
      )}
    </>
  );
};
