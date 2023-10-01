import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View, Text, Linking, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
// import { runOnJS } from 'react-native-reanimated';

import AnimatedConfettiView from '../components/AnimatedConfettiView';
import AppIconView from '../components/AppIconView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import IconCardItemView from '../components/IconCardItemView';
import TextCardView from '../components/TextCardView';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

// social links
const TWITTER_DEEP_LINK = 'twitter://user?screen_name=AmbitoDolar';
const TWITTER_WEB_URL = 'https://twitter.com/AmbitoDolar';
const TELEGRAM_DEEP_LINK = 'tg://resolve?domain=AmbitoDolar';
const TELEGRAM_WEB_URL = 'https://telegram.me/AmbitoDolar';
const INSTAGRAM_DEEP_LINK = 'instagram://user?username=ambitodolar';
const INSTAGRAM_WEB_URL = 'https://instagram.com/ambitodolar';
const FACEBOOK_DEEP_LINK = `fb://${
  Platform.OS === 'ios' ? 'page?id=' : 'page/'
}116047123558432`;
const FACEBOOK_WEB_URL = 'https://facebook.com/pg/AmbitoDolar';
const REDDIT_URI = 'www.reddit.com/r/AmbitoDolar';
const REDDIT_DEEP_LINK = `reddit://${REDDIT_URI}`;
const REDDIT_WEB_URL = `https://${REDDIT_URI}`;
const IVORY_DEEP_LINK = `ivory:///user_profile/AmbitoDolar@mastodon.social`;
const MASTODON_URI = 'mastodon.social/@AmbitoDolar';
// https://github.com/mastodon/mastodon-ios/blob/develop/Mastodon/Info.plist#L28
const MASTODON_DEEP_LINK = `mastodon://${MASTODON_URI}`;
const MASTODON_WEB_URL = `https://${MASTODON_URI}`;
const GITHUB_URI = 'github.com/outaTiME/ambito-dolar';
const GITHUB_DEEP_LINK = `github://${GITHUB_URI}`;
const GITHUB_WEB_URL = `https://${GITHUB_URI}`;

const CONFETTI_FALL_SPEED = 50;
const CONFETTI_ITEM_WIDTH = 20;
const CONFETTI_ITEM_HEIGHT = CONFETTI_ITEM_WIDTH / 2;

// https://gist.github.com/imcrainjames/e86893a1d6f85328174d036a9b263dd0#file-confetti-js-L39
const CONFETTI_ANIMATION_DURATION =
  ((Settings.DEVICE_HEIGHT + CONFETTI_ITEM_HEIGHT) /
    (CONFETTI_FALL_SPEED * 3 * 2)) *
  // add max delay
  3 *
  1000;

