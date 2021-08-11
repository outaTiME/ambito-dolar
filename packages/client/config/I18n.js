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
    still_loading:
      'Conectividad limitada, la carga se reanudará automáticamente...',
    update_app:
      'Tienes que actualizar esta aplicación a una versión más reciente.',
    update: 'Actualizar',
    remind_me_later: 'Más tarde',
    developer: 'Desarrollador',
    // rate detail
    detail: 'Detalle',
    week: 'Semana',
    month: 'Mes',
    year: 'Año',
    show_detail: 'Mostrar detalle',
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
    opts_general_note:
      'Las cotizaciones se actualizarán automáticamente durante la jornada cambiaria. Última recepción: %{lastUpdate}',
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
    // advanced notifications
    notification_choose_rates_note:
      'Elige las cotizaciones que deseas incluir para esta notificación.',
    // statistics
    statistics: 'Estadísticas',
    opts_information: 'Información',
    app_installation_time: 'Fecha de instalación',
    app_days_used: 'Días de uso',
    // about
    about: 'Acerca de',
  },
};
i18n.locale = Localization.locale;

export default i18n;
