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
import { PRELOGIN_HOME_HTML } from '../worker/src/frontend/prelogin-home.js';
import { APP_HTML } from '../worker/src/frontend/home.js';

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
  assert.ok(LOGIN_HTML.includes('window.AICS_I18N = Object.freeze'), 'login page loads shared i18n runtime');
  assert.ok(LOGIN_HTML.includes('preferences.getLanguage()'), 'login reads browser-global language preference');
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

function testPublicHomeLocalizationBootstrap() {
  assert.ok(PRELOGIN_HOME_HTML.includes('window.AICS_I18N = Object.freeze'), 'public home loads the shared i18n runtime');
  assert.ok(PRELOGIN_HOME_HTML.includes('window.AICS_APP_PREFERENCES'), 'public home loads shared app preferences');
  assert.ok(PRELOGIN_HOME_HTML.includes('preferences.getLanguage()'), 'public home reads the saved browser language');
  assert.ok(PRELOGIN_HOME_HTML.includes('AICS_I18N.setLocale(locale)'), 'public home applies the saved language');
  assert.ok(PRELOGIN_HOME_HTML.includes('app_preferences'), 'public home reuses the existing app_preferences store');
  assert.ok(PRELOGIN_HOME_HTML.includes('Keep the shared i18n default locale'), 'public home keeps the default locale if IndexedDB fails');
  assert.ok(PRELOGIN_HOME_HTML.includes('<html lang="my"'), 'public home source language is normalized by the shared runtime on load');
  assert.ok(!PRELOGIN_HOME_HTML.includes("localStorage.setItem('aics-language'"), 'public home does not store language in localStorage');
}


function testPublicHomeTranslationCoverage() {
  const publicHomeKeys = [
    'publicHome.meta.title', 'publicHome.meta.description', 'publicHome.language.label', 'publicHome.nav.studios', 'publicHome.nav.features',
    'publicHome.nav.about', 'publicHome.auth.login', 'publicHome.auth.start',
    'publicHome.hero.eyebrow', 'publicHome.hero.title.prefix',
    'publicHome.hero.title.highlight', 'publicHome.hero.title.suffix',
    'publicHome.hero.description', 'publicHome.hero.cta.start',
    'publicHome.hero.cta.studios', 'publicHome.hero.trust',
    'publicHome.preview.label', 'publicHome.preview.status',
    'publicHome.preview.prompt.title', 'publicHome.preview.prompt.description',
    'publicHome.preview.story', 'publicHome.preview.image',
    'publicHome.preview.voice', 'publicHome.preview.content',
    'publicHome.preview.floating', 'publicHome.studios.kicker',
    'publicHome.studios.title', 'publicHome.studios.description',
    'publicHome.studio.story', 'publicHome.studio.content',
    'publicHome.studio.short', 'publicHome.studio.image',
    'publicHome.studio.voice', 'publicHome.studio.shop',
    'publicHome.cta.title', 'publicHome.cta.description',
    'publicHome.cta.button', 'publicHome.footer.tagline',
    'publicHome.theme.toggle', 'publicHome.aria.home',
    'publicHome.aria.preview'
  ];
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of publicHomeKeys) {
      assert.ok(LOCALE_DICTIONARIES[locale][key], locale + ': missing ' + key);
    }
  }
  assert.ok(PRELOGIN_HOME_HTML.includes('id="publicLanguage"'), 'public home exposes a language selector');
  assert.ok(PRELOGIN_HOME_HTML.includes('preferences.setLanguage(nextLocale)'), 'language selector saves to browser app preferences');
  assert.ok(PRELOGIN_HOME_HTML.includes('AICS_I18N.setLocale(savedLocale)'), 'language selector applies the saved locale');
  assert.ok(PRELOGIN_HOME_HTML.includes('data-i18n="publicHome.hero.description"'), 'hero description uses an explicit translation marker');
  assert.ok(PRELOGIN_HOME_HTML.includes('data-i18n="publicHome.studio.shop"'), 'all six studio descriptions use translation markers');
  assert.ok(PRELOGIN_HOME_HTML.includes('data-i18n="publicHome.footer.tagline"'), 'footer uses an explicit translation marker');
  assert.ok(PRELOGIN_HOME_HTML.includes('href="/login"'), 'login navigation destination remains unchanged');
  assert.ok(PRELOGIN_HOME_HTML.includes('id="themeToggle"'), 'theme toggle remains available');
  assert.ok(PRELOGIN_HOME_HTML.includes('data-i18n="publicHome.meta.title"'), 'document title uses an explicit translation marker');
  assert.ok(PRELOGIN_HOME_HTML.includes('data-i18n-content="publicHome.meta.description"'), 'meta description uses an explicit content marker');
  assert.ok(PRELOGIN_HOME_HTML.includes('flex-wrap:wrap;padding:10px 0'), 'mobile navigation controls wrap instead of forcing one horizontal row');
}

