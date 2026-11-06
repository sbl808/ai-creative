import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../worker/src/frontend/studios/short/ui.js', import.meta.url), 'utf8');
const actions = await readFile(new URL('../worker/src/frontend/studios/short/actions.js', import.meta.url), 'utf8');
const stepper = await readFile(new URL('../worker/src/frontend/studios/short/stepper.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../worker/src/frontend/studios/short/page.js', import.meta.url), 'utf8');

assert.equal(/\bonclick\s*=|\bonchange\s*=|\boninput\s*=|\bonkeypress\s*=|\bonsubmit\s*=/i.test(ui), false,
  'Short UI must not contain inline event attributes');
assert.equal(/\bstyle\s*=/i.test(ui), false,
  'Short UI must not contain inline style attributes');
assert.equal(/\bonclick\s*=|\bonchange\s*=|\boninput\s*=|\bonsubmit\s*=/i.test(actions), false,
  'Short dynamic actions must not contain inline event attributes');
assert.equal(/\bonclick\s*=|\bonchange\s*=|\boninput\s*=|\bonsubmit\s*=/i.test(stepper), false,
  'Short stepper must not contain inline event attributes');


assert.equal(/\bstyle\s*=/i.test(actions), false,
  'Short dynamic actions must not contain inline style attributes');
assert.equal(/\bstyle\s*=/i.test(page), false,
  'Short page must not contain inline style attributes');

const requiredStyleClasses = [
  'scene-image-generate-btn',
  'scene-image-loading',
  'scene-image-loading-env',
  'scene-image-loading-text',
  'scene-image-save',
  'scene-image-error',
  'scene-image-retry',
  'aics-login-overlay.is-hidden'
];
for (const className of requiredStyleClasses) {
  assert.ok(page.includes('.' + className), 'Missing CSS class: ' + className);
}
for (const className of requiredStyleClasses.slice(0, 7)) {
  assert.ok(actions.includes(className), 'Missing dynamic markup class: ' + className);
}
assert.ok(page.includes('class="aics-login-overlay is-hidden"'),
  'Login overlay must use a CSS class instead of an inline style');

const requiredActions = [
  'remove-ref-image',
  'copy-char-prompt',
  'generate-char-image',
  'copy-video-prompt',
  'copy-env-prompt',
  'generate-env-image',
  'step-nav'
];
for (const action of requiredActions) {
  assert.ok(stepper.includes("case '" + action + "'"), 'Missing delegated action: ' + action);
  assert.ok(actions.includes("data-aics-action='" + action + "'") ||
    actions.includes('data-aics-action="' + action + '"') ||
    action === 'step-nav' && stepper.includes('data-aics-action="step-nav"'),
    'Missing action markup: ' + action);
}
assert.ok(stepper.includes("document.addEventListener('click',stHandleDelegatedAction)"),
  'Short delegated click listener is not registered');


const uiActions = ["toggle-advanced","copy-short","save-short","focus-revise","go-to-video","generate-short","force-step","revise-short","generate-video-plan"];
for (const action of uiActions) {
  assert.ok(stepper.includes("case '" + action + "'") || action === 'force-step' && stepper.includes("case 'step-nav'"),
    'Missing delegated UI action: ' + action);
  assert.ok(ui.includes('data-aics-action="' + action + '"') || action === 'force-step' && ui.includes('data-aics-action="force-step"'),
    'Missing UI action markup: ' + action);
}
assert.ok(stepper.includes("document.addEventListener('input',stHandleDelegatedInput)"),
  'Short delegated input listener is not registered');
assert.ok(stepper.includes("document.addEventListener('change',stHandleDelegatedChange)"),
  'Short delegated change listener is not registered');
assert.ok(stepper.includes("document.addEventListener('keydown',stHandleDelegatedKeydown)"),
  'Short delegated keydown listener is not registered');

console.log('Short Studio inline event CSP checks passed');
