# Adaptive layout

Read before touching `packages/client/hooks/useContentLayout.ts`, `ContentView`,
`ToastInsetPublisher` in `withContainer`, `ToastOverlay`, `Toast`, the donate route in
`packages/client/app/donate.tsx`, the mini chart in `RateView`, the detail chart height in
`RateDetailScreen`, `AnimatedSegmentedControl`, the Done button in
`packages/client/app/(modals)/_layout.tsx`, the orientation keys in `packages/client/app.config.ts`
or `isCompactScreen` and `ScreenOrientationLock` in `RootLayout`. Covers iPhone Duo (folded, open,
rail on either side), resizable iPad windows and Android tablets.

## Content column

- **`min(available, 640)`**, the same column width in portrait and landscape on every iPad. The cap
  stays below the narrowest iPad in portrait, the mini at 744, so a rotation only moves the side
  margins and never stretches the cards. The Duo open in portrait is the exception, its rail leaves
  about 600 and the column grows to 640 on a turn. Within that rule 640 was picked by eye on the Duo
  open in landscape and an Android foldable: 672 stretched the cards, 600 read narrow in landscape.
  It sits inside the band feeds and lists use elsewhere, 600 on X, Bluesky and Mastodon, 640 on
  Threads, 662 on Polaris narrow, 672 on Tailwind 2xl, and between Apple's `readableContentGuide` at
  the Medium and the default Large text size on iOS 18, 632 and 664. Apple publishes no number and
  widened that guide to 896 on iOS 26, Android 840 is a layout breakpoint, not a column width.
  Phones never reach the cap. The width only moves the mini chart rule below a column of about 400.
  Replaced the old 50% of the screen on tablets.
- **Centered in the safe area, like UIKit's `readableContentGuide`**. `ContentView` wraps the column
  (`COLUMN_STYLE`, `alignSelf: 'center'`, `width: MAX_CONTENT_WIDTH`, `maxWidth: '100%'`) in the
  `SafeAreaView` of `react-native-screens/experimental` with the left and right edges. With the rail
  on one side the column centers beside it, half the rail off the screen center.
- **Laid out natively, insets included**. On iOS the rn-screens `SafeAreaView` commits its insets
  with `unstable_Immediate` on the main thread, a rotation or a fold pads the rail in the same
  frame. Android goes through the async state update, still with no React render. It needs an
  `RNSScreen` ancestor, `InitialScreen` renders above the `Stack` and gets no side inset on iOS, a
  short centered message. It defaults to `flex: 1`, `ContentView` passes `flex: 0` or a screen
  without scroll loses its centering. `FixedFlatList` rows carry their own, FlashList mounts the
  visible ones only, Personalizar nests under `FixedScrollView` and gets one. A wrapper around the
  list shrinks the scroll view to the column. Padding from `useSafeAreaInsets`, asynchronous by its
  own docs, kept the landscape rail inset more than a second after a rotation to portrait in dev,
  the cards narrow and then stretching. The safe-area-context `SafeAreaView` is native too but its
  source queues the state update for the js thread.
- **Js insets kept on purpose**: `ToastOverlay` has no screen ancestor, `FixedScrollView` on an
  Android modal and the Android donate card only pad the bottom.
- **The js width only drives decisions**, the mini chart. `useContentLayout` reads
  `useSafeAreaFrame` plus the safe area insets of the nearest provider per render, never a module
  global. The old global plus a `key` on the root `Stack` remounted the whole navigation on every
  size change and lost the tab, the detail and the converter amount on a fold.
- **A modal needs no provider of its own**: the `SafeAreaView` reads the insets of its own
  `RNSScreen`, an iPad `pageSheet` or a Duo open sheet away from the rail included.
- **A nested `ContentView` spans the column**, a negative `CONTENT_MARGIN` over the outer margin.
  The outer one already placed it.
- **Web keeps the width taken at load**, half of it outside a phone, the social cards render at a
  fixed size.

## Toast

- **The focused screen publishes its insets**, `withContainer` through `useFocusEffect` into the
  `toastInset` shared state. `ToastOverlay` pads by those left and right and uses the same
  `COLUMN_STYLE`, so the toast centers with the cards. It sits outside any screen, no native
  provider, and a transient toast can follow js. The bottom is the screen inset on iOS, Android adds
  the bar height unless `hasBottomTab` is false.