function testBrowserRuntime() {
  const window = {};
  const label = {
    textContent: 'အဟောင်း',
    attributes: { 'data-i18n': 'nav.home' },
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  const meta = {
    textContent: '',
    attributes: { 'data-i18n-content': 'publicHome.meta.description', content: 'old description' },
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  const document = { documentElement: { lang: 'my' }, querySelectorAll() { return [label, meta]; } };
  const script = i18nRuntimeScript();

  assert.equal(script.includes('</script'), false, 'runtime must not contain a closing script tag');
  vm.runInNewContext(script, { window, document });

  assert.equal(window.AICS_I18N.getLocale(), 'zh-CN');
  assert.equal(label.textContent, '首页', 'explicit static labels use the default locale');
  assert.equal(meta.attributes.content, LOCALE_DICTIONARIES['zh-CN']['publicHome.meta.description'], 'explicit content attributes use the default locale');
  assert.equal(window.AICS_I18N.t('common.action.save'), '保存');
  assert.deepEqual(Array.from(window.AICS_I18N.getSupportedLocales()), ['my', 'zh-CN', 'en']);
  assert.equal(window.AICS_I18N.setLocale('my'), 'my');
  assert.equal(label.textContent, 'ပင်မ', 'explicit static labels update when locale changes');
  assert.equal(meta.attributes.content, LOCALE_DICTIONARIES.my['publicHome.meta.description'], 'explicit content attributes update when locale changes');
  assert.equal(document.documentElement.lang, 'my');
  assert.equal(window.AICS_I18N.t('common.action.save'), 'သိမ်းပါ');
  assert.equal(window.AICS_I18N.setLocale('en-US'), 'en');
  assert.equal(window.AICS_I18N.t('common.action.save'), 'Save');
}



function testDashboardLocalizationContract() {
  const dashboardKeys = [
    'dashboard.greeting', 'dashboard.subtitle', 'dashboard.apiKey.button',
    'dashboard.banner.1', 'dashboard.banner.2', 'dashboard.banner.3',
    'dashboard.quickCreate.title',
    'dashboard.studio.story.title', 'dashboard.studio.content.title',
    'dashboard.studio.short.title', 'dashboard.studio.image.title',
    'dashboard.studio.voice.title', 'dashboard.studio.shop.title',
    'dashboard.studio.story.description.1', 'dashboard.studio.story.description.2',
    'dashboard.studio.content.description.1', 'dashboard.studio.content.description.2',
    'dashboard.studio.short.description.1', 'dashboard.studio.short.description.2',
    'dashboard.studio.image.description.1', 'dashboard.studio.image.description.2',
    'dashboard.studio.voice.description.1', 'dashboard.studio.voice.description.2',
    'dashboard.studio.shop.description.1', 'dashboard.studio.shop.description.2',
    'dashboard.recent.title', 'dashboard.recent.viewAll',
    'dashboard.aria.viewAll', 'dashboard.aria.studio.story',
    'dashboard.aria.studio.content', 'dashboard.aria.studio.short',
    'dashboard.aria.studio.image', 'dashboard.aria.studio.voice',
    'dashboard.aria.studio.shop', 'dashboard.loading',
    'dashboard.empty.title', 'dashboard.empty.description',
    'dashboard.project.open', 'dashboard.storage.error',
    'dashboard.login.required', 'dashboard.login.link',
    'dashboard.apiKey.modal.close', 'dashboard.apiKey.modal.title',
    'dashboard.apiKey.modal.subtitle', 'dashboard.apiKey.step.1',
    'dashboard.apiKey.step.2', 'dashboard.apiKey.step.3',
    'dashboard.apiKey.step.4', 'dashboard.apiKey.step.5',
    'dashboard.apiKey.action.create', 'dashboard.apiKey.action.settings'
  ];

  for (const locale of SUPPORTED_LOCALES) {
    for (const key of dashboardKeys) {
      assert.ok(LOCALE_DICTIONARIES[locale][key], locale + ': missing ' + key);
    }
  }

  const markedKeys = Array.from(APP_HTML.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g), match => match[1]);
  assert.ok(markedKeys.length >= 35, 'dashboard exposes explicit translation markers');
  for (const key of markedKeys) {
    assert.ok(LOCALE_DICTIONARIES.my[key], 'dashboard marker has a dictionary entry: ' + key);
  }

  assert.ok(APP_HTML.includes('AICS_I18N.applyDOM(document.querySelector(\'.main-content\'))'), 'login-required state is localized after dynamic rendering');
  assert.ok(APP_HTML.includes('AICS_I18N.applyDOM(area)'), 'recent-project dynamic states are localized after rendering');
  assert.ok(APP_HTML.includes('AICS_CREATIONS.list()'), 'recent creations are read through the browser creation store');
  assert.ok(APP_HTML.includes('escapeHtml(c.title||\'(Untitled)\')'), 'user-created project titles are escaped before rendering');
  assert.ok(APP_HTML.includes('homeT(BANNER_MESSAGE_KEYS[bannerIndex])'), 'rotating banner uses the shared translator');
  assert.ok(APP_HTML.includes('homeT(list[index])'), 'rotating studio descriptions use the shared translator');
}


testDashboardLocalizationContract();\ntestLocaleConfiguration();
testDictionaryParity();
testTranslatorFallbackAndInterpolation();
testLoginLocalizationContract();
testPublicHomeLocalizationBootstrap();
testPublicHomeTranslationCoverage();
testBrowserRuntime();

console.log('App i18n Core tests passed.');
