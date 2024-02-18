import PropTypes from 'prop-types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { Animated, View, StyleSheet } from 'react-native';

import FloatingEmoji from './FloatingEmoji';

function useTimeout() {
  const handle = useRef(null);
  const start = useCallback((func, ms) => {
    handle.current = setTimeout(func, ms);
  }, []);
  const stop = useCallback(() => {
    if (handle.current) {
      clearTimeout(handle.current);
    }
  }, []);
  useEffect(() => () => stop(), [stop]);
  return [start, stop, handle];
}

const EMPTY_ARRAY = [];
const getEmoji = (emojis) => Math.floor(Math.random() * emojis.length);
const getRandomNumber = (min, max) => Math.random() * (max - min) + min;

const FloatingEmojis = ({
  centerVertically,
  children,
  disableHorizontalMovement,
  disableVerticalMovement,
  distance,
  duration,
  emojis,
  fadeOut,
  marginTop,
  opacity,
  opacityThreshold,
  range,
  scaleTo,
  setOnNewEmoji,
  size,
  wiggleFactor,
  // FIXME: disable when android < 24
  disableMoneyMouthFace,
  ...props
}) => {
  const emojisArray = useMemo(
    () => (Array.isArray(emojis) ? emojis : [emojis]),
    [emojis],
  );
  const [floatingEmojis, setEmojis] = useState(EMPTY_ARRAY);
  const [startTimeout, stopTimeout] = useTimeout();
  const clearEmojis = useCallback(() => setEmojis(EMPTY_ARRAY), []);

  // 🚧️ TODO: 🚧️
  // Clear emojis if page navigatorPosition falls below 0.93 (which we should call like `pageTransitionThreshold` or something)
  // otherwise, the FloatingEmojis look weird during stack transitions

  const onNewEmoji = useCallback(
    (x, y) => {
      // Set timeout to automatically clearEmojis after the latest one has finished animating
      stopTimeout();
      startTimeout(clearEmojis, duration * 1.1);

      setEmojis((existingEmojis) => {
        const newEmoji = {
          // if a user has smashed the button 7 times, they deserve a 🤑 money mouth face
          emojiToRender:
            (existingEmojis.length + 1) % 7 === 0 && !disableMoneyMouthFace
              ? '🤑'
              : emojisArray.length === 1
                ? emojisArray[0]
                : emojisArray[getEmoji(emojisArray)],
          x: x ? x - getRandomNumber(-20, 20) : getRandomNumber(...range) + '%',
          y: y || 0,
        };
        return [...existingEmojis, newEmoji];
      });
    },
    [
      clearEmojis,
      disableMoneyMouthFace,
      duration,
      emojisArray,
      range,
      startTimeout,
      stopTimeout,
    ],
  );

  useEffect(() => {
    setOnNewEmoji?.(onNewEmoji);
    return () => setOnNewEmoji?.(undefined);
  }, [setOnNewEmoji, onNewEmoji]);

  return (
    <View zIndex={1} {...props}>
      {typeof children === 'function' ? children({ onNewEmoji }) : children}
      <Animated.View
        pointerEvents="none"
        style={{
          opacity,
          ...StyleSheet.absoluteFillObject,
        }}
      >
        {floatingEmojis.map(({ emojiToRender, x, y }, index) => (
          <FloatingEmoji
            centerVertically={centerVertically}
            disableHorizontalMovement={disableHorizontalMovement}
            disableVerticalMovement={disableVerticalMovement}
            distance={Math.ceil(distance)}
            duration={duration}
            emoji={emojiToRender}
            fadeOut={fadeOut}
            index={index}
            key={`${x}${y}`}
            left={x}
            marginTop={marginTop}
            opacityThreshold={opacityThreshold}
            scaleTo={scaleTo}
            size={size}
            top={y}
            wiggleFactor={wiggleFactor}
          />
        ))}
      </Animated.View>
    </View>
  );
};

FloatingEmojis.propTypes = {
  centerVertically: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  disableHorizontalMovement: PropTypes.bool,
  disableVerticalMovement: PropTypes.bool,
  distance: PropTypes.number,
  duration: PropTypes.number,
  emojis: PropTypes.arrayOf(PropTypes.string).isRequired,
  fadeOut: PropTypes.bool,
  marginTop: PropTypes.number,
  opacity: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  opacityThreshold: PropTypes.number,
  range: PropTypes.arrayOf(PropTypes.number),
  scaleTo: PropTypes.number,
  setOnNewEmoji: PropTypes.func,
  size: PropTypes.number.isRequired,
  wiggleFactor: PropTypes.number,
  disableMoneyMouthFace: PropTypes.bool,
};

FloatingEmojis.defaultProps = {
  distance: 130,
  duration: 2000,
  emojis: ['💸'],
  fadeOut: true,
  opacity: 1,
  range: [0, 80],
  scaleTo: 1,
  size: 30,
  wiggleFactor: 0.5,
};

export default FloatingEmojis;
