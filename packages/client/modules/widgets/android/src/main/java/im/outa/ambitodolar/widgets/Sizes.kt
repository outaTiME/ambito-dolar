package im.outa.ambitodolar.widgets

// one size per role, the ios point sizes times glyph height over card width measured against the iphone
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

  // identical on every ios widget
  const val DATE = 11 * IOS

  const val EMPTY = 14 * IOS
}
