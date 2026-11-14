import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_DICTIONARIES,
  SUPPORTED_LOCALES,
  createTranslator,
  normalizeLocale
} from '../worker/src/frontend/i18n/index.js';
import { i18nRuntimeScript } from '../worker/src/frontend/i18n/runtime.js';
import { LOGIN_HTML } from '../worker/src/frontend/login.js';

function testLocaleConfiguration() {
  assert.equal(DEFAULT_LOCALE, 'zh-CN');
  assert.equal(FALLBACK_LOCALE, 'my');
  assert.deepEqual(SUPPORTED_LOCALES, ['my', 'zh-CN', 'en']);
  assert.equal(normalizeLocale('zh'), 'zh-CN');
  assert.equal(normalizeLocale('zh_CN'), 'zh-CN');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('my-MM'), 'my');
  assert.equal(normalizeLocale('unsupported-locale'), 'zh-CN');
}

function testDictionaryParity() {
  const keys = Object.keys(LOCALE_DICTIONARIES.my).sort();
  for (const locale of SUPPORTED_LOCALES) {
    const dictionary = LOCALE_DICTIONARIES[locale];
    assert.ok(dictionary, 'dictionary missing for ' + locale);
    assert.deepEqual(Object.keys(dictionary).sort(), keys, 'dictionary keys differ for ' + locale);
    for (const key of keys) {
      assert.equal(typeof dictionary[key], 'string', locale + ': ' + key + ' must be text');
      assert.ok(dictionary[key].trim(), locale + ': ' + key + ' must not be empty');
    }
  }
}


function testLoginLocalizationContract() {
  const authKeys = [
    'auth.welcome', 'auth.signin.subtitle', 'auth.google', 'auth.or',
    'auth.email', 'auth.password', 'auth.password.confirm', 'auth.password.show',
    'auth.password.hide', 'auth.password.showConfirm', 'auth.forgot', 'auth.signin', 'auth.signup',
    'auth.noAccount', 'auth.createAccount', 'auth.loading', 'auth.session.expired',
    'auth.error.email', 'auth.error.passwordRequired', 'auth.error.passwordLength',
    'auth.error.passwordMismatch', 'auth.error.signin', 'auth.error.signup',
    'auth.error.network', 'auth.forgot.help', 'auth.welcome.success',
    'auth.redirecting', 'auth.signup.title', 'auth.signup.subtitle',
    'auth.signup.success'
  ];
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of authKeys) {
      assert.ok(LOCALE_DICTIONARIES[locale][key], locale + ': missing ' + key);
    }
  }
  assert.ok(LOGIN_HTML.includes('${i18nRuntimeScript()}'), 'login page loads shared i18n runtime');
  assert.ok(LOGIN_HTML.includes('AICS_APP_PREFERENCES.getLanguage()'), 'login reads browser-global language preference');
  assert.ok(LOGIN_HTML.includes('AICS_I18N.setLocale(locale)'), 'login applies saved app language');
  assert.ok(LOGIN_HTML.includes('data-i18n="auth.email"'), 'login uses explicit translation markers');
  assert.ok(LOGIN_HTML.includes('data-i18n-aria-label="auth.password.showConfirm"'), 'password visibility control has a localized accessible label');
  assert.ok(!LOGIN_HTML.includes('btn.innerHTML'), 'login status labels do not inject translated text as HTML');
  assert.ok(LOGIN_HTML.includes("fetch('/api/auth/signin'"), 'signin endpoint remains unchanged');
  assert.ok(LOGIN_HTML.includes("fetch('/api/auth/signup'"), 'signup endpoint remains unchanged');
  assert.ok(LOGIN_HTML.includes('JSON.stringify({ email: email, password: pass })'), 'signup payload remains email and password only');
}

function testTranslatorFallbackAndInterpolation() {
  const translateEnglish = createTranslator('en');
  assert.equal(translateEnglish('common.action.save'), 'Save');
  assert.equal(translateEnglish('not.registered.key'), 'not.registered.key');

  const translateWithFallback = createTranslator('en', {
    en: { 'test.present': 'Hello {{name}}' },
    my: { 'test.fallback': 'မင်္ဂလာပါ' }
  });
  assert.equal(translateWithFallback('test.fallback'), 'မင်္ဂလာပါ');
  assert.equal(translateWithFallback('test.present', { name: 'AICS' }), 'Hello AICS');
  assert.equal(translateWithFallback('test.present', {}), 'Hello {{name}}');
}

function testBrowserRuntime() {
  const window = {};
  const label = {
    textContent: 'အဟောင်း',
    attributes: { 'data-i18n': 'nav.home' },
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  const document = { documentElement: { lang: 'my' }, querySelectorAll() { return [label]; } };
  const script = i18nRuntimeScript();

  assert.equal(script.includes('</script'), false, 'runtime must not contain a closing script tag');
  vm.runInNewContext(script, { window, document });

  assert.equal(window.AICS_I18N.getLocale(), 'zh-CN');
  assert.equal(label.textContent, '首页', 'explicit static labels use the default locale');
  assert.equal(window.AICS_I18N.t('common.action.save'), '保存');
  assert.deepEqual(Array.from(window.AICS_I18N.getSupportedLocales()), ['my', 'zh-CN', 'en']);
  assert.equal(window.AICS_I18N.setLocale('my'), 'my');
  assert.equal(label.textContent, 'ပင်မ', 'explicit static labels update when locale changes');
  assert.equal(document.documentElement.lang, 'my');
  assert.equal(window.AICS_I18N.t('common.action.save'), 'သိမ်းပါ');
  assert.equal(window.AICS_I18N.setLocale('en-US'), 'en');
  assert.equal(window.AICS_I18N.t('common.action.save'), 'Save');
}

testLocaleConfiguration();
testDictionaryParity();
testTranslatorFallbackAndInterpolation();
testLoginLocalizationContract();
testBrowserRuntime();

console.log('App i18n Core tests passed.');
