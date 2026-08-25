package im.outa.ambitodolar.widgets

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

// one screen for every widget, which one comes from the id the launcher passes
// sections with their values, every piece taken from the framework, see AGENTS
class WidgetConfigActivity : AppCompatActivity() {
  private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
  private lateinit var provider: WidgetProvider
  // picking writes here and only Listo persists, so backing out of a widget being reconfigured
  // leaves it exactly as it was, which is what the canceled result promises
  private lateinit var rateTypes: MutableList<String>
  private var valueType = WidgetConfig.DEFAULT_VALUE
  // the launcher can recreate this activity, on a rotation for one, and a dialog held only by a
  // local would stay attached to the destroyed one
  private var dialog: AlertDialog? = null
  private var picker: AlertDialog? = null
  // the rows are updated in place, so picking never rebuilds the dialog under the user
  private val rateRows = mutableListOf<TextView>()
  private var valueRow: TextView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // the launcher drops a freshly added widget unless the result says otherwise, so back cancels
    setResult(RESULT_CANCELED)
    widgetId =
      intent.getIntExtra(
        AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID,
      )
    val info = AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId)
    val target = Widgets.byName(info?.provider?.className)
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID || target == null) {
      finish()
      return
    }
    provider = target
    rateTypes = provider.rateTypes(this, widgetId).toMutableList()
    valueType = WidgetConfig.valueType(this, widgetId)
    // a rotation mid pick would otherwise read the stored values back and drop the selection
    savedInstanceState?.getStringArrayList(STATE_RATES)?.let { rateTypes = it.toMutableList() }
    savedInstanceState?.getString(STATE_VALUE)?.let { valueType = it }
    show()
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
      outState.putStringArrayList(STATE_RATES, ArrayList(rateTypes))
      outState.putString(STATE_VALUE, valueType)
    }
  }

  override fun onDestroy() {
    picker?.dismiss()
    picker = null
    dialog?.dismiss()
    dialog = null
    super.onDestroy()
  }

  private fun show() {
    val view = layoutInflater.inflate(R.layout.widget_config_form, null)
    val form = view.findViewById<LinearLayout>(R.id.widget_config_form)
    header(form, if (rateTypes.size > 1) R.string.widget_config_rates else R.string.widget_config_rate)
    rateTypes.indices.forEach { rateRow(form, it) }
    if (provider.hasValueType) {
      header(form, R.string.widget_config_value)
      valueRow = row(form, Format.valueLabel(valueType)) { showValuePicker() }
    }
    dialog = AlertDialog.Builder(this)
      .setTitle(provider.label)
      .setView(view)
      .setPositiveButton(R.string.widget_config_done) { _, _ -> confirm() }
      .setOnCancelListener { finish() }
      .show()
  }

  private fun header(form: LinearLayout, title: Int) {
    val view = inflate(R.layout.widget_config_header, form) as TextView
    view.setText(title)
    form.addView(view)
  }

  private fun rateRow(form: LinearLayout, slot: Int) {
    rateRows.add(row(form, Format.rateTitle(rateTypes[slot])) { showRatePicker(slot) })
  }

  private fun row(form: LinearLayout, value: String, open: () -> Unit): TextView {
    val view = inflate(R.layout.widget_config_row, form) as TextView
    view.text = value
    view.setOnClickListener { open() }
    form.addView(view)
    return view
  }

  private fun showRatePicker(slot: Int) {
    showPicker(
      R.string.widget_config_rate,
      Format.RATE_TYPES.map { it.second },
      Format.RATE_TYPES.indexOfFirst { it.first == rateTypes[slot] },
    ) { which ->
      val chosen = Format.RATE_TYPES[which].first
      // taking a rate another slot holds swaps them, so a widget never shows the same one twice
      val holder = rateTypes.indexOf(chosen)
      if (holder >= 0 && holder != slot) {
        rateTypes[holder] = rateTypes[slot]
      }
      rateTypes[slot] = chosen
      rateRows.forEachIndexed { index, view -> view.text = Format.rateTitle(rateTypes[index]) }
    }
  }

  private fun showValuePicker() {
    showPicker(
      R.string.widget_config_value,
      VALUES.map { Format.valueLabel(it) },
      VALUES.indexOf(valueType),
    ) { which ->
      valueType = VALUES[which]
      valueRow?.text = Format.valueLabel(valueType)
    }
  }

  private fun showPicker(title: Int, labels: List<String>, checked: Int, pick: (Int) -> Unit) {
    // held only so onDestroy can close it if the activity leaves with it open, and let go the
    // moment it closes, so the field never names a dialog that is already gone
    picker =
      AlertDialog.Builder(this)
        .setTitle(title)
        .setSingleChoiceItems(labels.toTypedArray(), checked) { open, which ->
          pick(which)
          open.dismiss()
        }
        .setOnDismissListener { picker = null }
        .show()
  }

  private fun inflate(layout: Int, parent: ViewGroup) =
    layoutInflater.inflate(layout, parent, false)

  private fun confirm() {
    // the id was checked when this opened, and the widget can be gone by now: writing then would
    // leave preferences nobody owns and ask for a redraw of something that is not there
    if (AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId) == null) {
      finish()
      return
    }
    rateTypes.forEachIndexed { slot, type -> WidgetConfig.setRateType(this, widgetId, slot, type) }
    if (provider.hasValueType) {
      WidgetConfig.setValueType(this, widgetId, valueType)
    }
    provider.refresh(this, intArrayOf(widgetId), "config")
    setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
    finish()
  }

  companion object {
    private const val STATE_RATES = "rate_types"
    private const val STATE_VALUE = "value_type"
    private val VALUES = listOf("buy", "average", "sell")
  }
}
