// https://github.com/peacechen/react-native-make-it-rain/blob/master/src/confetti.js
// https://gist.github.com/ShopifyEng/96b5f2f55b274dab3a957bb12c3f2c4d

import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

const {
  Clock,
  Value,
  startClock,
  stopClock,
  set,
  add,
  sub,
  divide,
  diff,
  multiply,
  cond,
  clockRunning,
  greaterThan,
  lessThan,
  lessOrEq,
  eq,
} = Animated;

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

const Confetti = (props) => {
  const confetti = React.useMemo(() => {
    // Adapt velocity props
    const xVelMax = props.horizSpeed * 8;
    const yVelMax = props.fallSpeed * 3;
    const angleVelMax = props.flipSpeed;
    return [...new Array(props.numItems)].map((_, index) => ({
      key: index,
      // Spawn confetti from two different sources, a quarter
      // from the left and a quarter from the right edge of the screen.
      /* x: new Value(
        screenWidth * (index % 2 ? 0.25 : 0.75) - props.itemDimensions.width / 2
      ), */
      x: new Value(Math.random() * (screenWidth - props.itemDimensions.width)),
      // y: new Value(-props.itemDimensions.height * 2),
      y: new Animated.Value(-60),
      angle: new Value(0),
      xVel: new Value(Math.random() * xVelMax - xVelMax / 2),
      yVel: new Value(Math.random() * yVelMax + yVelMax),
      angleVel: new Value(
        (Math.random() * angleVelMax - angleVelMax / 2) * Math.PI,
      ),
      delay: new Value(Math.floor(index / 10) * 0.3),
      elasticity: Math.random() * 0.9 + 0.1,
      color: props.itemColors[index % props.itemColors.length],
    }));
  }, [
    props.horizSpeed,
    props.fallSpeed,
    props.flipSpeed,
    props.numItems,
    props.itemDimensions,
    props.itemColors,
  ]);
  const clock = new Clock();
  React.useEffect(() => {
    return () => {
      stopClock(clock);
    };
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {confetti.map(
        ({
          key,
          x,
          y,
          angle,
          xVel,
          yVel,
          angleVel,
          color,
          elasticity,
          delay,
        }) => {
          return (
            <React.Fragment key={key}>
              <Animated.Code>
                {() => {
                  const timeDiff = diff(clock);
                  const dt = divide(timeDiff, 1000);
                  const dy = multiply(dt, yVel);
                  const dx = multiply(dt, xVel);
                  const dAngle = multiply(dt, angleVel);
                  return cond(
                    clockRunning(clock),
                    [
                      cond(
                        lessOrEq(y, screenHeight + props.itemDimensions.height),
                        cond(
                          greaterThan(delay, 0),
                          [set(delay, sub(delay, dt))],
                          [
                            set(y, add(y, dy)),
                            set(x, add(x, dx)),
                            set(angle, add(angle, dAngle)),
                          ],
                        ),
                      ),
                      cond(
                        greaterThan(
                          x,
                          screenWidth - props.itemDimensions.width,
                        ),
                        [
                          set(x, screenWidth - props.itemDimensions.width),
                          set(xVel, multiply(xVel, -elasticity)),
                        ],
                      ),
                      cond(lessThan(x, 0), [
                        set(x, 0),
                        set(xVel, multiply(xVel, -elasticity)),
                      ]),
                      cond(
                        eq(props.continuous, true),
                        cond(
                          greaterThan(
                            y,
                            screenHeight + props.itemDimensions.height,
                          ),
                          set(y, -props.itemDimensions.height * 2),
                        ),
                      ),
                    ],
                    [startClock(clock), timeDiff],
                  );
                }}
              </Animated.Code>
              <Animated.View
                style={[
                  styles.animContainer,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { rotate: angle },
                      { rotateX: angle },
                      { rotateY: angle },
                    ],
                  },
                ]}
              >
                <View
                  style={[{ backgroundColor: color }, props.itemDimensions]}
                  opacity={props.itemTintStrength}
                />
              </Animated.View>
            </React.Fragment>
          );
        },
      )}
    </View>
  );
};

export default Confetti;

const styles = StyleSheet.create({
  animContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
