import AmbitoWidgetsModule from '@/modules/widgets/src/AmbitoWidgetsModule';

// redraws every native widget with fresh rates, same role reloadAllTimelines has on ios
export function reloadWidgets() {
  return AmbitoWidgetsModule.reloadWidgets();
}