const AboutScreen = ({ headerHeight, tabBarheight, navigation }) => {
  const { theme, fonts } = Helper.useTheme();
  const [makeItRain, setMakeItRain] = React.useState(false);
  const tap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      // FIXME: create new confetti component
      // runOnJS(setMakeItRain)(true);
    });
  React.useEffect(() => {
    if (makeItRain) {
      const timer_id = setTimeout(() => {
        setMakeItRain(false);
      }, CONFETTI_ANIMATION_DURATION);
      return () => clearTimeout(timer_id);
    }
  }, [makeItRain]);
  const onPressWebsite = React.useCallback(() => {
    Linking.openURL(Settings.WEBSITE_URL).catch(console.warn);
  }, []);
  const onPressTwitter = React.useCallback(() => {
    Linking.canOpenURL(TWITTER_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(TWITTER_DEEP_LINK)
          : Linking.openURL(TWITTER_WEB_URL),
      )
      .catch(console.warn);
  }, []);
  const onPressTelegram = React.useCallback(() => {
    Linking.canOpenURL(TELEGRAM_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(TELEGRAM_DEEP_LINK)
          : Linking.openURL(TELEGRAM_WEB_URL),
      )
      .catch(console.warn);
  }, []);
  const onPressInstagram = React.useCallback(() => {
    Linking.canOpenURL(INSTAGRAM_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(INSTAGRAM_DEEP_LINK)
          : Linking.openURL(INSTAGRAM_WEB_URL),
      )
      .catch(console.warn);
  }, []);
  const onPressFacebook = React.useCallback(() => {
    Linking.canOpenURL(FACEBOOK_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(FACEBOOK_DEEP_LINK)
          : Linking.openURL(FACEBOOK_WEB_URL),
      )
      .catch(console.warn);
  }, []);
  const onPressReddit = React.useCallback(() => {
    Linking.canOpenURL(REDDIT_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(REDDIT_DEEP_LINK)
          : Linking.openURL(REDDIT_WEB_URL),
      )
      .catch(console.warn);
  }, []);
  const onPressMastodon = React.useCallback(() => {
    Linking.canOpenURL(IVORY_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(IVORY_DEEP_LINK)
          : Linking.canOpenURL(MASTODON_DEEP_LINK).then((supported) =>
              supported
                ? Linking.openURL(MASTODON_DEEP_LINK)
                : Linking.openURL(MASTODON_WEB_URL),
            ),
      )
      .catch(console.warn);
  }, []);
  const onPressGithub = React.useCallback(() => {
    Linking.canOpenURL(GITHUB_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(GITHUB_DEEP_LINK)
          : Linking.openURL(GITHUB_WEB_URL),
      )
      .catch(console.warn);
  }, []);
  return (
    <>
      <FixedScrollView
        {...{
          headerHeight,
          tabBarheight,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            margin: Settings.CARD_PADDING,
            paddingVertical: Settings.PADDING,
          }}
        >
          <GestureDetector gesture={tap}>
            <AppIconView />
          </GestureDetector>
          <View
            style={{
              marginLeft: Settings.PADDING,
            }}
          >
            <Text style={fonts.body} numberOfLines={1}>
              {Settings.APP_NAME} {Settings.APP_VERSION}
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
              por Ariel Falduto
            </Text>
          </View>
        </View>
        <CardView plain>
          <IconCardItemView
            title="Sitio web"
            iconName="link"
            onAction={onPressWebsite}
          />
        </CardView>
        <CardView plain>
          <IconCardItemView
            title="Twitter"
            iconName="twitter"
            onAction={onPressTwitter}
          />
          <IconCardItemView
            title="Telegram"
            iconName="telegram-plane"
            onAction={onPressTelegram}
          />
          <IconCardItemView
            title="Instagram"
            iconName="instagram"
            onAction={onPressInstagram}
          />
          <IconCardItemView
            title="Facebook"
            iconName="facebook"
            onAction={onPressFacebook}
          />
          <IconCardItemView
            title="Reddit"
            iconName="reddit-alien"
            onAction={onPressReddit}
          />
          <IconCardItemView
            title="Mastodon"
            iconName="mastodon"
            onAction={onPressMastodon}
          />
          <IconCardItemView
            title="GitHub"
            iconName="github"
            onAction={onPressGithub}
          />
        </CardView>
        <TextCardView
          // style={{ flexGrow: 1 }}
          text={`${Settings.APP_COPYRIGHT} ${Settings.DASH_SEPARATOR} Hecho con ♥ en Buenos Aires, Argentina.`}
        />
      </FixedScrollView>
      {makeItRain === true && (
        <AnimatedConfettiView
          {...{
            numItems: 100,
            itemDimensions: {
              width: CONFETTI_ITEM_WIDTH,
              height: CONFETTI_ITEM_HEIGHT,
            },
            itemColors: ['#00E4B2', '#09AEC5', '#107ED5'],
            itemTintStrength: 0.8,
            fallSpeed: CONFETTI_FALL_SPEED,
            flipSpeed: 3,
            horizSpeed: 50,
            continuous: false,
          }}
        />
      )}
    </>
  );
};

export default compose(withContainer(), withDividersOverlay)(AboutScreen);
