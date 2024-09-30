import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

import Settings from './settings';

const i18n = new I18n({
  es: {
    // general
    accept: 'Aceptar',
    cancel: 'Cancelar',
    search: 'Buscar',
    customize: 'Personalizar',
    no_available_rates: 'Sin cotizaciones disponibles.',
    no_available_stats: 'Sin métricas disponibles.',
    rates_loading_error: 'Imposible obtener las cotizaciones.',
    // still_loading: 'Conectividad limitada, aguarde un momento...',
    // still_loading: 'Aguarde un momento...',
    still_loading:
      'Conectividad limitada, la carga se reanudará automáticamente.',
    update_app:
      'Tenés que actualizar esta aplicación a una versión más reciente.',
    update: 'Actualizar',
    remind_me_later: 'Más tarde',
    retry: 'Reintentar',
    developer: 'Desarrollador',
    text_copied: 'Texto copiado al portapapeles',
    generic_error: 'Imposible completar la operación seleccionada.',
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
    dolar: 'Dólar',
    peso: 'Peso',
    buy: 'Compra',
    average: 'Promedio',
    sell: 'Venta',
    // settings
    settings: 'Ajustes',
    installation: 'Instalación',
    app_version: 'Versión',
    device: 'Dispositivo',
    share_message: `Te recomiendo descargar %{appName}, es la app que uso siempre para seguir el mercado cambiario en la Argentina de forma simple, elegante y efectiva. ¡Está buenísima! %{websiteUrl}`,
    opts_general: 'General',
    opts_general_note:
      'Las cotizaciones se actualizarán automáticamente durante la jornada cambiaria. Última actualización: %{lastUpdate}',
    device_identifier: 'Identificador',
    opts_statistics: 'Estadísticas',
    opts_support: 'Soporte y difusión',
    opts_support_note:
      'Tu aporte es fundamental para el mantenimiento y desarrollo continuo de esta aplicación.',
    send_app_feedback: 'Enviar comentarios',
    leave_app_review: 'Dejar una reseña',
    share: 'Compartir',
    donate: 'Donar',
    installation_id: 'ID',
    // donate: 'Contribuir',
    // donate: 'Hacer una donación',
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
    notification_id: 'ID',
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
    app_conversions: 'Conversiones',
    app_shared_rates: 'Capturas',
    app_donations: 'Donaciones',
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
    // no_selected_rates: 'Agregá las cotizaciones que deseas visualizar.',
    no_selected_rates: 'No se han seleccionado cotizaciones a visualizar.',
    // donate
    /* purchase_success: '¡Gracias por tu donación!',
    purchase_success_message:
      'Tu apoyo impulsa el desarrollo y mantenimiento continuo de la aplicación.', */
    // widgets
    rate_widget: 'Cotizaciones',
    list_rates_widget: 'Lista de cotizaciones',
  },
});

i18n.defaultLocale = 'es';
i18n.enableFallback = true;
i18n.locale = Localization.locale;

export default i18n;
