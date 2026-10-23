package im.outa.ambitodolar.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import kotlin.math.ceil

// the launcher resolves only system typefaces, so the text is drawn here and travels as a bitmap
internal object TextBitmap {
  // two even lines for the empty text without asking the launcher for a width
  private const val WRAPPED_RATIO = 0.6f

  private const val WRAPPED_LINES = 2

  // room is a ceiling and not the slot width, a .lineLimit(1) Text that truncates without shrinking
  fun of(
    context: Context,
    text: String,
    sizeDp: Float,
    color: Int,
    wrap: Boolean = false,
    room: Int = 0,
  ): Bitmap {
    val paint =
      TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        typeface = context.resources.getFont(R.font.widget_firago_regular)
        textSize = sizeDp * context.resources.displayMetrics.density
      }
    val natural = paint.measureText(text)
    val width =
      when {
        wrap -> ceil(natural * WRAPPED_RATIO).toInt()
        room > 0 && natural > room -> room
        else -> ceil(natural).toInt()
      }.coerceAtLeast(1)
    val layout =
      StaticLayout.Builder.obtain(text, 0, text.length, paint, width)
        .setAlignment(if (wrap) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL)
        // the font box a TextView reserves, so every slot keeps its height
        .setIncludePad(true)
        .apply {
          // capped, a longer copy would otherwise run to a third line
          setMaxLines(if (wrap) WRAPPED_LINES else 1)
          setEllipsize(TextUtils.TruncateAt.END)
          setEllipsizedWidth(width)
        }
        .build()
    // the width the lines occupy, never past the room or an ellipsized line grows the slot back
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
    // the default tag is the physical density, which a changed display size would scale every slot by
    bitmap.density = context.resources.displayMetrics.densityDpi
    // centered lines sit against the layout width, a single line starts at zero and is not moved
    val canvas = Canvas(bitmap)
    if (wrap) {
      canvas.translate((used - width) / 2f, 0f)
    }
    layout.draw(canvas)
    return bitmap
  }
}
