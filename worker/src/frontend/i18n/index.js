import my from './locales/my.js';
import zhCN from './locales/zh-CN.js';
import en from './locales/en.js';

export const DEFAULT_LOCALE = 'zh-CN';
export const FALLBACK_LOCALE = 'my';
export const SUPPORTED_LOCALES = Object.freeze(['my', 'zh-CN', 'en']);

export const LOCALE_DICTIONARIES = Object.freeze({
  my,
  'zh-CN': zhCN,
  en
});

const LOCALE_ALIASES = Object.freeze({
  my: 'my',
  'my-mm': 'my',
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en'
});

/**
 * Normalize browser/user locale input to one of the supported application locales.
 * Unknown values use Simplified Chinese, the selected application default.
 */
export function normalizeLocale(value) {
  const candidate = String(value || DEFAULT_LOCALE)
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

  return LOCALE_ALIASES[candidate] || DEFAULT_LOCALE;
}

/**
 * Create a plain-text translator.
 *
 * Returned strings must be assigned as text (for example, with textContent),
 * never interpolated into innerHTML. User-created content is outside this API.
 */
export function createTranslator(locale, dictionaries = LOCALE_DICTIONARIES) {
  const activeLocale = normalizeLocale(locale);
  const activeDictionary = dictionaries[activeLocale] || {};
  const fallbackDictionary = dictionaries[FALLBACK_LOCALE] || {};

  return function translate(key, params) {
    const translationKey = String(key == null ? '' : key);
    if (!translationKey) return '';

    const template = Object.prototype.hasOwnProperty.call(activeDictionary, translationKey)
      ? activeDictionary[translationKey]
      : Object.prototype.hasOwnProperty.call(fallbackDictionary, translationKey)
        ? fallbackDictionary[translationKey]
        : translationKey;

    const values = params && typeof params === 'object' ? params : {};
    return String(template).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, name) => {
      return Object.prototype.hasOwnProperty.call(values, name)
        ? String(values[name])
        : match;
    });
  };
}
