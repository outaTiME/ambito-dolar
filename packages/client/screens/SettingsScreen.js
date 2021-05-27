import { FontAwesome5 } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { BorderlessButton } from 'react-native-gesture-handler';
import { View, Text, Linking, Share } from 'react-native';
import { useSelector } from 'react-redux';
import React from 'react';
import { compose } from 'redux';

import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const { installationId: installation_id, manifest } = Constants;
const { version: app_version, revisionId: app_revision_id } = manifest;

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
const REDDIT_WEB_URL = 'https://www.reddit.com/r/AmbitoDolar';
const GITHUB_WEB_URL = 'https://github.com/outaTiME/ambito-dolar';

const SettingsScreen = ({ navigation }) => {
  const { theme, fonts } = Helper.useTheme();
  const processed_at = useSelector((state) => state.rates?.processed_at);
  const onPressTwitter = React.useCallback(() => {
    Linking.canOpenURL(TWITTER_DEEP_LINK).then((supported) =>
      supported
        ? Linking.openURL(TWITTER_DEEP_LINK)
        : Linking.openURL(TWITTER_WEB_URL)
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
    Linking.openURL(REDDIT_WEB_URL);
  }, []);
  const onPressGithub = React.useCallback(() => {
    Linking.openURL(GITHUB_WEB_URL);
  }, []);
  const onPressContact = React.useCallback(() => {
    MailComposer.composeAsync({
      recipients: [`soporte@${Settings.APP_DOMAIN}`],
      subject: `${Settings.APP_NAME} ${app_version}`,
      body: [
        '',
        '',
        '—',
        '',
        `Instalación: ${installation_id}`,
        `Versión: ${app_revision_id || app_version}`,
        `Dispositivo: ${Device.modelName} (${Device.osVersion})`,
      ].join('\n'),
    });
  }, []);
  const onPressShare = React.useCallback(() => {
    Share.share({
      message: `Te recomiendo descargar ${Settings.APP_NAME}, es mi aplicación preferida para conocer las cotizaciones del dólar en la Argentina. https://${Settings.APP_DOMAIN}`,
    });
  }, []);
  const [contactAvailable] = Helper.useSharedState('contactAvailable', false);
  return (
    <ScrollView>
      <CardView title="General" plain>
        <CardItemView
          title="Notificaciones"
          useSwitch={false}
          onAction={() => {
            navigation.navigate('Notifications');
          }}
        />
        <CardItemView
          title="Instalación"
          useSwitch={false}
          value={installation_id}
          selectable
        />
        <CardItemView
          title="Versión"
          useSwitch={false}
          value={app_revision_id || app_version}
        />
      </CardView>
      {processed_at && (
        <CardView title="Cotizaciones" plain>
          <CardItemView
            title="Actualización"
            useSwitch={false}
            value={DateUtils.datetime(processed_at, { short: true })}
          />
        </CardView>
      )}
      <CardView plain>
        {contactAvailable && (
          <CardItemView
            title="Enviar comentarios"
            useSwitch={false}
            chevron={false}
            onAction={onPressContact}
          />
        )}
        <CardItemView
          title="Compartir"
          useSwitch={false}
          chevron={false}
          onAction={onPressShare}
        />
      </CardView>
      <View
        style={[
          {
            flexShrink: 0,
            flexGrow: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            margin: Settings.CARD_PADDING,
          },
        ]}
      >
        <View
          style={{
            marginVertical: Settings.CARD_PADDING * 2,
            flexDirection: 'row',
          }}
        >
          {/* TODO: export to links to helper */}
          <BorderlessButton
            onPress={onPressTwitter}
            style={{ marginRight: Settings.PADDING }}
            hitSlop={Settings.HIT_SLOP}
          >
            <FontAwesome5
              name="twitter"
              size={24}
              color={Settings.getGrayColor(theme)}
            />
          </BorderlessButton>
          <BorderlessButton
            onPress={onPressTelegram}
            style={{ marginHorizontal: Settings.PADDING }}
            hitSlop={Settings.HIT_SLOP}
          >
            <FontAwesome5
              name="telegram-plane"
              size={24}
              color={Settings.getGrayColor(theme)}
            />
          </BorderlessButton>
          <BorderlessButton
            onPress={onPressInstagram}
            style={{ marginHorizontal: Settings.PADDING }}
            hitSlop={Settings.HIT_SLOP}
          >
            <FontAwesome5
              name="instagram"
              size={24}
              color={Settings.getGrayColor(theme)}
            />
          </BorderlessButton>
          <BorderlessButton
            onPress={onPressFacebook}
            style={{ marginHorizontal: Settings.PADDING }}
            hitSlop={Settings.HIT_SLOP}
          >
            <FontAwesome5
              name="facebook"
              size={24}
              color={Settings.getGrayColor(theme)}
            />
          </BorderlessButton>
          <BorderlessButton
            onPress={onPressReddit}
            style={{ marginHorizontal: Settings.PADDING }}
            hitSlop={Settings.HIT_SLOP}
          >
            <FontAwesome5
              name="reddit-alien"
              size={24}
              color={Settings.getGrayColor(theme)}
            />
          </BorderlessButton>
          <BorderlessButton
            onPress={onPressGithub}
            style={{ marginLeft: Settings.PADDING }}
            hitSlop={Settings.HIT_SLOP}
          >
            <FontAwesome5
              name="github"
              size={24}
              color={Settings.getGrayColor(theme)}
            />
          </BorderlessButton>
        </View>
        <Text
          style={[
            fonts.subhead,
            {
              color: Settings.getGrayColor(theme),
              textTransform: 'uppercase',
            },
          ]}
          numberOfLines={1}
        >
          {Settings.APP_COPYRIGHT}
        </Text>
        {false && (
          <Text
            style={[
              fonts.subhead,
              {
                color: Settings.getGrayColor(theme),
                textTransform: 'uppercase',
              },
            ]}
            numberOfLines={1}
          >
            {app_revision_id || app_version}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default compose(withContainer)(SettingsScreen);
