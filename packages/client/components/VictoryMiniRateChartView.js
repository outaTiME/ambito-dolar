import { useLayout } from '@react-native-community/hooks';
import React from 'react';
import { View } from 'react-native';
import { VictoryGroup, VictoryArea } from 'victory-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const VictoryMiniRateChartView = ({ width, height, stats, color }) => {
  const data = React.useMemo(() => {
    return stats.map((datum, index) => ({
      x: index,
      y: Helper.getRateValue(datum),
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
    <View pointerEvents="none">
      <VictoryGroup
        width={width}
        height={height}
        singleQuadrantDomainPadding={false}
        domainPadding={Settings.CHART_STROKE_WIDTH}
        padding={0}
        domain={domain}
        animate={false}
      >
        <VictoryArea data={data} interpolation="monotoneX" style={area_style} />
      </VictoryGroup>
    </View>
  );
};

export default ({ stats, color }) => {
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
          }}
        />
      ) : null}
    </View>
  );
};
