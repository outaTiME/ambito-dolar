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
  const min_x = React.useMemo(() => {
    return data[0].x;
  }, [data]);
  const max_x = React.useMemo(() => {
    return data[data.length - 1].x;
  }, [data]);
  const sell_rates = React.useMemo(() => {
    return data.map(({ y }) => y);
  }, [data]);
  const y_range = React.useMemo(() => {
    const min_y = Math.min(...sell_rates);
    const max_y = Math.max(...sell_rates);
    // prevent bad rendering when stable data
    if (min_y === max_y) {
      return [min_y - 0.1, max_y + 0.1];
    }
    return [min_y, max_y];
  }, [sell_rates]);
  const victory_domain = React.useMemo(
    () => ({ x: [min_x, max_x], y: y_range }),
    [min_x, max_x, y_range]
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
        domain={victory_domain}
        animate={false}
      >
        <VictoryArea data={data} interpolation="monotoneX" style={area_style} />
      </VictoryGroup>
    </View>
  );
};

export default ({ stats, color }) => {
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
