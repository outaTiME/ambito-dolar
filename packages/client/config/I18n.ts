// @ts-nocheck
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

import Settings from '@/config/settings';

const i18n = new I18n({
  es: {
    // general
    accept: 'Aceptar',
    cancel: 'Cancelar',
    done: 'Listo',
    not_now: 'Ahora no',
    customize: 'Personalizar',
    website: 'Sitio web',
    no_available_rates: 'Sin cotizaciones disponibles.',
    no_available_stats: 'Sin métricas disponibles.',
    // still_loading: 'Conectividad limitada, la carga se reanudará automáticamente.',
    // still_loading: 'Las cotizaciones se mostrarán en cuanto se restablezca tu conexión.',
    still_loading:
      'Conectividad limitada, verás las cotizaciones cuando se recupere la conexión.',
    developer: 'Desarrollador',
    generic_error: 'Imposible completar la operación seleccionada.',
    rates_updated: '􀁣 Actualizado',
    // rate detail
    detail: 'Detalle',
    one_week: `${Settings.MAX_NUMBER_OF_STATS}D`,
    one_month: '1M',
    three_months: '3M',
    six_months: '6M',
    year: 'Año',
    one_year: '1A',
    show_detail: 'Ver detalle',
    day_summary: 'Resumen de jornada',
    variation: 'Variación',
    spreads: 'Brechas',
    previous_close: 'Cierre anterior',
    'all-time_high': 'Máximo histórico',
    source: 'Fuente',
    detail_loading_error:
      'Imposible obtener las cotizaciones para el periodo seleccionado.',
    // conversion
    conversion: 'Conversor',
    currency: 'Divisa',
    peso: 'Peso',
    // currency: 'USD/EUR/BRL',
    // peso: 'ARS',
    buy: 'Compra',
    average: 'Promedio',
    sell: 'Venta',
    // settings
    settings: 'Ajustes',
    share_message: `Te recomiendo descargar %{appName}, es la app que uso siempre para seguir el mercado cambiario en la Argentina de forma simple, elegante y efectiva. ¡Está buenísima! %{websiteUrl}`,
    opts_general: 'General',
    opts_general_note:
      'Las cotizaciones se actualizarán automáticamente durante la jornada cambiaria. Última actualización: %{lastUpdate}',
    opts_support: 'Soporte y difusión',
    opts_support_note:
      'Tu aporte es fundamental para el mantenimiento y desarrollo continuo de esta aplicación.',
    send_app_feedback: 'Enviar comentarios',
    leave_app_review: 'Dejar una reseña',
    share: 'Compartir',
    donate: 'Donar',
    donate_choose_title: 'Elegí tu aporte',
    donate_modal_note:
      'Elegí tu aporte y acompañá el mantenimiento y desarrollo continuo de esta aplicación.',
    donate_product_small_contribution: 'Pequeño',
    donate_product_medium_contribution: 'Mediano',
    donate_product_large_contribution: 'Grande',
    donate_unavailable:
      'No se pudieron cargar las donaciones, verificá tu conexión e intentá nuevamente.',
    installation_id: 'ID',
    // notifications
    notifications: 'Notificaciones',
    allow_permissions:
      'Tenés que permitir las notificaciones para poder configurar este módulo.',
    allow: 'Permitir',
    allow_notifications: 'Permitir notificaciones',
    notification_open_note:
      'Recibirás una notificación cuando abra la jornada cambiaria.',
    notification_close_note:
      'Recibirás una notificación cuando cierre la jornada cambiaria.',
    notification_variation_note:
      'Recibirás una notificación cuando varíe alguna cotización durante la jornada cambiaria.',
    // advanced notifications
    opts_rates: 'Cotizaciones',
    notification_choose_rates_note:
      'Elegí las cotizaciones que querés incluir en esta notificación.',
    // statistics
    statistics: 'Estadísticas',
    opts_app: 'Aplicación',
    // app_installation_time: 'Fecha de instalación',
    app_installation_time: 'Instalación',
    app_last_review: 'Reseña',
    app_usages: 'Usos',
    app_days_used: 'Días de uso',
    app_avg_daily_opens: 'Promedio diario',
    app_conversions: 'Conversiones',
    app_shared_rates: 'Capturas',
    app_donations: 'Donaciones',
    app_donations_count: 'Cantidad',
    app_donations_amount: 'Monto total',
    app_last_donation: 'Última',
    app_downloaded_rates: 'Actualizaciones',
    app_downloaded_historical_rates: 'Históricos',
    app_detailed_rates: 'Detalles',
    // about
    about: 'Acerca de',
    // appearance
    appearance: 'Apariencia',
    opts_appearance: 'Tema',
    system_appearance: 'Sistema',
    light_appearance: 'Claro',
    dark_appearance: 'Oscuro',
    // custom rates
    customize_rates: 'Cotizaciones',
    edit: 'Editar',
    customize_rates_note:
      'Podés ajustar el orden manteniendo presionado el selector lateral y arrastrando.',
    rate_order: 'Orden',
    default_rate_order: 'Predeterminado',
    name_rate_order: 'Nombre',
    price_rate_order: 'Valor',
    change_rate_order: 'Variación',
    update_rate_order: 'Actualización',
    custom_rate_order: 'Manual',
    select_rates: 'Seleccionar',
    rate_order_and_display: 'Orden y visualización',
    reset: 'Restablecer',
    // no_selected_rates: 'Agregá las cotizaciones que deseas visualizar.',
    no_selected_rates: 'No se han seleccionado cotizaciones a visualizar.',
    // widgets
    show_toast: 'Mostrar actualización',
  },
});

i18n.defaultLocale = 'es';
i18n.enableFallback = true;
i18n.locale = Localization.getLocales()?.[0]?.languageTag;

export default i18n;
