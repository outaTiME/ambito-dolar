import AmbitoDolar from '@ambito-dolar/core';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const DEFAULT_WIDGET_SIZE = 130;

export default function RateWidget(props) {
  const {
    // preview = false,
    // force to dark theme (except on preview)
    theme = 'dark',
    // size,
    type,
    change,
    value,
    timestamp,
  } = props;
  // sometimes on low-end devices the size is 0
  const widgetSize = props.size || DEFAULT_WIDGET_SIZE;
  const adaptativeFactor = widgetSize / DEFAULT_WIDGET_SIZE;
  const getAdaptiveSize = (size) => size * adaptativeFactor;
  const padding = getAdaptiveSize(14);
  // https://stackoverflow.com/questions/2105289/iphone-app-icons-exact-radius#:~:text=Apple%20starts%20with%20the%2057px,radius%20for%20a%20114px%20icon
  // const borderRadius = Math.round((10 / 57) * size);
  const borderRadius = getAdaptiveSize(20);
  // twitter.com/okovalenkome/status/1749839657561674154
  // const borderRadius = (12 / 60) * size;
  console.log(
    '>>> RateWidget',
    // preview,
    theme,
    `${widgetSize} (${props.size})`,
    type,
    change,
    value,
    timestamp,
  );
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SvgWidget
        style={{
          height: widgetSize,
          width: widgetSize,
        }}
        svg={`
            <svg viewBox="0 0 ${widgetSize} ${widgetSize}" xmlns="http://www.w3.org/2000/svg">
              <rect width="${widgetSize}" height="${widgetSize}" rx="${borderRadius}" fill="#000"/>
            </svg>
          `}
      />
      {value ? (
        <FlexWidget
          style={{
            height: widgetSize - padding * 2,
            width: widgetSize - padding * 2,
            marginTop: -(widgetSize - padding),
          }}
          clickAction="OPEN_URI"
          clickActionData={{
            uri: `ambito-dolar://rate?type=${type}`,
          }}
        >
          <TextWidget
            text={AmbitoDolar.getRateTitle(type)}
            style={{
              fontSize: getAdaptiveSize(18),
              fontFamily: 'FiraGO-Regular',
              color: '#FFF',
            }}
            maxLines={1}
            allowFontScaling={false}
          />
          <FlexWidget style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TextWidget
              // eslint-disable-next-line no-sparse-arrays
              text={AmbitoDolar.getRateChange([, , change], true)}
              style={{
                fontSize: getAdaptiveSize(12),
                fontFamily: 'FiraGO-Regular',
                color: Helper.getRgbaColor(
                  Helper.getChangeColor(change, theme),
                ),
              }}
              maxLines={1}
              allowFontScaling={false}
            />
            <TextWidget
              text={Helper.getInlineRateValue(value)}
              style={{
                fontSize: getAdaptiveSize(24),
                fontFamily: 'FiraGO-Regular',
                color: '#FFF',
              }}
              maxLines={1}
              allowFontScaling={false}
            />
            <TextWidget
              text={DateUtils.humanize(timestamp, 1)}
              style={{
                fontSize: getAdaptiveSize(10),
                fontFamily: 'FiraGO-Regular',
                color: Helper.getRgbaColor(Settings.getGrayColor(theme)),
                marginTop: getAdaptiveSize(5),
              }}
              maxLines={1}
              allowFontScaling={false}
            />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            height: widgetSize - padding * 2,
            width: widgetSize - padding * 2,
            marginTop: -(widgetSize - padding),
            justifyContent: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{
            uri: 'ambito-dolar://rates',
          }}
        >
          <TextWidget
            text="Cotización no disponible"
            style={{
              fontSize: 12,
              fontFamily: 'FiraGO-Regular',
              color: '#FFF',
              textAlign: 'center',
            }}
            allowFontScaling={false}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
