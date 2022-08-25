import React from 'react';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';
import { Separator } from './CardView';
import ContentView from './ContentView';
import FlatList from './FlatList';

const HeaderComponent = ({ title }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
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
  );
};

const FooterComponent = () => <ContentView />;

const FixedFlatList = ({
  title,
  data,
  itemHeight,
  headerHeight,
  tabBarheight,
  containerRef,
  ...extra
}) => {
  const { theme } = Helper.useTheme();
  const insets = useSafeAreaInsets();
  const renderItem = React.useCallback(
    ({ item, index }) => (
      <ContentView
        contentContainerStyle={[
          {
            backgroundColor: Settings.getContentColor(theme),
            marginVertical: 0,
            marginHorizontal: Settings.CARD_PADDING * 2,
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
        {item.component}
      </ContentView>
    ),
    [theme, data]
  );
  const separatorComponent = React.useCallback(
    () => (
      <ContentView
        contentContainerStyle={{
          backgroundColor: Settings.getContentColor(theme),
          marginVertical: 0,
          marginHorizontal: Settings.CARD_PADDING * 2,
        }}
      >
        <Separator />
      </ContentView>
    ),
    [theme]
  );
  const headerComponent = React.useCallback(
    () => <HeaderComponent {...{ title }} />,
    [title]
  );
  const footerComponent = React.useCallback(() => <FooterComponent />, []);
  const extraData = React.useMemo(() => Date.now(), [theme, data]);
  return (
    <FlatList
      scrollIndicatorInsets={{
        // top: headerHeight - insets.top,
        bottom: tabBarheight - insets.bottom,
      }}
      contentContainerStyle={{
        // required when translucent bars
        ...(Platform.OS === 'ios' && {
          paddingTop: headerHeight,
          paddingBottom: tabBarheight,
        }),
      }}
      {...{ data }}
      renderItem={renderItem}
      ItemSeparatorComponent={separatorComponent}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      containerRef={containerRef}
      estimatedItemSize={itemHeight}
      extraData={extraData}
      {...extra}
    />
  );
};

export default FixedFlatList;
