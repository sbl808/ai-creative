import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_DICTIONARIES,
  SUPPORTED_LOCALES,
  normalizeLocale
} from './index.js';

function safeInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Return browser-side i18n bootstrap JavaScript for insertion into an HTML
 * script block. This does not read/write storage or rewrite page content.
 */
export function i18nRuntimeScript(initialLocale = DEFAULT_LOCALE) {
  const config = safeInlineJson({
    defaultLocale: DEFAULT_LOCALE,
    fallbackLocale: FALLBACK_LOCALE,
    supportedLocales: SUPPORTED_LOCALES,
    dictionaries: LOCALE_DICTIONARIES
  });
  const locale = safeInlineJson(normalizeLocale(initialLocale));

  return [
    '(function () {',
    '  var config = ' + config + ';',
    '  var locale = ' + locale + ';',
    '  function normalize(value) {',
    '    var candidate = String(value || config.defaultLocale).trim().replace(/_/g, "-").toLowerCase();',
    '    if (candidate === "my" || candidate === "my-mm") return "my";',
    '    if (candidate === "zh" || candidate === "zh-cn") return "zh-CN";',
    '    if (candidate === "en" || candidate === "en-us" || candidate === "en-gb") return "en";',
    '    return config.defaultLocale;',
    '  }',
    '  function translate(key, params) {',
    '    var name = String(key == null ? "" : key);',
    '    if (!name) return "";',
    '    var active = config.dictionaries[locale] || {};',
    '    var fallback = config.dictionaries[config.fallbackLocale] || {};',
    '    var template = Object.prototype.hasOwnProperty.call(active, name)',
    '      ? active[name]',
    '      : Object.prototype.hasOwnProperty.call(fallback, name) ? fallback[name] : name;',
    '    var values = params && typeof params === "object" ? params : {};',
    '    return String(template).replace(/\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*\\}\\}/g, function (match, keyName) {',
    '      return Object.prototype.hasOwnProperty.call(values, keyName) ? String(values[keyName]) : match;',
    '    });',
    '  }',
    '  function applyDOM(root) {',
    '    if (typeof document === "undefined") return 0;',
    '    var target = root || document;',
    '    var selector = "[data-i18n], [data-i18n-aria-label], [data-i18n-title], [data-i18n-placeholder]";',
    '    var nodes = [];',
    '    if (target && typeof target.matches === "function" && target.matches(selector)) nodes.push(target);',
    '    if (target && typeof target.querySelectorAll === "function") {',
    '      var found = target.querySelectorAll(selector);',
    '      for (var i = 0; i < found.length; i++) nodes.push(found[i]);',
    '    }',
    '    nodes.forEach(function (node) {',
    '      var key = node.getAttribute("data-i18n");',
    '      if (key) node.textContent = translate(key);',
    '      ["aria-label", "title", "placeholder"].forEach(function (attribute) {',
    '        var attrKey = node.getAttribute("data-i18n-" + attribute);',
    '        if (attrKey) node.setAttribute(attribute, translate(attrKey));',
    '      });',
    '    });',
    '    return nodes.length;',
    '  }',
    '  function setLocale(value) {',
    '    locale = normalize(value);',
    '    if (typeof document !== "undefined" && document.documentElement) {',
    '      document.documentElement.lang = locale;',
    '      applyDOM();',
    '    }',
    '    return locale;',
    '  }'
    '  if (typeof window !== "undefined") {',
    '    window.AICS_I18N = Object.freeze({',
    '      t: translate,',
    '      applyDOM: applyDOM,',
    '      setLocale: setLocale,',
    '      getLocale: function () { return locale; },',
    '      getSupportedLocales: function () { return config.supportedLocales.slice(); }',
    '    });',
    '  }',
    '  if (typeof document !== "undefined" && document.documentElement) { document.documentElement.lang = locale; applyDOM(); }',
    '})();'
  ].join('\n');
}
