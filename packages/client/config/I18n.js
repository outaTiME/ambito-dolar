import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

i18n.defaultLocale = 'es';
i18n.fallbacks = true;
i18n.translations = {
  es: {
    customize: 'Personalizar',
    accept: 'Aceptar',
    no_available_rates: 'Sin cotizaciones disponibles.',
    still_loading:
      'Conectividad limitada, la carga se reanudará automáticamente.',
    // loading_error: 'Imposible obtener las cotizaciones.',
    detail_loading_error:
      'Imposible obtener las cotizaciones para el periodo seleccionado.',
    allow_permissions:
      'Tienes que permitir el acceso a las notificaciones para poder configurar este módulo.',
    update_app:
      'Tienes que actualizar esta aplicación a una versión más reciente.',
    update: 'Actualizar',
    remind_me_later: 'Más tarde',
    developer: 'Desarrollador',
  },
};
i18n.locale = Localization.locale;

export default i18n;
