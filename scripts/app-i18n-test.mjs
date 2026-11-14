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
  const document = { documentElement: { lang: 'my' } };
  const script = i18nRuntimeScript();

  assert.equal(script.includes('</script'), false, 'runtime must not contain a closing script tag');
  vm.runInNewContext(script, { window, document });

  assert.equal(window.AICS_I18N.getLocale(), 'zh-CN');
  assert.equal(window.AICS_I18N.t('common.action.save'), '保存');
  assert.deepEqual(Array.from(window.AICS_I18N.getSupportedLocales()), ['my', 'zh-CN', 'en']);
  assert.equal(window.AICS_I18N.setLocale('my'), 'my');
  assert.equal(document.documentElement.lang, 'my');
  assert.equal(window.AICS_I18N.t('common.action.save'), 'သိမ်းပါ');
  assert.equal(window.AICS_I18N.setLocale('en-US'), 'en');
  assert.equal(window.AICS_I18N.t('common.action.save'), 'Save');
}

testLocaleConfiguration();
testDictionaryParity();
testTranslatorFallbackAndInterpolation();
testBrowserRuntime();

console.log('App i18n Core tests passed.');
