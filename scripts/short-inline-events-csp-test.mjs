import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const actions = await readFile(new URL('../worker/src/frontend/studios/short/actions.js', import.meta.url), 'utf8');
const stepper = await readFile(new URL('../worker/src/frontend/studios/short/stepper.js', import.meta.url), 'utf8');

assert.equal(/\\bonclick\\s*=|\\bonchange\\s*=|\\boninput\\s*=|\\bonsubmit\\s*=/i.test(actions), false,
  'Short dynamic actions must not contain inline event attributes');
assert.equal(/\\bonclick\\s*=|\\bonchange\\s*=|\\boninput\\s*=|\\bonsubmit\\s*=/i.test(stepper), false,
  'Short stepper must not contain inline event attributes');

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

console.log('Short Studio inline event CSP checks passed');