- **iOS**: the per tab `SafeAreaProvider` of `NativeTabs` holds the tab bar in the bottom inset
  only while the bar runs along the bottom (iPhone, Duo open portrait). iPad puts it on top and
  the Duo folded or open landscape in the rail, so the toast drops to the bottom edge there.
- **Android**: the tab bar is not in the inset, so the bar height is added on tab screens only.

## Orientation

- **No `requireFullScreen`**: it letterboxed the Duo open display and blocks resizable iPad
  windows. iPhone stays Portrait, iPad all four.
- **Android phones lock portrait in `RootLayout`, tablets rotate like the iPad.** The lock follows
  the current display, `Dimensions.get('screen')`, below 600dp on its shorter side, never the device
  type taken at launch. Not the window, the lock letterboxes it below 600dp on Android before 16 and
  it never unlocked. The first lock runs on import, behind the splash, the leaf follows a fold. It
  sits outside `AppContainer`, the initial screen waiting for the rates rotated free inside it. A
  foldable launched open never locked its cover display, one launched folded kept the lock open on
  Android before 16. Android 16 with target SDK 36 ignores the lock from 600dp anyway, so `dumpsys`
  keeps showing PORTRAIT there after the unlock. The unlock after an unfold is a js render late,
  Android before 16 shows the inner display letterboxed for that render. The lock after a fold too,
  an app left in landscape shows that render landscape on the cover display.

## Narrow window

- **The mini chart hides**, once `140 * min(fontScale, 1.2) + 32 > width / 2`. The 1.2 bounds only
  this rule, text has no global font scale cap since React 19 (Expo SDK 53) ignores
  `Text.defaultProps`.
- **The buy and sell pair always shows**, a long title like Mayorista truncates instead. A setting
  to show one end (Mostrar) was dropped, no window tested left the pair without room.

## Resizing without jumps

- **The detail chart measures on every layout**, it takes the live width and height over its data
  snapshot. The mini chart box is fixed, it measures once.
- **The detail chart height follows the width natively**, the old `moderateScale(300)` as a fixed
  `marginTop` plus a 7/3 `aspectRatio` strut, so a fold moves the scroll below it in the same frame.
  The strut needs `width: '100%'`, stretch alone gave it a smaller width there.
- **The segmented control lays out natively**, the segments flex and the tile sits in a percent
  slot, so a resize never waits for js. A new selection springs a percent `translateX` only, no
  frame of it lays out the row.
- **Done in the modals is a native `Stack.Toolbar` button on Liquid Glass**, a react `headerRight`
  view in that header broke on a window resize. iOS before Liquid Glass keeps `headerRight`.
- **Still a frame late on a live resize**: the detail chart, Victory draws an svg at a measured
  size, and the rates list in Personalizar, `Sortable.Grid` sets each row width from its measured
  container. `Sortable.Flex` does not pass `itemStyle` to its cells, so it cannot take a native
  width either. The mini chart shows or hides from the js width, the change text rewraps after the
  column.
- **Larger Text changed with the app in the background, iOS only**: `RateView` reads
  `PixelRatio.getFontScale()` per render and is memoized, the change width stays at the old scale
  until the stats change and the percent can ellipsize. The old `updateSettings` global remounted
  the whole `Stack` on any window dimension change, font scale included. Accepted, reading
  `useWindowDimensions` in each card fixes it but re-renders every card on a rotation or a window
  resize.
- **The donate route is a native `formSheet` with `fitToContents`**, it follows a fold natively. iOS
  adds the sheet bottom inset below the content, 34 on an iPhone or the Duo folded, about 10 on an
  iPad window docked at the bottom, none on the centered iPad or Duo open card. An empty rn-screens
  `SafeAreaView` with the bottom edge on top mirrors it, so both ends stay even. iPad regular width
  always shows it as a centered card, no public API docks it. Android spans the window, the route
  draws a card at `COLUMN_STYLE` with `sheetElevation: 0` and a transparent `contentStyle`.
- **Tab tap scroll to top on the Duo stops one header short**, the first card under the header, a
  second tap lands right. rn-screens `rnscreens_scrollToTop` sets `-adjustedContentInset.top` with
  the header height of that moment, likely shorter while scrolled on the Duo. The status bar tap is
  the UIKit path and lands right, iPhone and iPad too. Not reproduced, only fixable with a patch.
