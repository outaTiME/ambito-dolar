import React from 'react';
import { Text, Platform } from 'react-native';

import { Separator } from './CardView';
import ContentView from './ContentView';
import FlatList from './FlatList';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const HeaderComponent = ({ ListHeaderComponent, title }) => {
  const { theme, fonts } = Helper.useTheme();
  const contents = title ? (
    <ContentView
      contentContainerStyle={{
        padding: Settings.PADDING,
        marginBottom: 0,
        marginHorizontal: Settings.CARD_PADDING * 2,
        justifyContent: 'flex-end',
      }}
    >
      <Text
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            textTransform: 'uppercase',
          },
        ]}
      >
        {title}
      </Text>
    </ContentView>
  ) : (
    <ContentView />
  );
  return (
    <>
      {ListHeaderComponent}
      {contents}
    </>
  );
};

const FooterComponent = ({ ListFooterComponent, note }) => {
  const { theme, fonts } = Helper.useTheme();
  const contents = note ? (
    <ContentView
      contentContainerStyle={{
        padding: Settings.PADDING,
        marginTop: 0,
        marginHorizontal: Settings.CARD_PADDING * 2,
        justifyContent: 'flex-start',
      }}
    >
      <Text
        style={[
          fonts.footnote,
          {
            color: Settings.getGrayColor(theme),
          },
        ]}
      >
        {note}
      </Text>
    </ContentView>
  ) : (
    <ContentView />
  );
  return (
    <>
      {contents}
      {ListFooterComponent}
    </>
  );
};

const FixedFlatList = ({
  title,
  data,
  itemHeight,
  headerHeight,
  tabBarHeight,
  note,
  ListHeaderComponent,
  ListFooterComponent,
  isModal,
  ...extra
}) => {
  const { theme } = Helper.useTheme();
  const renderItem = React.useCallback(
    ({ item: { component }, index, drag, isActive, getIndex, onStartDrag }) => {
      index = index ?? getIndex();
      return (
        <ContentView
          contentContainerStyle={[
            {
              backgroundColor: Settings.getContentColor(theme, false, isModal),
              marginVertical: 0,
              marginHorizontal: Settings.CARD_PADDING * 2,
              // add shadow while dragging
              ...(isActive && {
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 0,
                },
                shadowOpacity: 0.34,
                shadowRadius: 6.27,
                elevation: 10,
              }),
            },
            index === 0 && {
              borderTopLeftRadius: Settings.BORDER_RADIUS,
              borderTopRightRadius: Settings.BORDER_RADIUS,
            },
            index === data.length - 1 && {
              borderBottomLeftRadius: Settings.BORDER_RADIUS,
              borderBottomRightRadius: Settings.BORDER_RADIUS,
            },
          ]}
        >
          {React.isValidElement(component)
            ? component
            : component({
                index,
                drag: drag ?? onStartDrag,
                isActive,
                isModal,
              })}
        </ContentView>
      );
    },
    [theme, data, isModal],
  );
  const separatorComponent = React.useCallback(
    () => (
      <ContentView
        contentContainerStyle={{
          backgroundColor: Settings.getContentColor(theme, false, isModal),
          marginVertical: 0,
          marginHorizontal: Settings.CARD_PADDING * 2,
        }}
      >
        <Separator isModal={isModal} />
      </ContentView>
    ),
    [theme, isModal],
  );
  const headerComponent = React.useCallback(
    () => <HeaderComponent {...{ ListHeaderComponent, title }} />,
    [ListHeaderComponent, title],
  );
  const footerComponent = React.useCallback(
    () => <FooterComponent {...{ ListFooterComponent, note }} />,
    [ListFooterComponent, note],
  );
  const extraData = React.useMemo(() => Date.now(), [theme, data]);
  return (
    <FlatList
      // automaticallyAdjustContentInsets={false}
      scrollIndicatorInsets={{
        top: headerHeight,
        bottom: tabBarHeight,
      }}
      automaticallyAdjustsScrollIndicatorInsets={false}
      contentContainerStyle={{
        // required when translucent bars
        ...(Platform.OS === 'ios' && {
          paddingTop: headerHeight,
          paddingBottom: tabBarHeight,
        }),
      }}
      // contentInsetAdjustmentBehavior="automatic"
      {...{ data }}
      renderItem={renderItem}
      ItemSeparatorComponent={separatorComponent}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      estimatedItemSize={itemHeight}
      extraData={extraData}
      {...extra}
    />
  );
};

export default FixedFlatList;
