import { useAppState } from '@react-native-community/hooks';

export default (state) => {
  const currentAppState = useAppState();
  return state ? currentAppState === state : currentAppState;
};
