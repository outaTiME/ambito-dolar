package im.outa.ambitodolar.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import kotlin.math.ceil

// the launcher inflates our layout in its own process and resolves only system typefaces there,
// so a font declared in the xml falls back without a word. Measured on four devices: it holds on
// one ui and fails on the pixel launcher, on motorola and on the emulator. Drawing the text here,
// in our process, is where the font does load, and is what every widget with its own font does.
// Only the glyphs travel as a bitmap, the card, its corners and the layout stay real views
internal object TextBitmap {
  // two even lines whatever the wording is, without asking the launcher for a width it reports
  // badly anyway. Only the empty text needs it, every value is one line by construction
  private const val WRAPPED_RATIO = 0.6f

  private const val WRAPPED_LINES = 2

  // the least a turn may take off, see the loop below
  private const val STEP = 0.0025f

  fun typeface(context: Context): Typeface = context.resources.getFont(R.font.widget_firago_regular)

  // a single line through StaticLayout draws what drawText would, which is why there is no
  // second path.
  // setIncludePad keeps the box a TextView reserves by default, top to bottom of the font and not
  // just ascent to descent, so a slot holds the height it had and the vertical rhythm stays put
  // room is a ceiling and not the width of the slot, which only the layout knows, and floor is
  // how far the size may give before the ellipsis takes over. Both come from ios: there a Text is
  // .lineLimit(1), so everything truncates, and only the name and the date of a list row carry
  // .minimumScaleFactor(0.9) and shrink first
  fun of(
    context: Context,
    text: String,
    sizeDp: Float,
    color: Int,
    wrap: Boolean = false,
    room: Int = 0,
    floor: Float = 1f,
  ): Bitmap {
    val paint =
      TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        this.typeface = typeface(context)
        textSize = sizeDp * context.resources.displayMetrics.density
      }
    val base = paint.textSize
    var natural = paint.measureText(text)
    // the shrinking phase, and only down to the floor: past it the ellipsis is the honest answer,
    // where scaling on and on turns a rate into an unreadable smudge that still claims to fit.
    // Every turn takes at least a STEP off, because the width of a text does not move smoothly
    // with its size: a paint with no subpixel rounds each glyph advance to a whole pixel, so the
    // ratio room / natural can ask for a size that measures exactly the same, and a loop that
    // only trusted that ratio would never come down. Measured on a galaxy s9, at a size a tenth
    // smaller the same name still reported the same width to the pixel
    var scale = 1f
    while (room > 0 && floor < 1f && natural > room && scale > floor) {
      scale = minOf(scale * room / natural, scale - STEP).coerceAtLeast(floor)
      paint.textSize = base * scale
      natural = paint.measureText(text)
    }
    val width =
      when {
        wrap -> ceil(natural * WRAPPED_RATIO).toInt()
        room > 0 && natural > room -> room
        else -> ceil(natural).toInt()
      }.coerceAtLeast(1)
    val layout =
      StaticLayout.Builder.obtain(text, 0, text.length, paint, width)
        .setAlignment(if (wrap) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL)
        .setIncludePad(true)
        .apply {
          // the empty text is the only one that wraps, every value is a single line, and both
          // are capped: the ratio below is a shape for the wording there is now, not a promise,
          // and a translation or a longer copy would have run to a third line unchecked
          setMaxLines(if (wrap) WRAPPED_LINES else 1)
          setEllipsize(TextUtils.TruncateAt.END)
          setEllipsizedWidth(width)
        }
        .build()
    // the bitmap takes the width the lines really occupy and not the one asked of the layout, so
    // a word longer than that width is not clipped and a shorter line does not pad the slot
    // never past the room, or an ellipsized line would report the width it wanted and the slot
    // would grow back to it, undoing the truncation
    val used =
      (0 until layout.lineCount).maxOf { layout.getLineWidth(it) }.let {
        if (wrap) it else it.coerceAtMost(width.toFloat())
      }
    val bitmap =
      Bitmap.createBitmap(
        ceil(used).toInt().coerceAtLeast(1),
        layout.height.coerceAtLeast(1),
        Bitmap.Config.ARGB_8888,
      )
    // centered wrapping positions its lines against the layout width, so the canvas keeps that
    // frame of reference and only the surplus on both sides is trimmed. A single line has no
    // surplus to trim, it already starts at zero, and translating it anyway shaved a fraction of
    // a pixel off its left edge on every slot of every widget
    val canvas = Canvas(bitmap)
    if (wrap) {
      canvas.translate((used - width) / 2f, 0f)
    }
    layout.draw(canvas)
    return bitmap
  }
}
