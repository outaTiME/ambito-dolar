// @ts-nocheck
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import Settings from '@/config/settings';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';

const DEFAULT_WIDGET_SIZE = 130;

// square card centered in the cell, the cell itself is not always square
const CONTAINER_STYLE = {
  height: 'match_parent',
  width: 'match_parent',
  justifyContent: 'center',
  alignItems: 'center',
};

// one line of a row pair, name and price on top, date and change below
const ROW_STYLE = {
  width: 'match_parent',
  flexDirection: 'row',
  justifyContent: 'space-between',
};

// shared by every widget. Pass `rows` for the list layout, otherwise the card lays out
// title / detail / gap / small / big / date and only what fills each slot differs
export default function WidgetCard(props) {
  const {
    title,
    detail,
    small,
    smallColor,
    big,
    bigColor,
    rows,
    timestamp,
    uri,
    empty,
  } = props;
  // sometimes on low-end devices the size is 0
  const widgetSize = props.size || DEFAULT_WIDGET_SIZE;
  const adaptativeFactor = widgetSize / DEFAULT_WIDGET_SIZE;
  const getAdaptiveSize = (size) => size * adaptativeFactor;
  const cardStyle = {
    height: widgetSize,
    width: widgetSize,
    backgroundColor: '#000',
    borderRadius: getAdaptiveSize(20),
    padding: getAdaptiveSize(13),
  };
  const gray = Helper.getRgbaColor(Settings.getGrayColor());
  // every line is clipped to one row, the card has no room to wrap. Ellipsis because
  // maxLines alone cuts mid glyph, while ios truncates with one by default
  const line = (text, size, color, wrap = false) => (
    <TextWidget
      text={text}
      style={{
        fontSize: getAdaptiveSize(size),
        fontFamily: 'FiraGO-Regular',
        color,
        ...(wrap && { textAlign: 'center' }),
      }}
      {...(!wrap && { maxLines: 1, truncate: 'END' })}
      allowFontScaling={false}
    />
  );
  if (rows) {
    return (
      <FlexWidget style={CONTAINER_STYLE}>
        <FlexWidget
          // the gaps between rows are the ones that stretch, same as the ios Spacer
          style={{ ...cardStyle, justifyContent: 'space-between' }}
          clickAction="OPEN_URI"
          clickActionData={{ uri }}
        >
          {rows.map((row, index) => (
            <FlexWidget key={index} style={{ width: 'match_parent' }}>
              <FlexWidget style={ROW_STYLE}>
                {line(row.name, 11.5, '#FFF')}
                {line(row.price, 13.2, '#FFF')}
              </FlexWidget>
              <FlexWidget style={ROW_STYLE}>
                {line(
                  row.timestamp ? DateUtils.humanize(row.timestamp, 1) : ' ',
                  9,
                  gray,
                )}
                {line(row.change, 9, row.changeColor)}
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>
    );
  }
  return (
    <FlexWidget style={CONTAINER_STYLE}>
      {big ? (
        <FlexWidget
          style={cardStyle}
          clickAction="OPEN_URI"
          clickActionData={{ uri }}
        >
          {line(title, 16.5, '#FFF')}
          {/* rates without a buy/sell pair have no value type to show, keep the blank
              line so the layout does not shift, same as the ios accessory widget */}
          {line(detail || ' ', 11.5, gray)}
          {/* the gap between detail and small is the one that stretches, same as the ios Spacer */}
          <FlexWidget style={{ flex: 1, justifyContent: 'flex-end' }}>
            {line(small, 11.5, smallColor)}
            {line(big, 21.4, bigColor)}
            {line(DateUtils.humanize(timestamp, 1), 9, gray)}
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            ...cardStyle,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'ambito-dolar://rates' }}
        >
          {line(empty, 11.5, '#FFF', true)}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
