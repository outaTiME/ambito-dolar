import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { View, Image, Text, Linking, Platform } from 'react-native';
import { compose } from 'redux';

import appIcon from '../assets/about-icon-borderless.png';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

// social links
const TWEETBOT_DEEP_LINK = 'tweetbot:///user_profile/AmbitoDolar';
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
const APOLLO_DEEP_LINK = 'apollo://www.reddit.com/r/AmbitoDolar';
const REDDIT_DEEP_LINK = 'reddit:///r/AmbitoDolar';
const REDDIT_WEB_URL = 'https://www.reddit.com/r/AmbitoDolar';
const DISCORD_DEEP_LINK = 'com.hammerandchisel.discord://discord.gg/jwfDsy4EKe';
const DISCORD_WEB_URL = 'https://discord.gg/jwfDsy4EKe';
const GITHUB_DEEP_LINK = 'github://github.com/outaTiME/ambito-dolar';
const GITHUB_WEB_URL = 'https://github.com/outaTiME/ambito-dolar';

const SocialCardItemView = ({ title, iconName, iconColor, onAction }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <CardItemView
      title={
        <View
          style={[
            {
              flexShrink: 0,
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          <FontAwesome5
            name={iconName}
            size={17}
            color={iconColor || Settings.getForegroundColor(theme)}
          />
          <Text
            style={[fonts.body, { marginLeft: Settings.PADDING }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      }
      useSwitch={false}
      chevron={false}
      onAction={onAction}
    />
  );
};

const AboutScreen = ({ navigation }) => {
  const { theme, fonts } = Helper.useTheme();
  const onPressWebsite = React.useCallback(() => {
    Linking.openURL(Settings.WEBSITE_URL);
  }, []);
  const onPressTwitter = React.useCallback(() => {
    Linking.canOpenURL(TWEETBOT_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(TWEETBOT_DEEP_LINK)
        : Linking.canOpenURL(TWITTER_DEEP_LINK).then((supported) =>
            supported
              ? Linking.openURL(TWITTER_DEEP_LINK)
              : Linking.openURL(TWITTER_WEB_URL)
          )
    );
  }, []);
  const onPressTelegram = React.useCallback(() => {
    Linking.canOpenURL(TELEGRAM_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(TELEGRAM_DEEP_LINK)
        : Linking.openURL(TELEGRAM_WEB_URL)
    );
  }, []);
  const onPressInstagram = React.useCallback(() => {
    Linking.canOpenURL(INSTAGRAM_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(INSTAGRAM_DEEP_LINK)
        : Linking.openURL(INSTAGRAM_WEB_URL)
    );
  }, []);
  const onPressFacebook = React.useCallback(() => {
    Linking.canOpenURL(FACEBOOK_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(FACEBOOK_DEEP_LINK)
        : Linking.openURL(FACEBOOK_WEB_URL)
    );
  }, []);
  const onPressReddit = React.useCallback(() => {
    Linking.canOpenURL(APOLLO_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(APOLLO_DEEP_LINK)
        : Linking.canOpenURL(REDDIT_DEEP_LINK).then((supported) =>
            supported
              ? Linking.openURL(REDDIT_DEEP_LINK)
              : Linking.openURL(REDDIT_WEB_URL)
          )
    );
  }, []);
  const onPressDiscord = React.useCallback(() => {
    Linking.canOpenURL(DISCORD_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(DISCORD_DEEP_LINK)
        : Linking.openURL(DISCORD_WEB_URL)
    );
  }, []);
  const onPressGithub = React.useCallback(() => {
    Linking.canOpenURL(GITHUB_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(GITHUB_DEEP_LINK)
        : Linking.openURL(GITHUB_WEB_URL)
    );
  }, []);
  return (
    <ScrollView>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          margin: Settings.CARD_PADDING,
          paddingVertical: Settings.PADDING,
        }}
      >
        <Image
          style={{
            width: 72,
            height: 72,
            borderRadius: Settings.BORDER_RADIUS,
          }}
          source={appIcon}
        />
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
        <SocialCardItemView
          title="Sitio web"
          iconName="link"
          onAction={onPressWebsite}
        />
      </CardView>
      <CardView plain>
        <SocialCardItemView
          title="Twitter"
          iconName="twitter"
          onAction={onPressTwitter}
        />
        <SocialCardItemView
          title="Telegram"
          iconName="telegram-plane"
          onAction={onPressTelegram}
        />
        <SocialCardItemView
          title="Instagram"
          iconName="instagram"
          onAction={onPressInstagram}
        />
        <SocialCardItemView
          title="Facebook"
          iconName="facebook"
          onAction={onPressFacebook}
        />
        <SocialCardItemView
          title="Reddit"
          iconName="reddit-alien"
          onAction={onPressReddit}
        />
        <SocialCardItemView
          title="Discord"
          iconName="discord"
          onAction={onPressDiscord}
        />
        <SocialCardItemView
          title="GitHub"
          iconName="github"
          onAction={onPressGithub}
        />
      </CardView>
      <View
        style={[
          {
            flexShrink: 0,
            flexGrow: 1,
            margin: Settings.CARD_PADDING,
          },
          {
            borderColor: 'red',
            // borderWidth: 1,
          },
          {
            alignItems: 'center',
            // justifyContent: 'flex-end',
            justifyContent: 'center',
            paddingHorizontal: Settings.CARD_PADDING,
          },
        ]}
      >
        <Text
          style={[
            fonts.subhead,
            {
              color: Settings.getGrayColor(theme),
              // textTransform: 'uppercase',
              textAlign: 'center',
            },
          ]}
        >
          {`${Settings.APP_COPYRIGHT} ${Settings.DASH_SEPARATOR} Hecho con ♥ en Buenos Aires, Argentina.`}
        </Text>
      </View>
    </ScrollView>
  );
};

export default compose(withContainer())(AboutScreen);
