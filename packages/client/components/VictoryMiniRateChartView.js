import AmbitoDolar from '@ambito-dolar/core';
import { useLayout } from '@react-native-community/hooks';
import React from 'react';
import { View } from 'react-native';
import { VictoryGroup, VictoryArea } from 'victory-native';

import Settings from '../config/settings';

const VictoryMiniRateChartView = ({
  width,
  height,
  stats,
  color,
  borderless,
}) => {
  const data = React.useMemo(() => {
    return stats.map((datum, index) => ({
      x: index,
      y: AmbitoDolar.getRateValue(datum),
      // prevent rendering issues when values are close to 0
      y0: -Settings.PADDING * 2,
    }));
  }, [stats]);
  // data normalization
  const sell_rates = React.useMemo(() => data.map(({ y }) => y), [data]);
  const min_x = React.useMemo(() => data[0].x, [data]);
  const max_x = React.useMemo(() => data[data.length - 1].x, [data]);
  const min_y = React.useMemo(() => Math.min(...sell_rates), [sell_rates]);
  const max_y = React.useMemo(() => Math.max(...sell_rates), [sell_rates]);
  const domain = React.useMemo(
    () => ({
      x: [min_x, max_x],
      y: min_y === max_y ? [min_y - 0.1, max_y + 0.1] : [min_y, max_y],
    }),
    [min_x, max_x, min_y, max_y]
  );
  const area_style = React.useMemo(
    () => ({
      data: {
        stroke: color,
        strokeWidth: Settings.CHART_STROKE_WIDTH,
        strokeLinecap: 'round',
        fill: color,
        fillOpacity: 0.15,
      },
    }),
    [color]
  );
  return (
    <VictoryGroup
      width={width}
      height={height}
      singleQuadrantDomainPadding={false}
      domainPadding={{
        x: Settings.CHART_STROKE_WIDTH,
        y: borderless === true ? Settings.PADDING : Settings.CHART_STROKE_WIDTH,
      }}
      // domainPadding={Settings.CHART_STROKE_WIDTH}
      padding={borderless === true ? -Settings.CHART_STROKE_WIDTH : 0}
      domain={domain}
      animate={false}
    >
      <VictoryArea data={data} interpolation="monotoneX" style={area_style} />
    </VictoryGroup>
  );
};

export default ({ stats, color, borderless }) => {
  // layout
  const { onLayout, width, height } = useLayout();
  const hasLayout = React.useMemo(() => width && height, [width, height]);
  return (
    <View style={{ flex: 1 }} {...(!hasLayout && { onLayout })}>
      {hasLayout ? (
        <VictoryMiniRateChartView
          {...{
            width,
            height,
            stats,
            color,
            borderless,
          }}
        />
      ) : null}
    </View>
  );
};
