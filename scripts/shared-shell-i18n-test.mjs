import assert from 'node:assert/strict';
import { renderSidebar, sidebarScript, renderStudioShell } from '../worker/src/frontend/shared.js';
import { AICS_TOAST_SCRIPT, AICS_CONFIRM_SCRIPT, AICS_MODAL_SCRIPT, aicsToastHtml } from '../worker/src/frontend/shared-ui.js';

const sidebar = renderSidebar('home');
for (const key of ['nav.home', 'nav.studios', 'nav.myWork', 'nav.history', 'nav.settings', 'nav.apiKeySettings', 'nav.logout', 'nav.studio.story', 'nav.studio.subtitle']) {
  assert.ok(sidebar.includes('data-i18n="' + key + '"'), 'sidebar translation marker: ' + key);
}
const shell = renderStudioShell({ id: 'story', nameMy: 'ဇာတ်လမ်း', content: '<p>Story body</p>' });
assert.ok(shell.includes('data-i18n-aria-label="menu.toggle"'), 'mobile menu aria label is localizable');
assert.ok(shell.includes('data-i18n-title="menu.title"'), 'mobile menu title is localizable');
const script = sidebarScript();
assert.ok(script.includes('window.AICS_APP_PREFERENCES.getLanguage()'), 'shared shell reads browser-global language preference');
assert.ok(script.includes('window.AICS_I18N.setLocale(locale)'), 'shared shell applies saved language');
assert.ok(script.includes('i18n:confirm.logout'), 'logout confirmation uses a translation key');
assert.ok(aicsToastHtml().includes('data-i18n="toast.copy.success"'), 'default toast is localizable');
assert.ok(AICS_TOAST_SCRIPT.includes("msg.indexOf('i18n:')"), 'toast resolves translation keys');
assert.ok(AICS_CONFIRM_SCRIPT.includes('confirm.proceed'), 'confirm dialog has a localized default');
assert.ok(AICS_MODAL_SCRIPT.includes('window.AICS_I18N.applyDOM(m)'), 'modal applies explicit labels when opened');
console.log('Shared Shell i18n tests passed.');
