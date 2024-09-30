import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { RectButton } from 'react-native-gesture-handler';

import ActionView from './ActionView';
import { Separator } from '../components/CardView';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const ChevronActionView = ({ isModal }) => (
  <ActionView iconName="chevron-right" isModal={isModal} />
);

const CheckActionView = () => {
  const { theme } = Helper.useTheme();
  return (
    <ActionView iconName="check" color={Settings.getForegroundColor(theme)} />
  );
};

const LoadingActionView = () => {
  const { theme } = Helper.useTheme();
  return <ActionView loading color={Settings.getForegroundColor(theme)} />;
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
  drag,
  isActive,
  disableSwitch = false,
  isModal,
  loading = false,
  ...extra
}) => {
  const { theme, fonts } = Helper.useTheme();
  const CardContainer =
    useSwitch !== true && !!onAction && loading === false ? RectButton : View;
  const addSpacer = (onAction && (chevron || check)) || useSwitch || !!value;
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
        underlayColor={Settings.getStrokeColor(theme, true, isModal)}
      >
        <>
          {drag && (
            <TouchableOpacity
              activeOpacity={1}
              onLongPress={drag}
              // delayLongPress={0}
              // delayLongPress={185}
              // half from longPress default
              // delayLongPress={185}
              delayLongPress={Settings.INTERACTION_DELAY}
              // onPressIn={drag}
              // delayPressIn={60}
              disabled={isActive}
              /* style={{
                borderWidth: 1,
                borderColor: 'red',
                padding: Settings.PADDING,
                margin: -Settings.PADDING,
              }} */
              // hitSlop={Settings.SMALL_PADDING}
              // hitSlop={Settings.PADDING}
              /* hitSlop={{
                top: Settings.PADDING,
                left: Settings.PADDING,
                bottom: Settings.PADDING,
                right: Settings.PADDING,
              }} */
              hitSlop={Settings.PADDING}
            >
              <ActionView
                community
                iconName="drag-horizontal-variant"
                // iconName="circle-outline"
                // iconName="check-circle"
                style={{
                  marginLeft: 0,
                }}
                isModal={isModal}
              />
            </TouchableOpacity>
          )}
          <View
            style={[
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                // paddingVertical: Settings.PADDING,
                paddingVertical: Settings.CARD_PADDING + Settings.SMALL_PADDING,
                // gap: Settings.PADDING,
              },
              drag && {
                marginLeft: Settings.PADDING,
              },
              extra.titleContainerStyle,
            ]}
          >
            {React.isValidElement(title) ? (
              title
            ) : (
              <View
                style={[
                  addSpacer && {
                    marginRight: Settings.PADDING,
                  },
                  {
                    // flex: 1,
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
            {!loading &&
              value &&
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
          {loading && <LoadingActionView />}
          {!loading && useSwitch && (
            <Switch
              value={value === true}
              onValueChange={onValueChange}
              disabled={disableSwitch}
            />
          )}
          {!loading &&
            !useSwitch &&
            onAction &&
            (chevron || check) &&
            (chevron ? (
              <ChevronActionView isModal={isModal} />
            ) : (
              <CheckActionView />
            ))}
        </>
      </CardContainer>
      {customization === true && (
        <Collapsible
          duration={Settings.ANIMATION_DURATION}
          collapsed={value !== true}
        >
          <Separator isModal={isModal} />
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
            underlayColor={Settings.getStrokeColor(theme, true, isModal)}
          >
            <>
              <View
                style={[
                  {
                    // paddingVertical: Settings.PADDING,
                    paddingVertical:
                      Settings.CARD_PADDING + Settings.SMALL_PADDING,
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
              <ChevronActionView isModal={isModal} />
            </>
          </RectButton>
        </Collapsible>
      )}
    </>
  );
};
