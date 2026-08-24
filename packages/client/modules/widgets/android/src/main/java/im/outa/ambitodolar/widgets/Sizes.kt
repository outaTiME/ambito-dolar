package im.outa.ambitodolar.widgets

// one role, one size, across every widget. The numbers are the ios point sizes of RateWidgets
// scaled by a single factor, which is the one the card was measured at against the iphone, glyph
// height over card width, a ratio that does not depend on screen or density.
// Before this the card sat at 1.05 and the list had drifted to 1.10, which is why the same date
// came out at 12.1 on one widget and 12.7 on the other. A new widget picks its roles from here
internal object Sizes {
  private const val IOS = 1.05f

  // the card, which the rate and the spread share
  const val TITLE = 20 * IOS

  const val DETAIL = 14 * IOS

  const val CHANGE = 14 * IOS

  const val VALUE = 26 * IOS

  // one row of the list
  const val ROW_NAME = 14 * IOS

  const val ROW_VALUE = 16 * IOS

  const val ROW_CHANGE = 11 * IOS

  // the two that ios keeps identical on every widget, and that had drifted apart here
  const val DATE = 11 * IOS

  const val EMPTY = 14 * IOS
}
