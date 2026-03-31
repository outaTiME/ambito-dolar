import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Animated, View, StyleSheet, Platform } from 'react-native';

import FloatingEmoji from '@/components/FloatingEmoji';

function useTimeout() {
  const handle = useRef<any>(null);
  const start = useCallback((func: any, ms: any) => {
    handle.current = setTimeout(func, ms);
  }, []);
  const stop = useCallback(() => {
    if (handle.current) {
      clearTimeout(handle.current);
    }
  }, []);
  useEffect(() => () => stop(), [stop]);
  return [start, stop, handle] as const;
}

const EMPTY_ARRAY = [];
const getEmoji = (emojis: any) => Math.floor(Math.random() * emojis.length);
const getRandomNumber = (min: any, max: any) =>
  Math.random() * (max - min) + min;

const FloatingEmojis = ({
  centerVertically,
  children,
  disableHorizontalMovement,
  disableVerticalMovement,
  distance = 130,
  duration = 2000,
  emojis = ['💸'],
  fadeOut = true,
  marginTop,
  opacity = 1,
  opacityThreshold,
  range: [rangeMin, rangeMax] = [0, 80],
  scaleTo = 1,
  setOnNewEmoji,
  size = 30,
  wiggleFactor = 0.5,
  style,
  disableMoneyMouthFace,
  ...props
}: any) => {
  const emojisArray = useMemo(
    () => (Array.isArray(emojis) ? emojis : [emojis]),
    [emojis],
  );
  const [floatingEmojis, setEmojis] = useState(EMPTY_ARRAY);
  const [startTimeout, stopTimeout] = useTimeout();
  const clearEmojis = useCallback(() => setEmojis(EMPTY_ARRAY), []);
  // emoji not available on older android versions
  if (Platform.OS === 'android' && Platform.Version < 24) {
    disableMoneyMouthFace = true;
  }
  // 🚧️ TODO: 🚧️
  // Clear emojis if page navigatorPosition falls below 0.93 (which we should call like `pageTransitionThreshold` or something)
  // otherwise, the FloatingEmojis look weird during stack transitions
  const onNewEmoji = useCallback(
    (x: any, y: any) => {
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
          x:
            x !== undefined
              ? x - getRandomNumber(-20, 20)
              : getRandomNumber(rangeMin, rangeMax),
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
      rangeMin,
      rangeMax,
      startTimeout,
      stopTimeout,
    ],
  );
  useEffect(() => {
    setOnNewEmoji?.(onNewEmoji);
    return () => setOnNewEmoji?.(undefined);
  }, [setOnNewEmoji, onNewEmoji]);
  return (
    <View style={[{ zIndex: 1 }, style]} {...props}>
      {typeof children === 'function' ? children({ onNewEmoji }) : children}
      <Animated.View
        pointerEvents="none"
        style={{
          opacity,
          ...StyleSheet.absoluteFill,
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

export default FloatingEmojis;
