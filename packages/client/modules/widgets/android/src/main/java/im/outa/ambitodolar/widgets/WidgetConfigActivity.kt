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
class WidgetConfigActivity : AppCompatActivity() {
  private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
  private lateinit var provider: WidgetProvider
  // only Listo persists, so backing out leaves the widget as it was
  private lateinit var rateTypes: MutableList<String>
  private var valueType = WidgetConfig.DEFAULT_VALUE
  // held in fields so a recreated activity can dismiss them
  private var dialog: AlertDialog? = null
  private var picker: AlertDialog? = null
  // updated in place, so picking never rebuilds the dialog
  private val rateRows = mutableListOf<TextView>()
  private var valueRow: TextView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // back cancels, the launcher drops a freshly added widget unless the result says otherwise
    setResult(RESULT_CANCELED)
    widgetId =
      intent.getIntExtra(
        AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID,
      )
    val info = AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId)
    val target = Widgets.ALL.firstOrNull { it.javaClass.name == info?.provider?.className }
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID || target == null) {
      finish()
      return
    }
    provider = target
    rateTypes = provider.rateTypes(this, widgetId).toMutableList()
    valueType = WidgetConfig.valueType(this, widgetId)
    // a rotation mid pick keeps the selection
    savedInstanceState?.getStringArrayList(STATE_RATES)?.let { rateTypes = it.toMutableList() }
    savedInstanceState?.getString(STATE_VALUE)?.let { valueType = it }
    show()
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putStringArrayList(STATE_RATES, ArrayList(rateTypes))
    outState.putString(STATE_VALUE, valueType)
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
    header(form, if (rateTypes.size > 1) provider.configTitles.second else provider.configTitles.first)
    rateTypes.indices.forEach { slot ->
      rateRows.add(row(form, Format.rateTitle(rateTypes[slot])) { showRatePicker(slot) })
    }
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

  private fun row(form: LinearLayout, value: String, open: () -> Unit): TextView {
    val view = inflate(R.layout.widget_config_row, form) as TextView
    view.text = value
    view.setOnClickListener { open() }
    form.addView(view)
    return view
  }

  private fun showRatePicker(slot: Int) {
    val catalog = provider.catalog
    showPicker(
      provider.configTitles.first,
      catalog.map { it.second },
      catalog.indexOfFirst { it.first == rateTypes[slot] },
    ) { which ->
      val chosen = catalog[which].first
      // taking a rate another slot holds swaps them
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
    // released on dismiss so the field never names a closed dialog
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
