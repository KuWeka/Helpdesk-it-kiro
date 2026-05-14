import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, type Locale } from './config';

export default getRequestConfig(async () => {
  // In this MVP, locale is determined by user preference (bahasa field in DB).
  // Since we're using provider-based i18n (not route-based), we default to 'id'
  // and let the client-side provider handle locale switching based on user preference.
  const locale: Locale = defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
