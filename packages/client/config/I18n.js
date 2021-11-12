import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

i18n.defaultLocale = 'es';
i18n.fallbacks = true;
i18n.translations = {
  es: {
    // general
    accept: 'Aceptar',
    cancel: 'Cancelar',
    customize: 'Personalizar',
    no_available_rates: 'Sin cotizaciones disponibles.',
    rates_loading_error: 'Imposible obtener las cotizaciones.',
    // still_loading: 'Conectividad limitada, aguarde un momento...',
    still_loading: 'Aguarde un momento...',
    update_app:
      'Tienes que actualizar esta aplicación a una versión más reciente.',
    update: 'Actualizar',
    remind_me_later: 'Más tarde',
    retry: 'Reintentar',
    developer: 'Desarrollador',
    text_copied: 'Texto copiado al portapapeles',
    // rate detail
    detail: 'Detalle',
    week: 'Semana',
    month: 'Mes',
    year: 'Año',
    show_detail: 'Ver detalle',
    day_summary: 'Resumen de jornada',
    variation: 'Variación',
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
    app_version: 'Versión',
    device: 'Dispositivo',
    share_message: `Te recomiendo descargar %{appName}, es mi aplicación preferida para conocer las distintas cotizaciones del dólar en la Argentina. %{websiteUrl}`,
    opts_general: 'General',
    opts_general_note: 'Última actualización de cotizaciones: %{lastUpdate}',
    device_identifier: 'Identificador',
    opts_statistics: 'Estadísticas',
    opts_support: 'Soporte y difusión',
    send_app_feedback: 'Enviar comentarios',
    leave_app_review: 'Dejar una reseña',
    share: 'Compartir',
    // notifications
    notifications: 'Notificaciones',
    allow_permissions:
      'Tienes que permitir el acceso a las notificaciones para poder configurar este módulo.',
    allow: 'Permitir',
    allow_notifications: 'Permitir notificaciones',
    notification_open_note:
      'Recibirás una notificación cuando abra la jornada cambiaria.',
    notification_close_note:
      'Recibirás una notificación cuando cierre la jornada cambiaria.',
    notification_variation_note:
      'Recibirás una notificación cuando varíe alguna cotización durante la jornada cambiaria.',
    notification_id: 'ID de notificación',
    // advanced notifications
    opts_rates: 'Cotizaciones',
    notification_choose_rates_note:
      'Elige las cotizaciones que deseas incluir en esta notificación.',
    // statistics
    statistics: 'Estadísticas',
    opts_app: 'Aplicación',
    app_installation_time: 'Fecha de instalación',
    app_days_used: 'Días de uso',
    app_conversions: 'Conversiones',
    // about
    about: 'Acerca de',
    // appearance
    appearance: 'Apariencia',
    opts_appearance: 'Tema',
    system_appearance: 'Sistema',
    light_appearance: 'Claro',
    dark_appearance: 'Oscuro',
  },
};
i18n.locale = Localization.locale;

export default i18n;
