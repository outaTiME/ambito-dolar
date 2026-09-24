# Android navigation bar

Read this before touching the system navigation bar in
`packages/client/components/RootLayout.tsx`.

`NavigationBar.setStyle` runs in an effect on the color scheme, with the resolved content value and
not `auto`. `auto` reads the `Appearance` cache, which the native override updates on a posted
runnable, so switching back to the system scheme can resolve from a stale value. The explicit value
follows the rendered scheme.

Not the `<NavigationBar />` component: its cleanup calls `setHidden` when the stack empties, which
can be after the activity is gone, and it discards the promise that rejects. The effect shares the
same activity lookup and also discards its promise, but runs from a mounted tree.

Theme attributes cannot replace it. `android:windowLightNavigationBar` as a day night `@bool` was
tried and reverted: the theme resolves at window creation and `uiMode` sits in `configChanges`, so
an appearance switch never recreates the activity. On a Galaxy S9, dark by app setting left the bar
light, cold start included. It only followed the window context `uiMode`, which RN already initializes in
`enableEdgeToEdge`.

Also rejected: the config plugin `style` prop, a literal value; `react-native-screens`, its
`navigationBarColor` is deprecated with no effect since SDK 35.

The plugin entry stays for `enforceContrast`, the os scrim behind the buttons.
