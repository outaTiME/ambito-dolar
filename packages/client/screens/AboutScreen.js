import { compose } from '@reduxjs/toolkit';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { View, Text, Linking, Platform } from 'react-native';

import AppIconView from '../components/AppIconView';
import Bounceable from '../components/Bounceable';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import FloatingEmojis from '../components/FloatingEmojis';
import IconCardItemView from '../components/IconCardItemView';
import TextCardView from '../components/TextCardView';
import withContainer from '../components/withContainer';
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
const WHATSAPP_WEB_URL = `https://whatsapp.com/channel/0029VaNvh4LGpLHUyd75cO1P`;
const BLUESKY_URI = 'profile/ambitodolar.bsky.social';
const BLUESKY_DEEP_LINK = `bluesky://${BLUESKY_URI}`;
const BLUESKY_WEB_URL = `https://bsky.app/${BLUESKY_URI}`;
const GITHUB_URI = 'github.com/outaTiME/ambito-dolar';
const GITHUB_DEEP_LINK = `github://${GITHUB_URI}`;
const GITHUB_WEB_URL = `https://${GITHUB_URI}`;

const AboutScreen = ({ headerHeight, tabBarheight, navigation }) => {
  const { theme, fonts } = Helper.useTheme();
  const onPressAppIcon = React.useCallback(() => {
    Haptics.notificationAsync();
  }, []);
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
  const onPressWhatsapp = React.useCallback(() => {
    Linking.openURL(WHATSAPP_WEB_URL).catch(console.warn);
  }, []);
  const onPressBluesky = React.useCallback(() => {
    Linking.canOpenURL(BLUESKY_DEEP_LINK)
      .then((supported) =>
        supported
          ? Linking.openURL(BLUESKY_DEEP_LINK)
          : Linking.openURL(BLUESKY_WEB_URL),
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
  const onPressCafecito = React.useCallback(() => {
    Linking.openURL(Settings.CAFECITO_URL).catch(console.warn);
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
          <FloatingEmojis
            centerVertically
            duration={750}
            fadeOut={false}
            scaleTo={0}
            size={40}
            wiggleFactor={0}
          >
            {({ onNewEmoji }) => (
              <Bounceable
                onPress={(x, y) => {
                  // according to the emoji size (40)
                  onNewEmoji(x - 20, y - 20);
                  onPressAppIcon();
                }}
              >
                <AppIconView />
              </Bounceable>
            )}
          </FloatingEmojis>
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
            iconName="x-twitter"
            onAction={onPressTwitter}
          />
          <IconCardItemView
            title="Telegram"
            iconName="telegram"
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
          {false && (
            <IconCardItemView
              title="WhatsApp"
              iconName="whatsapp"
              onAction={onPressWhatsapp}
            />
          )}
          <IconCardItemView
            title="Bluesky"
            iconName="bluesky"
            onAction={onPressBluesky}
          />
          <IconCardItemView
            title="GitHub"
            iconName="github"
            onAction={onPressGithub}
          />
        </CardView>
        <CardView plain>
          <IconCardItemView
            title="Cafecito"
            iconName="mug-hot"
            onAction={onPressCafecito}
          />
        </CardView>
        <TextCardView
          text={`${Settings.APP_COPYRIGHT} ${Settings.DASH_SEPARATOR} Hecho con ♥ desde algún lugar de la Argentina.`}
        />
      </FixedScrollView>
    </>
  );
};

export default compose(withContainer)(AboutScreen);
